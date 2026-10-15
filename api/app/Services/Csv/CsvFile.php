<?php

namespace App\Services\Csv;

use Carbon\CarbonImmutable;
use Closure;
use RuntimeException;

/**
 * Archivos CSV que el sistema escribe (tokens, respuestas, aperturas…). Son la "base
 * de datos", así que siguen las reglas del proyecto:
 * - UTF-8 con BOM y saltos CRLF, para que Excel respete acentos y la Ñ.
 * - Escritura atómica: se escribe un temporal y se renombra encima.
 * - Un candado (flock) por archivo para que dos peticiones no se pisen.
 * - Antes de sobrescribir, una copia del día en respaldos/.
 */
final class CsvFile
{
    private const BOM = "\xEF\xBB\xBF";

    /**
     * Filas como arreglos por encabezado. Un archivo que no existe es una tabla vacía.
     *
     * @return list<array<string, string>>
     */
    public function read(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("No se pudo abrir {$path}");
        }

        $rows = [];
        $headers = null;
        try {
            while (($cells = fgetcsv($handle, null, ',', '"', '')) !== false) {
                if ($cells === [null] || implode('', $cells) === '') {
                    continue;
                }
                if ($headers === null) {
                    $cells[0] = str_starts_with((string) $cells[0], self::BOM) ? substr($cells[0], 3) : $cells[0];
                    $headers = array_map(fn ($h) => trim((string) $h), $cells);

                    continue;
                }
                $row = [];
                foreach ($headers as $i => $header) {
                    $row[$header] = trim((string) ($cells[$i] ?? ''));
                }
                $rows[] = $row;
            }
        } finally {
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Reemplaza el archivo completo de forma atómica (temporal + rename).
     *
     * @param  list<string>  $headers
     * @param  iterable<array<string, scalar|null>>  $rows
     */
    public function write(string $path, array $headers, iterable $rows): void
    {
        $tmp = dirname($path).'/.'.basename($path).'.'.bin2hex(random_bytes(4)).'.tmp';
        $handle = fopen($tmp, 'wb');
        if ($handle === false) {
            throw new RuntimeException("No se pudo escribir en {$tmp}");
        }

        try {
            fwrite($handle, self::BOM);
            $this->put($handle, $headers);
            foreach ($rows as $row) {
                $this->put($handle, array_map(fn ($h) => $row[$h] ?? '', $headers));
            }
            fflush($handle);
        } finally {
            fclose($handle);
        }

        if (! rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException("No se pudo reemplazar {$path}");
        }
    }

    /**
     * Agrega un renglón al final (bitácoras: historial, aperturas). Crea el archivo con
     * sus encabezados si no existe. Si la bitácora ganó una columna (p. ej. quién hizo el
     * cambio), primero se reescribe con la columna nueva: los renglones de antes la dejan
     * vacía y el renglón nuevo cae en su lugar.
     *
     * @param  list<string>  $headers
     * @param  array<string, scalar|null>  $row
     */
    public function append(string $path, array $headers, array $row): void
    {
        $this->locked($path, function () use ($path, $headers, $row) {
            $isNew = ! is_file($path) || filesize($path) === 0;
            if (! $isNew) {
                $current = $this->headers($path);
                $missing = array_values(array_diff($headers, $current));
                if ($missing !== []) {
                    $this->write($path, [...$current, ...$missing], $this->read($path));
                }
                $headers = [...$current, ...$missing];
            }
            $handle = fopen($path, 'ab');
            if ($handle === false) {
                throw new RuntimeException("No se pudo escribir en {$path}");
            }
            try {
                if ($isNew) {
                    fwrite($handle, self::BOM);
                    $this->put($handle, $headers);
                }
                $this->put($handle, array_map(fn ($h) => $row[$h] ?? '', $headers));
                fflush($handle);
            } finally {
                fclose($handle);
            }
        });
    }

    /**
     * Corre $fn con el candado exclusivo del archivo. El candado vive en un archivo
     * aparte (.<nombre>.lock) porque el rename de write() cambia el archivo de datos.
     *
     * @template T
     *
     * @param  Closure(): T  $fn
     * @return T
     */
    public function locked(string $path, Closure $fn): mixed
    {
        $lock = fopen(dirname($path).'/.'.basename($path).'.lock', 'cb');
        if ($lock === false || ! flock($lock, LOCK_EX)) {
            throw new RuntimeException("No se pudo bloquear {$path}");
        }

        try {
            return $fn();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** Copia del día en respaldos/<nombre>-AAAA-MM-DD.csv (solo la primera vez que se escribe ese día). */
    public function backupDaily(string $path, CarbonImmutable $now): void
    {
        if (! is_file($path)) {
            return;
        }
        $dir = dirname($path).'/respaldos';
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException("No se pudo crear {$dir}");
        }
        $target = $dir.'/'.pathinfo($path, PATHINFO_FILENAME).'-'.$now->format('Y-m-d').'.csv';
        if (! is_file($target)) {
            copy($path, $target);
        }
    }

    /**
     * Texto escrito por un invitado → seguro para abrir en Excel. Un valor que empieza con
     * = + - @ se ejecutaría como fórmula (inyección CSV); se le antepone un apóstrofo.
     */
    public static function safe(string $value): string
    {
        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }

    /** Inverso de safe() al leer: quita el apóstrofo que se agregó. */
    public static function unsafe(string $value): string
    {
        return preg_match("/^'[=+\\-@\t\r]/", $value) ? substr($value, 1) : $value;
    }

    /** @return list<string> los encabezados del archivo (sin el BOM) */
    private function headers(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("No se pudo abrir {$path}");
        }
        try {
            $cells = fgetcsv($handle, null, ',', '"', '') ?: [];
        } finally {
            fclose($handle);
        }
        if (isset($cells[0])) {
            $cells[0] = str_starts_with((string) $cells[0], self::BOM) ? substr($cells[0], 3) : $cells[0];
        }

        return array_values(array_filter(array_map(fn ($h) => trim((string) $h), $cells), fn ($h) => $h !== ''));
    }

    /**
     * @param  resource  $handle
     * @param  list<scalar|null>  $cells
     */
    private function put($handle, array $cells): void
    {
        fputcsv($handle, array_map(fn ($c) => (string) $c, $cells), ',', '"', '', "\r\n");
    }
}
