<?php

namespace App\Services\Design;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use RuntimeException;

/**
 * Dónde vive cada versión de una invitación:
 *
 * - eventos/<slug>/invitacion.csv: la publicada (la que ven los invitados).
 * - eventos/<slug>/borrador/invitacion.csv: lo que edita el gestor. Solo existe si hay
 *   cambios sin publicar; está en una subcarpeta para que el panel del dueño (que revisa
 *   los *.csv del evento cada 5 s) no se refresque con cada tecla.
 * - eventos/<slug>/respaldos/invitacion-AAAAMMDD-HHMMSS.csv: cada versión publicada antes
 *   (el historial; se guardan las últimas 50).
 *
 * Un evento en el formato anterior no tiene invitacion.csv: lo que se edita es su
 * conversión, y publicarla es la migración.
 */
final class DesignStore
{
    public const DRAFT_DIR = 'borrador';

    public const HISTORY_KEEP = 50;

    private const HISTORY_PATTERN = '/^invitacion-(\d{8}-\d{6}(?:-\d+)?)\.csv$/';

    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignFile $file,
        private readonly CsvFile $csv,
        private readonly LegacyLayoutConverter $converter,
        private readonly PublicationLog $log,
    ) {}

    public function livePath(string $dir): string
    {
        return $dir.'/'.DesignFile::FILE;
    }

    public function draftPath(string $dir): string
    {
        return $dir.'/'.self::DRAFT_DIR.'/'.DesignFile::FILE;
    }

    public function hasDraft(string $slug): bool
    {
        $dir = $this->events->path($slug);

        return $dir !== null && is_file($this->draftPath($dir));
    }

    /**
     * Lo que hay en disco de la invitación (borrador y publicada), leído una sola vez: lo
     * que una operación completa (abrir, guardar, publicar) necesita sin volver a leer.
     */
    public function state(string $slug): DesignState
    {
        $dir = $this->dir($slug);
        $draft = is_file($this->draftPath($dir)) ? $this->read($this->draftPath($dir)) : null;
        $live = $this->livePath($dir);
        $legacy = ! is_file($live);

        return new DesignState($dir, $draft, $legacy, function () use ($slug, $live, $legacy) {
            if (! $legacy) {
                return [$this->read($live), []];
            }
            $converted = $this->converter->convert($this->events->rawSheets($slug) ?? []);

            return [StoredDesign::fromDesign($this->file, $converted['design'], $converted['warnings']), $converted['settings']];
        });
    }

    /**
     * Lo que el gestor tiene enfrente: el borrador; si no hay, la publicada; si el evento
     * sigue en el formato anterior, su conversión. El diseño es una lectura propia (se puede
     * cambiar sin afectar a nadie más).
     *
     * @return array{design: Design, source: 'draft'|'live'|'legacy', warnings: list<string>, settings: array<string, string>}
     */
    public function current(string $slug): array
    {
        $state = $this->state($slug);
        if ($state->draft !== null) {
            return ['design' => $state->draft->design(), 'source' => 'draft', 'warnings' => $state->draft->warnings(), 'settings' => []];
        }

        return $this->publishedOf($state);
    }

    /**
     * La versión publicada (o, en el formato anterior, su conversión).
     *
     * @return array{design: Design, source: 'live'|'legacy', warnings: list<string>, settings: array<string, string>}
     */
    public function published(string $slug): array
    {
        return $this->publishedOf($this->state($slug));
    }

    /**
     * @return array{design: Design, source: 'live'|'legacy', warnings: list<string>, settings: array<string, string>}
     */
    public function publishedOf(DesignState $state): array
    {
        $published = $state->published();

        return [
            'design' => $published->design(),
            'source' => $state->legacy ? 'legacy' : 'live',
            'warnings' => $published->warnings(),
            'settings' => $state->legacySettings(),
        ];
    }

    /** Huella de lo que el gestor tiene enfrente: cambia con cualquier cambio guardado. */
    public function version(string $slug): string
    {
        return $this->state($slug)->version();
    }

    /** ¿El borrador es distinto de lo publicado? */
    public function pending(string $slug): bool
    {
        return $this->state($slug)->pending();
    }

    /**
     * Guarda el borrador si nadie lo cambió desde $expected; devuelve cómo quedó (con el
     * borrador que se acaba de escribir, sin volver a leerlo).
     *
     * @throws DesignConflict
     */
    public function saveDraft(string $slug, Design $design, string $expected): DesignState
    {
        $dir = $this->dir($slug);
        $path = $this->draftPath($dir);
        if (! is_dir(dirname($path)) && ! mkdir(dirname($path), 0775, true) && ! is_dir(dirname($path))) {
            throw new RuntimeException('No se pudo crear la carpeta del borrador.');
        }

        return $this->csv->locked($path, function () use ($slug, $design, $expected, $path) {
            $state = $this->state($slug);
            $current = $state->version();
            if (! hash_equals($current, $expected)) {
                throw new DesignConflict($current);
            }

            return $state->withDraft(StoredDesign::fromBytes($this->file, $this->file->write($path, $design)));
        });
    }

    /** Descarta los cambios sin publicar. */
    public function discard(string $slug): void
    {
        $dir = $this->dir($slug);
        $path = $this->draftPath($dir);
        if (is_file($path)) {
            $this->csv->locked($path, fn () => @unlink($path));
        }
    }

    /**
     * Las versiones publicadas antes, la más reciente primero: cuándo dejó de verse cada una
     * (replaced_at) y, según la bitácora, cuándo se publicó y quién (null si no hay registro).
     *
     * @return list<array{id: string, published_at: ?string, replaced_at: ?string, origin: ?string, by: array{username: string, name: string}|null, bytes: int}>
     */
    public function history(string $slug): array
    {
        $root = $this->dir($slug);
        $dir = $root.'/respaldos';
        $entries = $this->log->entries($root);
        $out = [];
        foreach (scandir($dir) ?: [] as $name) {
            if (preg_match(self::HISTORY_PATTERN, $name, $m) && is_file("{$dir}/{$name}")) {
                $replaced = self::stamp(substr($m[1], 0, 15));
                $published = $replaced === null ? null : PublicationLog::before($entries, $replaced);
                $out[] = [
                    'id' => $m[1],
                    'published_at' => $published['published_at'] ?? null,
                    'replaced_at' => $replaced?->toIso8601String(),
                    'origin' => $published['origin'] ?? null,
                    'by' => $published['by'] ?? null,
                    'bytes' => (int) filesize("{$dir}/{$name}"),
                ];
            }
        }
        usort($out, fn ($a, $b) => strcmp($b['id'], $a['id']));

        return $out;
    }

    /** Copia una versión del historial al borrador (para revisarla y volver a publicarla). */
    public function restore(string $slug, string $id): void
    {
        $dir = $this->dir($slug);
        if (! preg_match('/^\d{8}-\d{6}(?:-\d+)?$/', $id) || ! is_file("{$dir}/respaldos/invitacion-{$id}.csv")) {
            throw new RuntimeException('Esa versión ya no está en el historial.');
        }
        [$design] = $this->file->read("{$dir}/respaldos/invitacion-{$id}.csv");
        $path = $this->draftPath($dir);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        $this->csv->locked($path, fn () => $this->file->write($path, $design));
    }

    /** Guarda la versión publicada actual en el historial y deja solo las últimas 50. */
    public function archiveLive(string $dir, CarbonImmutable $now): ?string
    {
        $live = $this->livePath($dir);
        if (! is_file($live)) {
            return null;
        }
        $backups = $dir.'/respaldos';
        if (! is_dir($backups) && ! mkdir($backups, 0775, true) && ! is_dir($backups)) {
            throw new RuntimeException("No se pudo crear {$backups}");
        }
        $id = $now->format('Ymd-His');
        for ($n = 2; is_file("{$backups}/invitacion-{$id}.csv"); $n++) {
            $id = $now->format('Ymd-His')."-{$n}";
        }
        copy($live, "{$backups}/invitacion-{$id}.csv");

        $all = array_values(array_filter(scandir($backups) ?: [], fn ($name) => preg_match(self::HISTORY_PATTERN, $name)));
        rsort($all, SORT_STRING);
        foreach (array_slice($all, self::HISTORY_KEEP) as $old) {
            @unlink("{$backups}/{$old}");
        }

        return $id;
    }

    private static function stamp(string $value): ?CarbonImmutable
    {
        try {
            return CarbonImmutable::createFromFormat('Ymd-His', $value) ?: null;
        } catch (InvalidFormatException) {
            return null;
        }
    }

    private function read(string $path): StoredDesign
    {
        $bytes = @file_get_contents($path);
        if ($bytes === false) {
            throw new RuntimeException('No se pudo leer '.basename($path));
        }

        return StoredDesign::fromBytes($this->file, $bytes);
    }

    private function dir(string $slug): string
    {
        return $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
    }
}
