<?php

namespace App\Services\Design;

use App\Services\Csv\CsvFile;
use App\Services\Layout\LayoutReader;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use RuntimeException;

/**
 * invitacion.csv (y su versión .xlsx) ⇄ Design.
 *
 * Lee lo que escribe el sistema y también lo que guarda Excel: con o sin BOM, en UTF-8 o
 * en Windows-1252 (el "CSV" normal de Excel) y separado con coma o con punto y coma.
 * Escribe siempre igual: UTF-8 con BOM, CRLF, atómico (CsvFile) y con las fórmulas
 * neutralizadas.
 */
final class DesignFile
{
    public const FILE = 'invitacion.csv';

    /** Hoja con la invitación dentro del .xlsx; la hoja "guia" es solo de ayuda. */
    public const SHEET = 'invitacion';

    public function __construct(
        private readonly CsvFile $csv,
        private readonly DesignCodec $codec,
    ) {}

    /**
     * @return array{0: Design, 1: list<string>} el diseño y los avisos
     *
     * @throws RuntimeException si el archivo no se puede leer o no tiene las columnas
     */
    public function read(string $path): array
    {
        $bytes = @file_get_contents($path);
        if ($bytes === false) {
            throw new RuntimeException('No se pudo leer '.basename($path));
        }

        return $this->parseCsv($bytes);
    }

    /**
     * @return array{0: Design, 1: list<string>}
     *
     * @throws RuntimeException sin las columnas seccion, campo y valor
     */
    public function parseCsv(string $bytes): array
    {
        if (str_starts_with($bytes, "\xEF\xBB\xBF")) {
            $bytes = substr($bytes, 3);
        } elseif (! mb_check_encoding($bytes, 'UTF-8')) {
            // El "CSV (delimitado por comas)" de Excel en Windows/Mac viene en Windows-1252.
            $bytes = mb_convert_encoding($bytes, 'UTF-8', 'Windows-1252');
        }

        $firstLine = strtok($bytes, "\n") ?: '';
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

        $stream = fopen('php://temp', 'r+b');
        fwrite($stream, $bytes);
        rewind($stream);

        $rows = [];
        $headers = null;
        $line = 0;
        try {
            while (($cells = fgetcsv($stream, null, $delimiter, '"', '')) !== false) {
                $line++;
                if ($cells === [null] || implode('', array_map('strval', $cells)) === '') {
                    continue;
                }
                if ($headers === null) {
                    $headers = array_map(fn ($h) => LayoutReader::key((string) $h), $cells);
                    $this->checkHeaders($headers);

                    continue;
                }
                $rows[] = $this->record($headers, $cells, $line);
            }
        } finally {
            fclose($stream);
        }

        if ($headers === null) {
            throw new RuntimeException('El archivo está vacío.');
        }

        return $this->decode($rows);
    }

