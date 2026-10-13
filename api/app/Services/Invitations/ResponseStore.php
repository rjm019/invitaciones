<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Confirmaciones de un evento, una fila por persona (listas para el buscador de recepción):
 * - respuestas.csv: invitacion, para, lugar, nombre, asistira, respondida, mesa. Un nombre
 *   ya registrado nunca se cambia ni se borra; solo se agregan nombres en lugares libres.
 *   La mesa la asigna el dueño desde el panel.
 * - respuestas-historial.csv: cada envío, en orden (solo crece).
 * - aperturas.csv: cada vez que se abre una invitación.
 */
final class ResponseStore
{
    public const FILE = 'respuestas.csv';

    public const HISTORY = 'respuestas-historial.csv';

    public const OPENS = 'aperturas.csv';

    public const HEADERS = ['invitacion', 'para', 'lugar', 'nombre', 'asistira', 'respondida', 'mesa'];

    public const MAX_TABLE = 999;

    private const HISTORY_HEADERS = ['fecha', 'invitacion', 'asistira', 'nombres', 'agregados'];

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
    ) {}

    /**
     * @return list<array{slot: int, name: string, attending: bool, responded_at: string, table: ?int}>
     */
    public function guests(string $slug, string $invitationId): array
    {
        return $this->all($slug)[$invitationId] ?? [];
    }

    /**
     * Personas registradas, agrupadas por invitación y ordenadas por lugar.
     *
     * @return array<string, list<array{slot: int, name: string, attending: bool, responded_at: string, table: ?int}>>
     */
    public function all(string $slug): array
    {
        return $this->group($this->csv->read($this->path($slug, self::FILE)));
    }

    /**
     * Registra nombres nuevos en los lugares libres de una invitación. Los que ya estaban
     * (mismo nombre) se ignoran: reenviar lo mismo no duplica. El cupo se revisa dentro
     * del candado, así dos envíos al mismo tiempo no pueden pasarse de lugares.
     *
     * @param  array{id: string, passes: int, label: string}  $invitation
     * @param  list<string>  $names
     * @return list<string> nombres que sí se agregaron
     *
     * @throws RsvpException 422 si no hay lugares para todos los nombres nuevos
     */
    public function add(string $slug, array $invitation, array $names, bool $attending, CarbonImmutable $now): array
    {
        $path = $this->path($slug, self::FILE);

        $added = $this->csv->locked($path, function () use ($path, $invitation, $names, $attending, $now) {
            $rows = $this->csv->read($path);
            $mine = array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') === $invitation['id']);

            $known = array_map(fn ($r) => self::normalize(CsvFile::unsafe($r['nombre'] ?? '')), $mine);
            $new = [];
            foreach ($names as $name) {
                $key = self::normalize($name);
                if ($key !== '' && ! in_array($key, $known, true)) {
                    $known[] = $key;
                    $new[] = $name;
                }
            }
            if ($new === []) {
                return [];
            }

            $used = array_map(fn ($r) => (int) ($r['lugar'] ?? 0), $mine);
            $free = array_values(array_diff(range(1, $invitation['passes']), $used));
            if (count($new) > count($free)) {
                $left = count($free);
                throw new RsvpException(match ($left) {
                    0 => 'Tu invitación ya está completa.',
                    1 => 'Solo queda 1 lugar en tu invitación.',
                    default => "Solo quedan {$left} lugares en tu invitación.",
                }, 422, 'guests');
            }

            foreach ($new as $i => $name) {
                $rows[] = [
                    'invitacion' => $invitation['id'],
                    'para' => CsvFile::safe($invitation['label']),
                    'lugar' => $free[$i],
                    'nombre' => CsvFile::safe($name),
                    'asistira' => $attending ? 'SI' : 'NO',
                    'respondida' => $now->format('Y-m-d H:i:s'),
                    'mesa' => '',
                ];
            }

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);

            return $new;
        });

        $this->csv->append($this->path($slug, self::HISTORY), self::HISTORY_HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'invitacion' => $invitation['id'],
            'asistira' => $attending ? 'SI' : 'NO',
            'nombres' => implode('; ', array_map(CsvFile::safe(...), $names)),
            'agregados' => count($added),
        ]);

        return $added;
    }

    /**
     * Asigna (o quita, con null) la mesa de personas ya registradas. Todo o nada: si una
     * asignación no es válida, no se guarda ninguna.
     *
     * @param  list<array{invitation: string, slot: int, table: ?int}>  $assignments
     *
     * @throws RsvpException 422 si la persona no existe o no asistirá
     */
    public function assignTables(string $slug, array $assignments, CarbonImmutable $now): void
    {
        $path = $this->path($slug, self::FILE);

        $this->csv->locked($path, function () use ($path, $assignments, $now) {
            $rows = $this->csv->read($path);
            $index = [];
            foreach ($rows as $i => $row) {
                $index[($row['invitacion'] ?? '').'#'.($row['lugar'] ?? '')] = $i;
            }

            foreach ($assignments as $a) {
                $i = $index[$a['invitation'].'#'.$a['slot']] ?? null;
                if ($i === null) {
                    throw new RsvpException("La invitación #{$a['invitation']} no tiene a nadie en el lugar {$a['slot']}.", 422, 'assignments');
                }
                if ($a['table'] !== null && ($rows[$i]['asistira'] ?? '') !== 'SI') {
                    $name = CsvFile::unsafe($rows[$i]['nombre'] ?? '');
                    throw new RsvpException("{$name} no asistirá: no necesita mesa.", 422, 'assignments');
                }
                $rows[$i]['mesa'] = $a['table'] === null ? '' : (string) $a['table'];
            }

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);
        });
    }

    public function recordOpen(string $slug, string $invitationId, CarbonImmutable $now): void
    {
        $this->csv->append($this->path($slug, self::OPENS), ['fecha', 'invitacion'], [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'invitacion' => $invitationId,
        ]);
    }

    /**
     * @return array<string, array{count: int, last: string}> invitación → veces que se abrió y la última
     */
    public function opens(string $slug): array
    {
        $out = [];
        foreach ($this->csv->read($this->path($slug, self::OPENS)) as $row) {
            $id = $row['invitacion'] ?? '';
            if ($id !== '') {
                $out[$id] = ['count' => ($out[$id]['count'] ?? 0) + 1, 'last' => $row['fecha'] ?? ''];
            }
        }

        return $out;
    }

    /** "  ana   PÉREZ " y "Ana Pérez" son la misma persona. */
    public static function normalize(string $name): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $name)));
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, list<array{slot: int, name: string, attending: bool, responded_at: string, table: ?int}>>
     */
    private function group(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $id = $row['invitacion'] ?? '';
            if ($id === '' || ($row['nombre'] ?? '') === '') {
                continue;
            }
            $out[$id][] = [
                'slot' => (int) ($row['lugar'] ?? 0),
                'name' => CsvFile::unsafe($row['nombre']),
                'attending' => ($row['asistira'] ?? '') === 'SI',
                'responded_at' => $row['respondida'] ?? '',
                'table' => ctype_digit($row['mesa'] ?? '') ? (int) $row['mesa'] : null,
            ];
        }
        foreach ($out as &$guests) {
            usort($guests, fn ($a, $b) => $a['slot'] <=> $b['slot']);
        }

        return $out;
    }

    private function path(string $slug, string $file): string
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException("No existe el evento {$slug}");

        return $dir.'/'.$file;
    }
}
