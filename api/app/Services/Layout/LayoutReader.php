<?php

namespace App\Services\Layout;

use DateInterval;
use DateTimeInterface;
use Illuminate\Support\Str;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Lee el layout de un evento: layout.xlsx (una pestaña por tema) o, si no existe,
 * un CSV por pestaña en la misma carpeta. Devuelve cada pestaña como filas con
 * encabezados normalizados ("Zona horaria" → "zona_horaria").
 */
final class LayoutReader
{
    public const XLSX = 'layout.xlsx';

    /**
     * CSV que no son pestañas del layout: los que escribe el sistema (con datos de los
     * invitados) y la invitación en el formato nuevo (invitacion.csv).
     */
    public const GENERATED = [
        'invitaciones', 'respuestas', 'respuestas_historial', 'aperturas', 'dedicatorias',
        'ajustes', 'ajustes_historial', 'resumen', 'tokens', 'links', 'invitacion',
    ];

    /**
     * @return array<string, list<array<string, string>>>
     */
    public function read(string $dir): array
    {
        $xlsx = $dir.'/'.self::XLSX;

        return is_file($xlsx) ? $this->readXlsx($xlsx) : $this->readCsvDir($dir);
    }

    /**
     * @return array<string, list<array<string, string>>>
     */
    private function readXlsx(string $path): array
    {
        $reader = new XlsxReader;
        $reader->open($path);
        $sheets = [];

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                $sheets[self::key($sheet->getName())] = $this->rows($sheet->getRowIterator());
            }
        } finally {
            $reader->close();
        }

        return $sheets;
    }

    /**
     * @return array<string, list<array<string, string>>>
     */
    private function readCsvDir(string $dir): array
    {
        $sheets = [];

        foreach (glob($dir.'/*.csv') ?: [] as $file) {
            $name = self::key(basename($file, '.csv'));
            if (in_array($name, self::GENERATED, true)) {
                continue;
            }

            $reader = new CsvReader;
            $reader->open($file);
            try {
                foreach ($reader->getSheetIterator() as $sheet) {
                    $sheets[$name] = $this->rows($sheet->getRowIterator());
                }
            } finally {
                $reader->close();
            }
        }

        return $sheets;
    }

    /**
     * La primera fila con contenido son los encabezados; las filas vacías se ignoran.
     *
     * @param  iterable<Row>  $rows
     * @return list<array<string, string>>
     */
    private function rows(iterable $rows): array
    {
        $headers = null;
        $out = [];

        foreach ($rows as $row) {
            $cells = array_map(self::cell(...), $row->toArray());
            if (implode('', $cells) === '') {
                continue;
            }

            if ($headers === null) {
                $headers = array_map(self::key(...), $cells);

                continue;
            }

            $record = [];
            foreach ($headers as $i => $header) {
                if ($header !== '') {
                    $record[$header] = $cells[$i] ?? '';
                }
            }
            $out[] = $record;
        }

        return $out;
    }

    /** "Zona horaria" → "zona_horaria"; "Teléfono" → "telefono". */
    public static function key(string $text): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', '_', Str::lower(Str::ascii(trim($text)))), '_');
    }

    /**
     * Excel guarda fechas y horas como números con formato; OpenSpout los entrega como
     * objetos. Se convierten al texto que escribiría una persona en el CSV.
     */
    public static function cell(mixed $value): string
    {
        return match (true) {
            $value instanceof DateTimeInterface => match (true) {
                (int) $value->format('Y') < 1905 => $value->format('H:i'), // solo hora
                $value->format('H:i:s') === '00:00:00' => $value->format('Y-m-d'),
                default => $value->format('Y-m-d\TH:i:s'),
            },
            $value instanceof DateInterval => sprintf('%02d:%02d', $value->h + $value->d * 24, $value->i),
            is_bool($value) => $value ? 'SI' : '',
            $value === null => '',
            default => trim((string) $value),
        };
    }
}
