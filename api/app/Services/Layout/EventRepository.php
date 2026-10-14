<?php

namespace App\Services\Layout;

use App\Services\Design\Design;
use App\Services\Design\DesignFile;
use App\Services\Design\InvitationConfigBuilder;
use App\Services\Design\Normalizer;
use App\Services\Invitations\EventSettings;
use RuntimeException;

/**
 * Acceso a los eventos guardados como carpetas eventos/<slug>/. Es la "base de datos"
 * del sistema: no hay nada más que estos archivos.
 *
 * Un evento está en uno de dos formatos:
 * - **Nuevo**: invitacion.csv (lo edita el gestor). Se arma con InvitationConfigBuilder.
 * - **Anterior** (deprecado): layout.xlsx o un CSV por pestaña. Se arma igual que siempre,
 *   con EventConfigBuilder, hasta que se migra (invitacion:migrar o "Publicar" en el gestor).
 */
final class EventRepository
{
    private const SLUG = '/^[a-z0-9][a-z0-9-]{1,59}$/';

    private const MEDIA_FILE = '/^[A-Za-z0-9][A-Za-z0-9._-]*\.(webp|png|jpe?g|svg|gif|avif|mp3|m4a|ogg)$/i';

    /** @var array<string, array<string, list<array<string, string>>>> pestañas ya leídas en esta petición */
    private array $sheets = [];

    /** @var array<string, Design> invitaciones ya leídas en esta petición */
    private array $designs = [];

    public function __construct(
        private readonly LayoutReader $reader,
        private readonly EventConfigBuilder $builder,
        private readonly EventSettings $settings,
        private readonly DesignFile $designFile,
        private readonly InvitationConfigBuilder $designBuilder,
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

    public static function validSlug(string $slug): bool
    {
        return (bool) preg_match(self::SLUG, $slug);
    }

    /** @return list<string> */
    public function slugs(): array
    {
        $out = [];
        foreach (scandir($this->root()) ?: [] as $name) {
            if (preg_match(self::SLUG, $name) && is_dir($this->root().'/'.$name)) {
                $out[] = $name;
            }
        }

        return $out;
    }

    /** ¿Ya está en el formato nuevo (invitacion.csv)? */
    public function hasDesign(string $slug): bool
    {
        $dir = $this->path($slug);

        return $dir !== null && is_file($dir.'/'.DesignFile::FILE);
    }

    /**
     * La invitación publicada en el formato nuevo, o null si el evento sigue en el anterior.
     *
     * @throws LayoutException si invitacion.csv no se puede leer
     */
    public function design(string $slug): ?Design
    {
        if (! $this->hasDesign($slug)) {
            return null;
        }
        if (! isset($this->designs[$slug])) {
            try {
                [$this->designs[$slug]] = $this->designFile->read($this->path($slug).'/'.DesignFile::FILE);
            } catch (RuntimeException $e) {
                throw new LayoutException($slug, ['invitacion.csv: '.$e->getMessage()]);
            }
        }

        return $this->designs[$slug];
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
        $design = $this->design($slug);
        if ($design !== null) {
            $result = $this->designBuilder->build($slug, $design, $this->media($slug), $this->settings($slug));
            if ($result->hasErrors()) {
                throw new LayoutException($slug, $result->errors());
            }

            return $result->config;
        }

        $sheets = $this->sheets($slug);

        return $sheets === null ? null : $this->builder->build($slug, $sheets, $this->media($slug));
    }

    /**
     * Pestañas del layout anterior, o null si el evento no existe. Se leen una sola vez por
     * petición. Lo que se cambió desde los paneles (ajustes.csv) gana sobre el Excel: así la
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

    /**
     * Las pestañas tal como están en el Excel, sin lo de ajustes.csv (para migrar).
     *
     * @return array<string, list<array<string, string>>>|null
     */
    public function rawSheets(string $slug): ?array
    {
        $dir = $this->path($slug);

        return $dir === null ? null : $this->reader->read($dir);
    }

    /**
     * ajustes.csv del evento (fecha límite del dueño, clave del panel, si se ve…).
     *
     * @return array<string, string>
     */
    public function settings(string $slug): array
    {
        $dir = $this->path($slug);

        return $dir === null ? [] : $this->settings->read($dir);
    }

    /** Olvida lo leído (después de un cambio desde un panel). */
    public function forget(string $slug): void
    {
        unset($this->sheets[$slug], $this->designs[$slug]);
    }

    /** ¿Es una plantilla? (nunca se publica ni tiene panel del cliente) */
    public function isTemplate(string $slug): bool
    {
        return Normalizer::yes($this->settings($slug)['plantilla'] ?? 'NO');
    }

    /**
     * Valor crudo de los datos del evento (para lo que no va al config público, como
     * clave_panel). Primero ajustes.csv (lo que se cambia al instante), luego la invitación.
     */
    public function eventValue(string $slug, string $key): ?string
    {
        $settings = $this->settings($slug);
        if (in_array($key, EventSettings::MANAGED, true) && trim($settings[$key] ?? '') !== '') {
            return trim($settings[$key]);
        }

        $design = $this->design($slug);
        if ($design !== null) {
            return match ($key) {
                'retrato' => $design->first('foto')?->field('imagen'),
                'vestimenta_colores' => $design->first('vestimenta')?->field('colores'),
                default => $design->event($key),
            };
        }

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
        $overrides = array_filter([
            'rsvp_limite' => $settings['rsvp_limite'] ?? '',
            'publicado' => Normalizer::yes($settings['plantilla'] ?? 'NO') ? 'NO' : ($settings['publicado'] ?? ''),
        ], fn ($v) => $v !== '');
        if ($overrides === []) {
            return $sheets;
        }
        $rows = array_values(array_filter(
            $sheets['evento'] ?? [],
            fn ($row) => ! isset($overrides[LayoutReader::key($row['clave'] ?? '')]),
        ));
        foreach ($overrides as $key => $value) {
            $rows[] = ['clave' => $key, 'valor' => $value];
        }
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

    public static function isMediaName(string $file): bool
    {
        return (bool) preg_match(self::MEDIA_FILE, $file);
    }
}