    /**
     * Un .xlsx con la hoja "invitacion" (o, si no la tiene, la primera hoja).
     *
     * @return array{0: Design, 1: list<string>}
     */
    public function readXlsx(string $path): array
    {
        $reader = new XlsxReader;
        $reader->open($path);
        $rows = null;
        $first = null;
        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                $name = LayoutReader::key($sheet->getName());
                if ($name !== self::SHEET && $first !== null) {
                    continue;
                }
                $read = $this->xlsxRows($sheet->getRowIterator());
                if ($name === self::SHEET) {
                    $rows = $read;
                    break;
                }
                $first ??= $read;
            }
        } finally {
            $reader->close();
        }

        return $this->decode($rows ?? $first ?? []);
    }

    /** ¿Es un Excel del formato anterior (pestañas evento, secciones…)? */
    public static function isLegacyWorkbook(string $path): bool
    {
        $reader = new XlsxReader;
        $reader->open($path);
        $names = [];
        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                $names[] = LayoutReader::key($sheet->getName());
            }
        } finally {
            $reader->close();
        }

        return ! in_array(self::SHEET, $names, true) && in_array('evento', $names, true);
    }

    /** Guarda invitacion.csv de forma atómica (temporal + rename); devuelve lo que escribió. */
    public function write(string $path, Design $design): string
    {
        $dir = dirname($path);
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException("No se pudo crear {$dir}");
        }
        $bytes = $this->toCsv($design);
        $this->csv->replace($path, $bytes);

        return $bytes;
    }

    /** El mismo contenido que write(), como texto (para descargar). */
    public function toCsv(Design $design): string
    {
        $stream = fopen('php://temp', 'r+b');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, DesignCodec::HEADERS, ',', '"', '', "\r\n");
        foreach ($this->safeRows($design) as $row) {
            fputcsv($stream, array_values($row), ',', '"', '', "\r\n");
        }
        rewind($stream);
        $out = (string) stream_get_contents($stream);
        fclose($stream);

        return $out;
    }

    /** Hash del contenido: cambia con cualquier cambio de la invitación. */
    public function hash(Design $design): string
    {
        return hash('xxh128', $this->toCsv($design));
    }

    /**
     * El .xlsx para editar en Excel: la hoja "invitacion" (lo que se importa) y la hoja
     * "guia" (qué va en cada campo; no se lee al importar).
     */
    public function writeXlsx(string $path, Design $design): void
    {
        $header = (new Style)->setFontBold()->setBackgroundColor('E2C77A')->setFontColor('523C0B');
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        try {
            $sheet = $writer->getCurrentSheet();
            $sheet->setName(self::SHEET);
            foreach ([16, 10, 22, 70] as $i => $width) {
                $sheet->setColumnWidth($width, $i + 1);
            }
            $writer->addRow(Row::fromValues(DesignCodec::HEADERS, $header));
            foreach ($this->safeRows($design) as $row) {
                $writer->addRow(Row::fromValues(array_values($row)));
            }

            $guide = $writer->addNewSheetAndMakeItCurrent();
            $guide->setName('guia');
            foreach ([18, 24, 60] as $i => $width) {
                $guide->setColumnWidth($width, $i + 1);
            }
            $writer->addRow(Row::fromValues(['seccion', 'campo', 'qué es'], $header));
            foreach ($this->guide() as $line) {
                $writer->addRow(Row::fromValues($line));
            }
        } finally {
            $writer->close();
        }
    }

    /**
     * @param  list<string>  $headers
     */
    private function checkHeaders(array $headers): void
    {
        foreach (['seccion', 'campo', 'valor'] as $required) {
            if (! in_array($required, $headers, true)) {
                throw new RuntimeException('El archivo no es una invitación: faltan las columnas seccion, elemento, campo y valor.');
            }
        }
    }

    /**
     * @param  list<string>  $headers
     * @param  list<string|null>  $cells
     * @return array<string, string>
     */
    private function record(array $headers, array $cells, int $line): array
    {
        $record = ['_fila' => (string) $line];
        foreach ($headers as $i => $header) {
            if ($header !== '') {
                $record[$header] = CsvFile::unsafe((string) ($cells[$i] ?? ''));
            }
        }

        return $record;
    }

    /**
     * @param  iterable<Row>  $rows
     * @return list<array<string, string>>
     */
    private function xlsxRows(iterable $rows): array
    {
        $headers = null;
        $out = [];
        $line = 0;
        foreach ($rows as $row) {
            $line++;
            $cells = array_map(LayoutReader::cell(...), $row->toArray());
            if (implode('', $cells) === '') {
                continue;
            }
            if ($headers === null) {
                $headers = array_map(LayoutReader::key(...), $cells);
                $this->checkHeaders($headers);

                continue;
            }
            $out[] = $this->record($headers, $cells, $line);
        }

        return $out;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array{0: Design, 1: list<string>}
     */
    private function decode(array $rows): array
    {
        return $this->codec->fromRows($rows);
    }

    /**
     * Filas listas para guardar: un valor que empieza con = + - @ se volvería fórmula en
     * Excel; se le antepone un apóstrofo (CsvFile::unsafe lo quita al leer).
     *
     * @return list<array<string, string>>
     */
    private function safeRows(Design $design): array
    {
        // Dentro de una celda el salto de línea va como "\n" (así lo escribe Excel con Alt+Enter).
        return array_map(function (array $row) {
            $row['valor'] = CsvFile::safe($row['valor']);

            return $row;
        }, $this->codec->toRows($design));
    }

    /**
     * Qué va en cada campo, para la hoja "guia".
     *
     * @return list<list<string>>
     */
    private function guide(): array
    {
        $catalog = Catalog::toArray();
        $lines = [];
        foreach ($catalog['event_groups'] as $group) {
            foreach ($group['fields'] as $field) {
                if (! ($field['hidden'] ?? false)) {
                    $lines[] = ['evento', $field['key'], $group['label'].': '.$field['label'].(isset($field['help']) ? '. '.$field['help'] : '')];
                }
            }
        }
        foreach ($catalog['colors'] as $color) {
            $lines[] = ['colores', $color['key'], $color['label'].': '.$color['help'].' Hex (#RRGGBB).'];
        }
        foreach ($catalog['fonts'] as $font) {
            $lines[] = ['fuentes', $font['key'], $font['label'].': '.$font['help'].' Una fuente de Google Fonts.'];
        }
        $lines[] = ['textos', '<bloque>_fuente|_color|_tamano', 'Letra, color y tamaño (50 a 250 %) de todos los títulos, subtítulos, textos y botones.'];
        foreach ($catalog['page'] as $field) {
            $lines[] = ['pagina', $field['key'], $field['label']];
        }
        foreach ($catalog['sections'] as $section) {
            $fields = array_map(fn ($f) => $f['key'], $section['fields']);
            $lines[] = [$section['id'], implode(', ', $fields) ?: '—', $section['label'].': '.$section['description']];
            if ($section['list'] !== null) {
                $items = array_map(fn ($f) => $f['key'], $section['list']['fields']);
                $lines[] = [$section['id'], 'elemento 1, 2…: '.implode(', ', $items), $section['list']['label']];
            }
            if ($section['slots'] !== []) {
                $lines[] = [$section['id'], 'imagen_'.implode(', imagen_', array_column($section['slots'], 'key')), 'Cambia un adorno del tema (un archivo de media/); "ninguna" lo quita.'];
            }
            $lines[] = [$section['id'], implode(', ', array_column($section['texts'], 'key')), 'Bloques de texto: <bloque>_fuente, <bloque>_color y <bloque>_tamano.'];
        }
        $lines[] = ['(todas)', 'visible, fondo, fondo_ajuste, color_fondo, overlay, fijo, efectos, escritorio, color_<color>', 'Diseño de la sección. efectos: '.implode(', ', array_column($catalog['effects'], 'key')).' (o ninguno).'];

        return $lines;
    }
}
