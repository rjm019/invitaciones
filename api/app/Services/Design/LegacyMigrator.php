<?php

namespace App\Services\Design;

use App\Services\Invitations\EventSettings;
use App\Services\Layout\EventConfigBuilder;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Layout\LayoutReader;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Pasa un evento del formato anterior (layout.xlsx o CSV por pestaña) a invitacion.csv.
 *
 * Primero revisa (check): arma el config con el Excel de siempre y con la conversión, y los
 * compara. Solo si salen idénticos conviene aplicar (apply): escribe invitacion.csv, pasa la
 * clave del panel y "publicado" a ajustes.csv y copia el layout viejo a respaldos/. El layout
 * viejo se queda en su lugar (el código anterior lo sigue leyendo); --limpiar lo quita después.
 * Nunca toca los CSV que escribe el sistema (invitaciones, respuestas, dedicatorias…).
 */
final class LegacyMigrator
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly EventConfigBuilder $legacyBuilder,
        private readonly InvitationConfigBuilder $builder,
        private readonly LegacyLayoutConverter $converter,
        private readonly ConfigComparator $comparator,
        private readonly DesignFile $file,
        private readonly EventSettings $settings,
    ) {}

    /**
     * @return array{identical: bool, differences: list<string>, errors: list<string>, warnings: list<string>, design: Design, settings: array<string, string>}
     */
    public function check(string $slug, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $raw = $this->events->rawSheets($slug) ?? throw new RuntimeException("No existe el evento {$slug}.");
        $converted = $this->converter->convert($raw);
        $out = [
            'identical' => false,
            'differences' => [],
            'errors' => [],
            'warnings' => $converted['warnings'],
            'design' => $converted['design'],
            'settings' => $converted['settings'],
        ];

        try {
            $legacy = $this->legacyBuilder->build($slug, $this->events->sheets($slug) ?? [], $this->events->media($slug), $now);
        } catch (LayoutException $e) {
            $out['errors'] = array_map(fn ($m) => "formato anterior: {$m}", $e->errors);

            return $out;
        }

        $settings = array_merge($converted['settings'], array_filter($this->events->settings($slug), fn ($v) => $v !== ''));
        $result = $this->builder->build($slug, $converted['design'], $this->events->media($slug), $settings, now: $now);
        $out['errors'] = $result->errors();
        $out['warnings'] = [...$out['warnings'], ...$result->warnings()];
        if (! $result->hasErrors()) {
            $out['differences'] = $this->comparator->differences($legacy, $result->config);
            $out['identical'] = $out['differences'] === [];
        }

        return $out;
    }

    /**
     * Deja el evento en el formato nuevo con este diseño.
     *
     * @param  array<string, string>  $legacySettings  clave_panel y publicado del layout viejo
     */
    public function apply(string $slug, Design $design, array $legacySettings, CarbonImmutable $now): void
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException("No existe el evento {$slug}.");
        $this->backupLegacy($dir, $now, move: false);

        // Primero los ajustes (son inofensivos para el formato anterior) y al final la
        // invitación: si algo falla a la mitad, el evento sigue funcionando como antes.
        $current = $this->settings->read($dir);
        $changes = [];
        foreach ($legacySettings as $key => $value) {
            if (trim($current[$key] ?? '') === '' && $value !== '') {
                $changes[$key] = $value;
            }
        }
        if ($changes !== []) {
            $this->settings->put($dir, $changes, $now);
        }
        $this->file->write($dir.'/'.DesignFile::FILE, $design);
        $this->events->forget($slug);
    }

    /**
     * Quita el layout viejo de la carpeta del evento (queda en respaldos/). Solo para
     * eventos que ya tienen invitacion.csv.
     *
     * @return list<string> archivos movidos
     */
    public function cleanup(string $slug, CarbonImmutable $now): array
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException("No existe el evento {$slug}.");
        if (! is_file($dir.'/'.DesignFile::FILE)) {
            throw new RuntimeException("{$slug} todavía no tiene invitacion.csv: primero migra.");
        }

        return $this->backupLegacy($dir, $now, move: true);
    }

    /**
     * Archivos del layout viejo: layout.xlsx y los CSV de pestañas (nunca los del sistema).
     *
     * @return list<string>
     */
    public function legacyFiles(string $dir): array
    {
        $files = is_file($dir.'/'.LayoutReader::XLSX) ? [$dir.'/'.LayoutReader::XLSX] : [];
        foreach (glob($dir.'/*.csv') ?: [] as $file) {
            if (! in_array(LayoutReader::key(basename($file, '.csv')), LayoutReader::GENERATED, true)) {
                $files[] = $file;
            }
        }

        return $files;
    }

    /** @return list<string> */
    private function backupLegacy(string $dir, CarbonImmutable $now, bool $move): array
    {
        $files = $this->legacyFiles($dir);
        if ($files === []) {
            return [];
        }
        $target = $dir.'/respaldos/formato-anterior-'.$now->format('Ymd-His');
        if (! is_dir($target) && ! mkdir($target, 0775, true) && ! is_dir($target)) {
            throw new RuntimeException("No se pudo crear {$target}");
        }
        $done = [];
        foreach ($files as $file) {
            $copy = $target.'/'.basename($file);
            if ($move) {
                rename($file, $copy);
            } else {
                copy($file, $copy);
            }
            $done[] = basename($file);
        }

        return $done;
    }
}
