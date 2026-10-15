<?php

namespace App\Services\Quotes;

use App\Services\Csv\CsvFile;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;

/**
 * Las cotizaciones que llegan desde la landing: eventos/_gestor/cotizaciones.csv (en el
 * disco de los eventos, fuera de git). Cada una con el teléfono para escribirle, qué evento
 * es y su idea. Quien administra el gestor les cambia el estado y les deja una nota; si la
 * persona lo pide (derechos ARCO), se borra de verdad.
 */
final class QuoteStore
{
    public const FILE = 'cotizaciones.csv';

    public const HEADERS = ['id', 'fecha', 'nombre', 'telefono', 'tipo', 'fecha_evento', 'idea', 'pagina', 'estado', 'nota', 'atendio', 'actualizada'];

    public const TYPES = ['boda', 'xv', 'graduacion', 'otro'];

    public const STATES = ['nueva', 'contactada', 'cotizada', 'cerrada', 'descartada'];

    public const MAX_IDEA = 600;

    public const MAX_NOTE = 600;

    public function __construct(private readonly CsvFile $csv) {}

    public function path(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/').'/'.ManagerUsers::DIR.'/'.self::FILE;
    }

    /**
     * "55 1234 5678", "+52 1 55 1234 5678" o "5215512345678" → "+525512345678". Un número de
     * otro país se acepta con su "+" (8 a 15 dígitos). null si no es un teléfono.
     */
    public static function normalizePhone(string $phone): ?string
    {
        $phone = trim($phone);
        $international = str_starts_with($phone, '+') || str_starts_with($phone, '00');
        $digits = (string) preg_replace('/\D+/', '', $phone);
        if (str_starts_with($phone, '00')) {
            $digits = substr($digits, 2);
        }

        // México: 10 dígitos, con o sin 52 (y el 1 que antes se marcaba para celulares).
        if (strlen($digits) === 10 && ! $international) {
            return '+52'.$digits;
        }
        if (preg_match('/^521?(\d{10})$/', $digits, $m)) {
            return '+52'.$m[1];
        }
        if ($international && preg_match('/^[1-9]\d{7,14}$/', $digits)) {
            return '+'.$digits;
        }

        return null;
    }

    /**
     * @param  array{nombre: string, telefono: string, tipo: string, fecha_evento: string, idea: string, pagina: string}  $data
     * @return array<string, string> la cotización guardada
     */
    public function add(array $data, CarbonImmutable $now): array
    {
        $path = $this->path();
        $this->ensureDir($path);

        return $this->csv->locked($path, function () use ($path, $data, $now) {
            $rows = $this->csv->read($path);
            $id = (string) (max([0, ...array_map(fn ($r) => (int) ($r['id'] ?? 0), $rows)]) + 1);
            $row = [
                'id' => $id,
                'fecha' => $now->format('Y-m-d H:i:s'),
                'nombre' => CsvFile::safe($data['nombre']),
                'telefono' => $data['telefono'],
                'tipo' => $data['tipo'],
                'fecha_evento' => $data['fecha_evento'],
                'idea' => CsvFile::safe($data['idea']),
                'pagina' => CsvFile::safe($data['pagina']),
                'estado' => 'nueva',
                'nota' => '',
                'atendio' => '',
                'actualizada' => '',
            ];
            $rows[] = $row;

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);

            return $this->read($row);
        });
    }

    /** @return list<array<string, string>> la más reciente primero */
    public function all(): array
    {
        $rows = array_map($this->read(...), array_filter($this->csv->read($this->path()), fn ($r) => ($r['id'] ?? '') !== ''));

        return array_reverse(array_values($rows));
    }

    /**
     * Cambia el estado y la nota; anota quién y cuándo.
     *
     * @param  array{estado?: string, nota?: string}  $changes
     * @return array<string, string>|null null si no existe
     */
    public function update(string $id, array $changes, string $by, CarbonImmutable $now): ?array
    {
        $path = $this->path();

        return $this->csv->locked($path, function () use ($path, $id, $changes, $by, $now) {
            $rows = $this->csv->read($path);
            foreach ($rows as $i => $row) {
                if (($row['id'] ?? '') !== $id) {
                    continue;
                }
                if (isset($changes['estado'])) {
                    $rows[$i]['estado'] = $changes['estado'];
                }
                if (array_key_exists('nota', $changes)) {
                    $rows[$i]['nota'] = CsvFile::safe($changes['nota']);
                }
                $rows[$i]['atendio'] = $by;
                $rows[$i]['actualizada'] = $now->format('Y-m-d H:i:s');

                $this->csv->backupDaily($path, $now);
                $this->csv->write($path, self::HEADERS, $rows);

                return $this->read($rows[$i]);
            }

            return null;
        });
    }

    /** La borra del archivo (la persona pidió que se borren sus datos). false si no existe. */
    public function delete(string $id, CarbonImmutable $now): bool
    {
        $path = $this->path();

        return $this->csv->locked($path, function () use ($path, $id, $now) {
            $rows = $this->csv->read($path);
            $keep = array_values(array_filter($rows, fn ($r) => ($r['id'] ?? '') !== $id));
            if (count($keep) === count($rows)) {
                return false;
            }
            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $keep);

            return true;
        });
    }

    /** Cuántas siguen sin atender (para el contador del gestor). */
    public function newCount(): int
    {
        return count(array_filter($this->csv->read($this->path()), fn ($r) => ($r['estado'] ?? '') === 'nueva'));
    }

    /**
     * @param  array<string, string>  $row
     * @return array<string, string>
     */
    private function read(array $row): array
    {
        foreach (['nombre', 'idea', 'pagina', 'nota'] as $key) {
            $row[$key] = CsvFile::unsafe($row[$key] ?? '');
        }

        return array_map(fn ($v) => (string) $v, $row + array_fill_keys(self::HEADERS, ''));
    }

    private function ensureDir(string $path): void
    {
        $dir = dirname($path);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
    }
}
