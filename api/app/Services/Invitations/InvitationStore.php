<?php

namespace App\Services\Invitations;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * eventos/<slug>/invitaciones.csv: cada enlace que genera el dueño desde el panel.
 * id, token, invitados (para cuántas personas), para (nombre opcional en la invitación), creada.
 * Un token nunca cambia: es el enlace que ya se mandó.
 */
final class InvitationStore
{
    public const FILE = 'invitaciones.csv';

    public const HEADERS = ['id', 'token', 'invitados', 'para', 'creada'];

    /** 12 caracteres [A-Za-z0-9]: ~71 bits, imposible de adivinar. */
    public const PATTERN = '/^[A-Za-z0-9]{12}$/';

    public const MAX_PASSES = 30;

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
    ) {}

    /**
     * Invitaciones del evento por id, en el orden en que se crearon.
     *
     * @return array<string, array{id: string, token: string, passes: int, label: string, created_at: string}>
     */
    public function all(string $slug): array
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            return [];
        }

        $out = [];
        foreach ($this->csv->read($dir.'/'.self::FILE) as $row) {
            $id = $row['id'] ?? '';
            $passes = (int) ($row['invitados'] ?? 0);
            if ($id === '' || ! preg_match(self::PATTERN, $row['token'] ?? '') || $passes < 1) {
                continue;
            }
            $out[$id] = [
                'id' => $id,
                'token' => $row['token'],
                'passes' => $passes,
                'label' => $row['para'] ?? '',
                'created_at' => $row['creada'] ?? '',
            ];
        }

        return $out;
    }

    /**
     * Evento e id de un token, buscando en todos los eventos.
     *
     * @return array{slug: string, id: string}|null
     */
    public function locate(string $token): ?array
    {
        if (! preg_match(self::PATTERN, $token)) {
            return null;
        }
        foreach ($this->slugs() as $slug) {
            foreach ($this->all($slug) as $id => $invitation) {
                if (hash_equals($invitation['token'], $token)) {
                    return ['slug' => $slug, 'id' => (string) $id];
                }
            }
        }

        return null;
    }

    /**
     * Genera una invitación nueva con un token que no existe en ningún evento.
     *
     * @return array{id: string, token: string, passes: int, label: string, created_at: string}
     */
    public function create(string $slug, int $passes, string $label, CarbonImmutable $now): array
    {
        $path = $this->events->path($slug).'/'.self::FILE;

        return $this->csv->locked($path, function () use ($passes, $label, $now, $path) {
            $rows = $this->csv->read($path);
            $taken = array_flip($this->allTokens());
            do {
                $token = Str::random(12);
            } while (isset($taken[$token]));

            $id = (string) (max([0, ...array_map(fn ($r) => (int) ($r['id'] ?? 0), $rows)]) + 1);
            $row = [
                'id' => $id,
                'token' => $token,
                'invitados' => $passes,
                'para' => CsvFile::safe($label),
                'creada' => $now->format('Y-m-d H:i'),
            ];
            $rows[] = $row;

            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);

            return ['id' => $id, 'token' => $token, 'passes' => $passes, 'label' => $label, 'created_at' => $row['creada']];
        });
    }

    /** @return list<string> */
    private function slugs(): array
    {
        $out = [];
        foreach (glob($this->events->root().'/*/'.self::FILE) ?: [] as $file) {
            $slug = basename(dirname($file));
            if ($this->events->path($slug) !== null) {
                $out[] = $slug;
            }
        }

        return $out;
    }

    /** @return list<string> */
    private function allTokens(): array
    {
        $all = [];
        foreach ($this->slugs() as $slug) {
            array_push($all, ...array_column($this->all($slug), 'token'));
        }

        return $all;
    }
}
