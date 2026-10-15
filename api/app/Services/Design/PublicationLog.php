<?php

namespace App\Services\Design;

use App\Services\Csv\CsvFile;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;

/**
 * Bitácora de lo que cambia la invitación publicada: respaldos/publicaciones.csv, un
 * renglón por publicación (o por invitación creada o migrada) con quién lo hizo. Con ella
 * el historial dice quién publicó cada versión.
 *
 * Quien hace el cambio: una persona del gestor, o "terminal" (comandos de artisan).
 */
final class PublicationLog
{
    public const FILE = 'publicaciones.csv';

    public const HEADERS = ['fecha', 'origen', 'secciones', 'usuario', 'nombre'];

    /** @var array{usuario: string, nombre: string} */
    public const TERMINAL = ['usuario' => 'terminal', 'nombre' => 'Terminal'];

    public function __construct(private readonly CsvFile $csv) {}

    /** @param  array{usuario: string, nombre: string}|null  $by */
    public function add(string $dir, CarbonImmutable $now, string $origin, int $sections, ?array $by): void
    {
        $backups = $dir.'/respaldos';
        if (! is_dir($backups) && ! mkdir($backups, 0775, true) && ! is_dir($backups)) {
            return;
        }
        $this->csv->append($backups.'/'.self::FILE, self::HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'origen' => $origin,
            'secciones' => $sections,
            'usuario' => $by['usuario'] ?? '',
            'nombre' => CsvFile::safe($by['nombre'] ?? ''),
        ]);
    }

    /**
     * La bitácora, de la más vieja a la más reciente.
     *
     * @return list<array{at: CarbonImmutable, origin: string, by: array{username: string, name: string}|null}>
     */
    public function entries(string $dir): array
    {
        $out = [];
        foreach ($this->csv->read($dir.'/respaldos/'.self::FILE) as $row) {
            $at = self::date($row['fecha'] ?? '');
            if ($at === null) {
                continue;
            }
            $username = $row['usuario'] ?? '';
            $out[] = [
                'at' => $at,
                'origin' => $row['origen'] ?? '',
                'by' => $username === '' ? null : ['username' => $username, 'name' => CsvFile::unsafe($row['nombre'] ?? '') ?: $username],
            ];
        }
        usort($out, fn ($a, $b) => $a['at'] <=> $b['at']);

        return $out;
    }

    /**
     * La última publicación (la versión que ven los invitados), o null si no hay registro.
     *
     * @return array{published_at: string, origin: string, by: array{username: string, name: string}|null}|null
     */
    public function last(string $dir): ?array
    {
        $entries = $this->entries($dir);

        return $entries === [] ? null : self::present(end($entries));
    }

    /**
     * Quién publicó la versión que estuvo vigente hasta $replacedAt (la que se guardó en el
     * historial al publicar la siguiente): el último renglón antes de ese momento.
     *
     * @param  list<array{at: CarbonImmutable, origin: string, by: array{username: string, name: string}|null}>  $entries
     * @return array{published_at: string, origin: string, by: array{username: string, name: string}|null}|null
     */
    public static function before(array $entries, CarbonImmutable $replacedAt): ?array
    {
        $found = null;
        foreach ($entries as $entry) {
            if ($entry['at'] < $replacedAt) {
                $found = $entry;
            }
        }

        return $found === null ? null : self::present($found);
    }

    /** "AAAA-MM-DD HH:MM:SS" → fecha, o null si el renglón trae otra cosa. */
    public static function date(string $value): ?CarbonImmutable
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value)) {
            return null;
        }
        try {
            return CarbonImmutable::createFromFormat('Y-m-d H:i:s', $value) ?: null;
        } catch (InvalidFormatException) {
            return null;
        }
    }

    /**
     * @param  array{at: CarbonImmutable, origin: string, by: array{username: string, name: string}|null}  $entry
     * @return array{published_at: string, origin: string, by: array{username: string, name: string}|null}
     */
    private static function present(array $entry): array
    {
        return ['published_at' => $entry['at']->toIso8601String(), 'origin' => $entry['origin'], 'by' => $entry['by']];
    }
}
