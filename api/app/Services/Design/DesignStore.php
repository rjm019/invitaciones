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
     * Lo que el gestor tiene enfrente: el borrador; si no hay, la publicada; si el evento
     * sigue en el formato anterior, su conversión.
     *
     * @return array{design: Design, source: 'draft'|'live'|'legacy', warnings: list<string>, settings: array<string, string>}
     */
    public function current(string $slug): array
    {
        $dir = $this->dir($slug);
        if (is_file($this->draftPath($dir))) {
            [$design, $warnings] = $this->file->read($this->draftPath($dir));

            return ['design' => $design, 'source' => 'draft', 'warnings' => $warnings, 'settings' => []];
        }

        return $this->published($slug);
    }

    /**
     * La versión publicada (o, en el formato anterior, su conversión).
     *
     * @return array{design: Design, source: 'live'|'legacy', warnings: list<string>, settings: array<string, string>}
     */
    public function published(string $slug): array
    {
        $dir = $this->dir($slug);
        if (is_file($this->livePath($dir))) {
            [$design, $warnings] = $this->file->read($this->livePath($dir));

            return ['design' => $design, 'source' => 'live', 'warnings' => $warnings, 'settings' => []];
        }

        $converted = $this->converter->convert($this->events->rawSheets($slug) ?? []);

        return [
            'design' => $converted['design'],
            'source' => 'legacy',
            'warnings' => $converted['warnings'],
            'settings' => $converted['settings'],
        ];
    }

    /** Huella de lo que el gestor tiene enfrente: cambia con cualquier cambio guardado. */
    public function version(string $slug): string
    {
        $current = $this->current($slug);
        $prefix = ['draft' => 'b', 'live' => 'p', 'legacy' => 'a'][$current['source']];

        return $prefix.'-'.$this->file->hash($current['design']);
    }

    /** ¿El borrador es distinto de lo publicado? */
    public function pending(string $slug): bool
    {
        if (! $this->hasDraft($slug)) {
            return false;
        }

        return $this->file->hash($this->current($slug)['design']) !== $this->file->hash($this->published($slug)['design']);
    }

    /**
     * Guarda el borrador si nadie lo cambió desde $expected; devuelve la versión nueva.
     *
     * @throws DesignConflict
     */
    public function saveDraft(string $slug, Design $design, string $expected): string
    {
        $dir = $this->dir($slug);
        $path = $this->draftPath($dir);
        if (! is_dir(dirname($path)) && ! mkdir(dirname($path), 0775, true) && ! is_dir(dirname($path))) {
            throw new RuntimeException('No se pudo crear la carpeta del borrador.');
        }

        return $this->csv->locked($path, function () use ($slug, $design, $expected, $path) {
            $current = $this->version($slug);
            if (! hash_equals($current, $expected)) {
                throw new DesignConflict($current);
            }
            $this->file->write($path, $design);

            return $this->version($slug);
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

    private function dir(string $slug): string
    {
        return $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
    }
}
