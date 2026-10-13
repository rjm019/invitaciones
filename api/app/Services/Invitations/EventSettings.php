<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use Carbon\CarbonImmutable;

/**
 * eventos/<slug>/ajustes.csv: lo que el dueño cambia desde el panel sin tocar su Excel
 * (por ahora, la fecha límite de confirmación). ajustes-historial.csv guarda cada cambio.
 */
final class EventSettings
{
    public const FILE = 'ajustes.csv';

    public const HISTORY = 'ajustes-historial.csv';

    public const MAX_DEADLINE_CHANGES = 3;

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
     * Guarda la nueva fecha límite y cuenta el cambio.
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
            $this->csv->append($dir.'/'.self::HISTORY, ['fecha', 'clave', 'anterior', 'nuevo'], [
                'fecha' => $now->format('Y-m-d H:i:s'),
                'clave' => 'rsvp_limite',
                'anterior' => (string) $previous,
                'nuevo' => $date,
            ]);

            return $used + 1;
        });
    }
}
