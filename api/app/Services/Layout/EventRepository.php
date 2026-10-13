<?php

namespace App\Services\Layout;

use App\Services\Invitations\EventSettings;

/**
 * Acceso a los eventos guardados como carpetas eventos/<slug>/. Es la "base de datos"
 * del sistema: no hay nada más que estos archivos.
 */
final class EventRepository
{
    private const SLUG = '/^[a-z0-9][a-z0-9-]{1,59}$/';

    private const MEDIA_FILE = '/^[A-Za-z0-9][A-Za-z0-9._-]*\.(webp|png|jpe?g|svg|gif|avif|mp3|m4a|ogg)$/i';

    /** @var array<string, array<string, list<array<string, string>>>> pestañas ya leídas en esta petición */
    private array $sheets = [];

    public function __construct(
        private readonly LayoutReader $reader,
        private readonly EventConfigBuilder $builder,
        private readonly EventSettings $settings,
    ) {}

    public function root(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/');
    }

    /** Carpeta del evento, o null si el slug no es válido o no existe. */
    public function path(string $slug): ?string
    {
        if (! preg_match(self::SLUG, $slug)) {
            return null;
        }
        $dir = $this->root().'/'.$slug;

        return is_dir($dir) ? $dir : null;
    }

    /**
     * Config completo del evento, o null si no existe.
     *
     * @return array<string, mixed>|null
     *
     * @throws LayoutException si el layout tiene errores
     */
    public function find(string $slug): ?array
    {
        $sheets = $this->sheets($slug);

        return $sheets === null ? null : $this->builder->build($slug, $sheets, $this->media($slug));
    }

    /**
     * Pestañas del layout, o null si el evento no existe. Se leen una sola vez por petición.
     * Lo que el dueño cambió desde el panel (ajustes.csv) gana sobre el Excel: así la
     * fecha límite nueva aplica en la invitación, la API y el panel por igual.
     *
     * @return array<string, list<array<string, string>>>|null
     */
    public function sheets(string $slug): ?array
    {
        $dir = $this->path($slug);
        if ($dir === null) {
            return null;
        }

        return $this->sheets[$slug] ??= $this->withSettings($this->reader->read($dir), $this->settings->read($dir));
    }

    /** Olvida lo leído (después de un cambio desde el panel). */
    public function forget(string $slug): void
    {
        unset($this->sheets[$slug]);
    }

    /**
     * Valor crudo de la pestaña "evento" (para claves que no van al config público, como clave_panel).
     */
    public function eventValue(string $slug, string $key): ?string
    {
        foreach ($this->sheets($slug)['evento'] ?? [] as $row) {
            if (LayoutReader::key($row['clave'] ?? '') === $key) {
                $value = trim($row['valor'] ?? '');

                return $value === '' ? null : $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, list<array<string, string>>>  $sheets
     * @param  array<string, string>  $settings
     * @return array<string, list<array<string, string>>>
     */
    private function withSettings(array $sheets, array $settings): array
    {
        if (($settings['rsvp_limite'] ?? '') === '') {
            return $sheets;
        }
        $rows = array_values(array_filter(
            $sheets['evento'] ?? [],
            fn ($row) => LayoutReader::key($row['clave'] ?? '') !== 'rsvp_limite',
        ));
        $rows[] = ['clave' => 'rsvp_limite', 'valor' => $settings['rsvp_limite']];
        $sheets['evento'] = $rows;

        return $sheets;
    }

    /**
     * Archivos de eventos/<slug>/media/ (solo el primer nivel) → URL pública.
     *
     * @return array<string, string>
     */
    public function media(string $slug): array
    {
        $dir = $this->path($slug);
        if ($dir === null || ! is_dir($dir.'/media')) {
            return [];
        }

        $out = [];
        foreach (scandir($dir.'/media') ?: [] as $file) {
            if (preg_match(self::MEDIA_FILE, $file) && is_file($dir.'/media/'.$file)) {
                $out[$file] = url("/media/{$slug}/{$file}");
            }
        }

        return $out;
    }

    /** Ruta absoluta de un archivo de media, o null si el nombre no es válido o no existe. */
    public function mediaFile(string $slug, string $file): ?string
    {
        $dir = $this->path($slug);
        if ($dir === null || ! preg_match(self::MEDIA_FILE, $file)) {
            return null;
        }
        $path = $dir.'/media/'.$file;

        return is_file($path) ? $path : null;
    }
}
