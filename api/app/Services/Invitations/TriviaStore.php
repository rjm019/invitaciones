<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Trivia de un evento. trivia.csv: invitacion, para, nombre, respuestas (números de opción
 * separados por ";"), aciertos, segundos, fecha. Una fila por invitación (por enlace): la que
 * ya se envió nunca se cambia. trivia-inicios.csv guarda cuándo abrió cada enlace la trivia
 * (la primera vez gana): de ahí salen los segundos, medidos siempre en el servidor. Antes de
 * escribir se respalda el archivo del día; si el dueño elimina la invitación, su fila pasa a
 * trivia-eliminadas.csv.
 */
final class TriviaStore
{
    public const FILE = 'trivia.csv';

    public const HEADERS = ['invitacion', 'para', 'nombre', 'respuestas', 'aciertos', 'segundos', 'fecha'];

    public const STARTS = 'trivia-inicios.csv';

    public const STARTS_HEADERS = ['invitacion', 'inicio'];

    public const DELETED = 'trivia-eliminadas.csv';

    public const MAX_NAME = 80;

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
        private readonly InvitationStore $invitations,
    ) {}

    /** @return array{name: string, answers: list<int>, correct: int, seconds: int, sent_at: string}|null */
    public function find(string $slug, string $invitationId): ?array
    {
        return $this->all($slug)[$invitationId] ?? null;
    }

    /** @return array<string, array{name: string, answers: list<int>, correct: int, seconds: int, sent_at: string}> invitación → participación */
    public function all(string $slug): array
    {
        $out = [];
        foreach ($this->csv->read($this->path($slug, self::FILE)) as $row) {
            $id = $row['invitacion'] ?? '';
            if ($id !== '' && ! isset($out[$id])) {
                $out[$id] = [
                    'name' => CsvFile::unsafe($row['nombre'] ?? ''),
                    'answers' => array_map('intval', array_values(array_filter(explode(';', $row['respuestas'] ?? ''), fn ($n) => $n !== ''))),
                    'correct' => (int) ($row['aciertos'] ?? 0),
                    'seconds' => (int) ($row['segundos'] ?? 0),
                    'sent_at' => $row['fecha'] ?? '',
                ];
            }
        }

        return $out;
    }

    /** Cuándo abrió la trivia ese enlace (AAAA-MM-DD HH:MM:SS), o null. */
    public function startedAt(string $slug, string $invitationId): ?string
    {
        foreach ($this->csv->read($this->path($slug, self::STARTS)) as $row) {
            if (($row['invitacion'] ?? '') === $invitationId && ($row['inicio'] ?? '') !== '') {
                return $row['inicio'];
            }
        }

        return null;
    }

    /**
     * Marca el inicio de la trivia de un enlace. Abrirla otra vez no reinicia el reloj.
     * Devuelve el inicio que quedó (el de siempre, si ya había uno).
     */
    public function start(string $slug, string $invitationId, CarbonImmutable $now): string
    {
        $path = $this->path($slug, self::STARTS);

        return $this->csv->locked($path, function () use ($path, $invitationId, $now) {
            $rows = $this->csv->read($path);
            foreach ($rows as $row) {
                if (($row['invitacion'] ?? '') === $invitationId && ($row['inicio'] ?? '') !== '') {
                    return $row['inicio'];
                }
            }
            $started = $now->format('Y-m-d H:i:s');
            $rows[] = ['invitacion' => $invitationId, 'inicio' => $started];
            $this->csv->write($path, self::STARTS_HEADERS, $rows);

            return $started;
        });
    }

    /**
     * Guarda la participación de una invitación. Se revisa dentro del candado, así dos
     * envíos al mismo tiempo no pueden dejar dos. Los segundos van desde el inicio anotado.
     *
     * @param  array{id: string, label: string}  $invitation
     * @param  list<int>  $answers
     * @return int los segundos que tardó
     *
     * @throws RsvpException 409 si esa invitación ya respondió · 404 si se eliminó
     */
    public function add(string $slug, array $invitation, string $name, array $answers, int $correct, CarbonImmutable $now): int
    {
        $path = $this->path($slug, self::FILE);

        return $this->csv->locked($path, function () use ($slug, $path, $invitation, $name, $answers, $correct, $now) {
            if (! $this->invitations->active($slug, $invitation['id'])) {
                throw new RsvpException(InvitationService::NOT_FOUND, 404);
            }
            $rows = $this->csv->read($path);
            foreach ($rows as $row) {
                if (($row['invitacion'] ?? '') === $invitation['id']) {
                    throw new RsvpException('Ya respondiste la trivia. ¡Gracias por participar!', 409);
                }
            }

            $started = $this->startedAt($slug, $invitation['id']);
            $seconds = $started === null ? 0 : max(0, $now->getTimestamp() - CarbonImmutable::parse($started, $now->getTimezone())->getTimestamp());

            $rows[] = [
                'invitacion' => $invitation['id'],
                'para' => CsvFile::safe($invitation['label']),
                'nombre' => CsvFile::safe($name),
                'respuestas' => implode(';', $answers),
                'aciertos' => (string) $correct,
                'segundos' => (string) $seconds,
                'fecha' => $now->format('Y-m-d H:i:s'),
            ];

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);

            return $seconds;
        });
    }

    /** Quita la participación (y el inicio) de una invitación eliminada; true si tenía respuesta. */
    public function removeInvitation(string $slug, string $invitationId, CarbonImmutable $now): bool
    {
        $startsPath = $this->path($slug, self::STARTS);
        $this->csv->locked($startsPath, function () use ($startsPath, $invitationId) {
            $rows = $this->csv->read($startsPath);
            $kept = array_values(array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') !== $invitationId));
            if (count($kept) !== count($rows)) {
                $this->csv->write($startsPath, self::STARTS_HEADERS, $kept);
            }
        });

        $path = $this->path($slug, self::FILE);

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

    private function path(string $slug, string $file): string
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException("No existe el evento {$slug}");

        return $dir.'/'.$file;
    }
}
