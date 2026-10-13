<?php

namespace App\Console\Commands;

use App\Services\Layout\LayoutReader;
use Illuminate\Console\Command;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Arma eventos/<slug>/layout.xlsx a partir de un CSV por pestaña. Sirve para crear el
 * Excel de un evento nuevo o para convertir un layout que se editó como CSV.
 * Nunca pisa un layout.xlsx existente sin --forzar, y aun así lo respalda primero.
 */
class BuildLayoutXlsx extends Command
{
    protected $signature = 'layout:xlsx
        {slug : Carpeta del evento en eventos/}
        {--desde= : Subcarpeta con los CSV (por defecto, la carpeta del evento)}
        {--forzar : Reemplaza layout.xlsx si ya existe (se respalda antes)}';

    protected $description = 'Arma layout.xlsx (una pestaña por CSV) para editar el evento en Excel';

    /** Orden de las pestañas en el libro; las demás van al final en orden alfabético. */
    private const ORDER = ['evento', 'paleta', 'tipografia', 'secciones', 'familia', 'itinerario', 'ubicaciones', 'familias'];

    /** Columnas que en Excel conviene guardar como número. */
    private const NUMERIC = ['orden', 'id', 'pases', 'mesa', 'overlay'];

    public function handle(): int
    {
        $root = rtrim((string) config('invitaciones.eventos_path'), '/');
        $slug = (string) $this->argument('slug');
        $dir = $root.'/'.$slug;
        $from = $this->option('desde') ? $dir.'/'.trim((string) $this->option('desde'), '/') : $dir;
        $target = $dir.'/'.LayoutReader::XLSX;

        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,59}$/', $slug) || ! is_dir($from)) {
            $this->error("No existe la carpeta {$from}");

            return self::FAILURE;
        }

        if (is_file($target)) {
            if (! $this->option('forzar')) {
                $this->error('Ya existe layout.xlsx. Usa --forzar para reemplazarlo (se respalda antes).');

                return self::FAILURE;
            }
            @mkdir($dir.'/respaldos', 0775, true);
            copy($target, $dir.'/respaldos/layout-'.date('Ymd-His').'.xlsx');
        }

        $files = [];
        foreach (glob($from.'/*.csv') ?: [] as $file) {
            $files[LayoutReader::key(basename($file, '.csv'))] = $file;
        }
        unset($files['respuestas'], $files['tokens'], $files['links']);
        if ($files === []) {
            $this->error("No hay CSV en {$from}");

            return self::FAILURE;
        }
        uksort($files, function ($a, $b) {
            $ia = array_search($a, self::ORDER, true);
            $ib = array_search($b, self::ORDER, true);

            return ($ia === false ? 99 : $ia) <=> ($ib === false ? 99 : $ib) ?: strcmp($a, $b);
        });

        $header = (new Style)->setFontBold()->setBackgroundColor('E2C77A')->setFontColor('523C0B');
        $writer = new Writer;
        $writer->openToFile($target);
        $first = true;

        foreach ($files as $name => $file) {
            $sheet = $first ? $writer->getCurrentSheet() : $writer->addNewSheetAndMakeItCurrent();
            $first = false;
            $sheet->setName($name);

            $rows = $this->readCsv($file);
            $headers = array_map(LayoutReader::key(...), $rows[0] ?? []);
            foreach ($headers as $i => $h) {
                $sheet->setColumnWidth(in_array($h, ['texto', 'valor', 'uso', 'subtitulo'], true) ? 60 : 18, $i + 1);
            }

            foreach ($rows as $r => $values) {
                if ($r === 0) {
                    $writer->addRow(Row::fromValues($values, $header));

                    continue;
                }
                $typed = [];
                foreach ($values as $i => $v) {
                    $typed[] = in_array($headers[$i] ?? '', self::NUMERIC, true) && is_numeric($v) ? $v + 0 : $v;
                }
                $writer->addRow(Row::fromValues($typed));
            }
            $this->line("  pestaña {$name}: ".max(0, count($rows) - 1).' filas');
        }

        $writer->close();
        $this->info("Listo: {$target}");

        return self::SUCCESS;
    }

    /**
     * @return list<list<string>>
     */
    private function readCsv(string $file): array
    {
        $reader = new CsvReader;
        $reader->open($file);
        $rows = [];
        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $row) {
                    $rows[] = array_map(fn ($v) => trim((string) $v), $row->toArray());
                }
            }
        } finally {
            $reader->close();
        }

        return $rows;
    }
}
