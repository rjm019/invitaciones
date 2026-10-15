<?php

namespace App\Services\Design;

use App\Services\Invitations\EventSettings;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Invitaciones nuevas: en blanco (resources/invitacion/en-blanco.csv) o copiando otro
 * evento o plantilla. Una copia lleva solo la invitación y sus archivos (media/, sin
 * originales/): nunca los enlaces, respuestas, ajustes, respaldos ni el borrador del otro
 * evento (si copiara los tokens, un invitado podría abrir la copia).
 *
 * Toda invitación nueva empieza oculta; un evento recibe su propia clave del panel y una
 * plantilla no tiene (nunca tiene panel ni se publica).
 */
final class DesignFactory
{
    public const BLANK = 'resources/invitacion/en-blanco.csv';

    /** Nombres que no pueden ser eventos (chocan con rutas del gestor). */
    public const RESERVED_SLUGS = ['vista-previa', 'gestor', 'api', 'media', 'nuevo'];

    /** Datos que se pueden poner al crear (el resto se edita después). */
    public const EVENT_FIELDS = ['tipo', 'festejada', 'festejada_corto', 'pareja', 'inicia', 'titulo'];

    /** Para la clave del panel: sin letras que se confunden (0/o, 1/l/i). */
    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly DesignFile $file,
        private readonly EventSettings $settings,
        private readonly PublicationLog $log,
    ) {}

    public static function allowedSlug(string $slug): bool
    {
        return EventRepository::validSlug($slug) && ! in_array($slug, self::RESERVED_SLUGS, true);
    }

    /**
     * @param  array<string, string>  $event  tipo, festejada, inicia…
     * @param  array{usuario: string, nombre: string}|null  $by  quién la crea (para el historial)
     * @return array{slug: string, panel_password: ?string}
     */
    public function create(string $slug, ?string $from, bool $template, array $event, ?CarbonImmutable $now = null, ?array $by = null): array
    {
        $now ??= CarbonImmutable::now();
        if (! self::allowedSlug($slug)) {
            throw new RuntimeException('Esa dirección no se puede usar.');
        }
        $dir = $this->events->root().'/'.$slug;
        if (file_exists($dir)) {
            throw new RuntimeException('Ya existe un evento con esa dirección.');
        }

        if ($from !== null) {
            if ($this->events->path($from) === null) {
                throw new RuntimeException('No existe el evento o plantilla de origen.');
            }
            $design = $this->store->current($from)['design'];
        } else {
            [$design] = $this->file->read(base_path(self::BLANK));
        }
        foreach (self::EVENT_FIELDS as $key) {
            $value = trim((string) ($event[$key] ?? ''));
            if ($value !== '') {
                $design->event[$key] = $value;
            }
        }
        // Lo privado nunca viaja en la invitación.
        unset($design->event['clave_panel'], $design->event['publicado']);

        if (! mkdir($dir.'/media', 0775, true) && ! is_dir($dir.'/media')) {
            throw new RuntimeException('No se pudo crear la carpeta del evento.');
        }
        if ($from !== null) {
            $this->copyMedia((string) $this->events->path($from), $dir);
        }
        $this->file->write($dir.'/'.DesignFile::FILE, $design);

        $password = $template ? null : self::password();
        $this->settings->put($dir, array_filter([
            'publicado' => 'NO',
            'plantilla' => $template ? 'SI' : null,
            'clave_panel' => $password,
        ]), $now, $by);
        $this->log->add($dir, $now, $from === null ? 'nueva' : "copia de {$from}", count($design->sections), $by);

        return ['slug' => $slug, 'panel_password' => $password];
    }

    /** Una clave fácil de dictar: "k7m2-p9qa-x4tb". */
    public static function password(): string
    {
        $groups = [];
        for ($g = 0; $g < 3; $g++) {
            $chunk = '';
            for ($i = 0; $i < 4; $i++) {
                $chunk .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
            $groups[] = $chunk;
        }

        return implode('-', $groups);
    }

    /** Solo los archivos del primer nivel de media/ (no originales/). */
    private function copyMedia(string $from, string $to): void
    {
        foreach (scandir($from.'/media') ?: [] as $name) {
            $source = "{$from}/media/{$name}";
            if (EventRepository::isMediaName($name) && is_file($source)) {
                copy($source, "{$to}/media/{$name}");
            }
        }
    }
}
