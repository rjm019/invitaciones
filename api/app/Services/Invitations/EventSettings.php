<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use Carbon\CarbonImmutable;

/**
 * eventos/<slug>/ajustes.csv: lo que cambia al instante, sin tocar la invitación ni pasar
 * por "Publicar": la fecha límite que mueve el dueño desde su panel, y lo que pone el
 * gestor (la clave del panel del cliente, si la invitación se ve y si es plantilla).
 * ajustes-historial.csv guarda cada cambio y quién lo hizo (de la clave, nunca su valor).
 */
final class EventSettings
{
    public const FILE = 'ajustes.csv';

    public const HISTORY = 'ajustes-historial.csv';

    public const MAX_DEADLINE_CHANGES = 3;

    public const HISTORY_HEADERS = ['fecha', 'clave', 'anterior', 'nuevo', 'usuario', 'nombre'];

    /** @var array{usuario: string, nombre: string} el dueño, desde su panel */
    public const OWNER = ['usuario' => 'panel', 'nombre' => 'Cliente (panel)'];

    /** Lo que el gestor cambia desde su panel (además de la fecha límite del dueño). */
    public const MANAGED = ['clave_panel', 'publicado', 'plantilla'];

    /** En el historial, estos valores no se escriben. */
    private const SECRET = ['clave_panel'];

    public function __construct(private readonly CsvFile $csv) {}

    /**
     * @return array<string, string> clave → valor
     */
    public function read(string $dir): array
    {
        $out = [];
        foreach ($this->csv->read($dir.'/'.self::FILE) as $row) {
            if (($row['clave'] ?? '') !== '') {
                $out[$row['clave']] = $row['valor'] ?? '';
            }
        }

        return $out;
    }

    public function deadlineChanges(string $dir): int
    {
        return (int) ($this->read($dir)['rsvp_limite_cambios'] ?? 0);
    }

    /**
     * Guarda la nueva fecha límite que pone el dueño y cuenta el cambio.
     *
     * @return int cambios usados
     *
     * @throws RsvpException 409 si ya se usaron los 3 cambios
     */
    public function changeDeadline(string $dir, string $date, ?string $previous, CarbonImmutable $now): int
    {
        $path = $dir.'/'.self::FILE;

        return $this->csv->locked($path, function () use ($dir, $path, $date, $previous, $now) {
            $settings = $this->read($dir);
            $used = (int) ($settings['rsvp_limite_cambios'] ?? 0);
            if ($used >= self::MAX_DEADLINE_CHANGES) {
                throw new RsvpException('Ya usaste los '.self::MAX_DEADLINE_CHANGES.' cambios de fecha límite.', 409);
            }

            $settings['rsvp_limite'] = $date;
            $settings['rsvp_limite_cambios'] = (string) ($used + 1);
            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, ['clave', 'valor'], array_map(
                fn ($k, $v) => ['clave' => $k, 'valor' => $v],
                array_keys($settings),
                $settings,
            ));
            $this->csv->append($dir.'/'.self::HISTORY, self::HISTORY_HEADERS, [
                'fecha' => $now->format('Y-m-d H:i:s'),
                'clave' => 'rsvp_limite',
                'anterior' => (string) $previous,
                'nuevo' => $date,
                ...self::OWNER,
            ]);

            return $used + 1;
        });
    }

    /**
     * Cambia (o con null, quita) varios ajustes de una vez y anota cada cambio en el
     * historial. La clave del panel se anota como "(cambiada)", nunca su valor.
     *
     * @param  array<string, string|null>  $changes
     * @param  array{usuario: string, nombre: string}|null  $by  quién lo cambia (una persona del gestor o la terminal)
     */
    public function put(string $dir, array $changes, CarbonImmutable $now, ?array $by = null): void
    {
        $path = $dir.'/'.self::FILE;

        $this->csv->locked($path, function () use ($dir, $path, $changes, $now, $by) {
            $settings = $this->read($dir);
            $log = [];
            foreach ($changes as $key => $value) {
                $before = $settings[$key] ?? null;
                if ($value === null || $value === '') {
                    unset($settings[$key]);
                } else {
                    $settings[$key] = $value;
                }
                $after = $settings[$key] ?? null;
                if ($before !== $after) {
                    $secret = in_array($key, self::SECRET, true);
                    $log[] = [
                        'fecha' => $now->format('Y-m-d H:i:s'),
                        'clave' => $key,
                        'anterior' => $secret ? ($before === null ? '' : '(oculta)') : (string) $before,
                        'nuevo' => $secret ? ($after === null ? '(quitada)' : '(cambiada)') : (string) $after,
                        'usuario' => $by['usuario'] ?? '',
                        'nombre' => CsvFile::safe($by['nombre'] ?? ''),
                    ];
                }
            }
            if ($log === []) {
                return;
            }

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, ['clave', 'valor'], array_map(
                fn ($k, $v) => ['clave' => $k, 'valor' => $v],
                array_keys($settings),
                $settings,
            ));
            foreach ($log as $row) {
                $this->csv->append($dir.'/'.self::HISTORY, self::HISTORY_HEADERS, $row);
            }
        });
    }
}
