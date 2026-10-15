<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Dedicatorias de un evento (dedicatorias.csv): invitacion, para, nombre, dedicatoria,
 * fecha. Una por invitación (por enlace): la que ya se envió nunca se cambia. Antes de
 * escribir se respalda el archivo del día. Si el dueño elimina la invitación, su dedicatoria
 * pasa a dedicatorias-eliminadas.csv con la fecha.
 */
final class DedicationStore
{
    public const FILE = 'dedicatorias.csv';

    public const HEADERS = ['invitacion', 'para', 'nombre', 'dedicatoria', 'fecha'];

    public const DELETED = 'dedicatorias-eliminadas.csv';

    public const MAX_NAME = 80;

    public const MAX_MESSAGE = 600;

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
        private readonly InvitationStore $invitations,
    ) {}

    /** @return array{name: string, message: string, sent_at: string}|null */
    public function find(string $slug, string $invitationId): ?array
    {
        return $this->all($slug)[$invitationId] ?? null;
    }

    /** @return array<string, array{name: string, message: string, sent_at: string}> invitación → dedicatoria */
    public function all(string $slug): array
    {
        $out = [];
        foreach ($this->csv->read($this->path($slug)) as $row) {
            $id = $row['invitacion'] ?? '';
            if ($id !== '' && ! isset($out[$id])) {
                $out[$id] = [
                    'name' => CsvFile::unsafe($row['nombre'] ?? ''),
                    'message' => CsvFile::unsafe($row['dedicatoria'] ?? ''),
                    'sent_at' => $row['fecha'] ?? '',
                ];
            }
        }

        return $out;
    }

    /**
     * Guarda la dedicatoria de una invitación. Se revisa dentro del candado, así dos
     * envíos al mismo tiempo no pueden dejar dos.
     *
     * @param  array{id: string, label: string}  $invitation
     *
     * @throws RsvpException 409 si esa invitación ya envió su dedicatoria · 404 si se eliminó
     */
    public function add(string $slug, array $invitation, string $name, string $message, CarbonImmutable $now): void
    {
        $path = $this->path($slug);

        $this->csv->locked($path, function () use ($slug, $path, $invitation, $name, $message, $now) {
            if (! $this->invitations->active($slug, $invitation['id'])) {
                throw new RsvpException(InvitationService::NOT_FOUND, 404);
            }
            $rows = $this->csv->read($path);
            foreach ($rows as $row) {
                if (($row['invitacion'] ?? '') === $invitation['id']) {
                    throw new RsvpException('Ya enviaste tu dedicatoria. ¡Gracias!', 409);
                }
            }

            $rows[] = [
                'invitacion' => $invitation['id'],
                'para' => CsvFile::safe($invitation['label']),
                'nombre' => CsvFile::safe($name),
                'dedicatoria' => CsvFile::safe($message),
                'fecha' => $now->format('Y-m-d H:i:s'),
            ];

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);
        });
    }

    /** Quita la dedicatoria de una invitación eliminada; true si tenía. */
    public function removeInvitation(string $slug, string $invitationId, CarbonImmutable $now): bool
    {
        $path = $this->path($slug);

        return $this->csv->locked($path, function () use ($path, $invitationId, $now) {
            $rows = $this->csv->read($path);
            $removed = array_values(array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') === $invitationId));
            if ($removed === []) {
                return false;
            }

            foreach ($removed as $row) {
                $this->csv->append(dirname($path).'/'.self::DELETED, ['eliminada', ...self::HEADERS], ['eliminada' => $now->format('Y-m-d H:i:s')] + $row);
            }
            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, array_values(array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') !== $invitationId)));

            return true;
        });
    }

    private function path(string $slug): string
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException("No existe el evento {$slug}");

        return $dir.'/'.self::FILE;
    }
}
