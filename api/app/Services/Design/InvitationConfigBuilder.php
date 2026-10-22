<?php

namespace App\Services\Design;

use App\Services\Layout\EventRepository;
use App\Services\Weather\VenueLocator;
use Carbon\CarbonImmutable;

/**
 * Convierte una invitación del formato nuevo (Design) en el config que consume la web
 * (contrato en web/src/types/event.ts). Es el mismo contrato que arma EventConfigBuilder
 * desde el Excel de antes, con estos agregados: cada sección trae su `key` (su id en el
 * diseño), sus colores, sus adornos y el estilo de cada texto; el evento trae `page` y
 * `extra_fonts`. Las secciones ocultas ya no se publican (sus textos no salen).
 *
 * Modo estricto (la invitación pública y "Publicar"): con un error no hay config.
 * Modo tolerante (la vista previa del gestor): siempre hay config y los errores van en la lista.
 */
final class InvitationConfigBuilder
{
    private const RSVP_MODES = ['token', 'open', 'whatsapp', 'off'];

    private const MUSIC_SOURCES = ['archivo' => 'file', 'mp3' => 'file', 'file' => 'file', 'spotify' => 'spotify'];

    private const BACKGROUND_FIT = ['cubrir' => 'cover', 'cover' => 'cover', 'mosaico' => 'tile', 'tile' => 'tile'];

    private const DESKTOP = ['completo' => 'full', 'full' => 'full', 'mitad' => 'half', 'half' => 'half'];

    public const DEFAULT_THEME = 'jardin-azul';

    public const MIN_PANEL_PASSWORD = 8;

    /** @var list<array{level: string, block: string, item: ?int, field: ?string, message: string}> */
    private array $issues = [];

    /**
     * @param  array<string, string>  $media  archivo en media/ → URL pública
     * @param  array<string, string>  $settings  ajustes.csv (rsvp_limite, publicado, plantilla…)
     */
    public function build(string $slug, Design $design, array $media, array $settings = [], bool $lenient = false, ?CarbonImmutable $now = null): BuildResult
    {
        $this->issues = [];
        $now ??= CarbonImmutable::now();
        $e = array_filter(array_map('trim', $design->event), fn ($v) => $v !== '');
        if (($settings['rsvp_limite'] ?? '') !== '') {
            $e['rsvp_limite'] = $settings['rsvp_limite'];
        }

        $timezone = $e['zona_horaria'] ?? 'America/Mexico_City';
        if (! Normalizer::timezone($timezone)) {
            $this->error('evento', null, 'zona_horaria', "'{$timezone}' no es una zona horaria (por ejemplo America/Mexico_City)");
            $timezone = 'America/Mexico_City';
        }
        $startsAt = $this->startsAt($e['inicia'] ?? '', $timezone);
        $deadline = $this->deadline($e['rsvp_limite'] ?? '');
        $mode = strtolower($e['rsvp_modo'] ?? 'token');

        $theme = $e['tema'] ?? '';
        if ($theme === '') {
            $this->error('evento', null, 'tema', 'falta el diseño base (por ejemplo jardin-azul)');
        }
        if (! in_array($mode, self::RSVP_MODES, true)) {
            $this->error('evento', null, 'rsvp_modo', "'{$mode}' no existe (usa token, open, whatsapp u off)");
        }
        if ($startsAt && $deadline && $deadline > $startsAt->format('Y-m-d')) {
            $this->error('evento', null, 'rsvp_limite', 'la fecha límite es después del evento');
        }
        if (isset($e['clima_coordenadas']) && VenueLocator::parse($e['clima_coordenadas']) === null) {
            $this->error('evento', null, 'clima_coordenadas', "'{$e['clima_coordenadas']}' no son coordenadas (usa latitud, longitud; por ejemplo 20.1170, -98.7333)");
        }
        $spotify = $e['spotify'] ?? null;
        if ($spotify !== null && ! preg_match(Normalizer::SPOTIFY_LINK, $spotify)) {
            $this->error('evento', null, 'spotify', "'{$spotify}' no es un enlace de Spotify (en Spotify: Compartir → Copiar enlace de la playlist)");
            $spotify = null;
        }
        $musicSource = $this->musicSource($e, $spotify);
        if (isset($e['clave_panel']) && mb_strlen($e['clave_panel']) < self::MIN_PANEL_PASSWORD) {
            $this->error('evento', null, 'clave_panel', 'usa al menos '.self::MIN_PANEL_PASSWORD.' caracteres');
        }
        $this->unknownKeys('evento', $e, [...Catalog::eventOrder(), 'clave_panel', 'publicado']);

        $published = Normalizer::yes($settings['publicado'] ?? $e['publicado'] ?? 'SI')
            && ! Normalizer::yes($settings['plantilla'] ?? 'NO');

        $portrait = $design->first('foto')?->field('imagen') ?? '';
        $dressColors = $design->first('vestimenta')?->field('colores') ?? '';

        $config = [
            'slug' => $slug,
            'type' => $e['tipo'] ?? 'otro',
            'theme' => $theme === '' && $lenient ? self::DEFAULT_THEME : $theme,
            'title' => $e['titulo'] ?? '',
            'subtitle' => $e['subtitulo'] ?? '',
            'celebrant' => array_filter([
                'full_name' => $e['festejada'] ?? '',
                'short_name' => $e['festejada_corto'] ?? ($e['festejada'] ?? ''),
                'partner_name' => $e['pareja'] ?? '',
            ], fn ($v) => $v !== ''),
            'starts_at' => $startsAt?->toIso8601String(),
            'timezone' => $timezone,
            'published' => $published,
            // Una muestra (los demos de la landing): se puede probar todo, pero no guarda nada.
            'demo' => Normalizer::yes($settings['demo'] ?? 'NO'),
            'rsvp' => [
                'mode' => $mode,
                'deadline' => $deadline,
                'open' => $deadline === null || $now->setTimezone($timezone)->format('Y-m-d') <= $deadline,
                'whatsapp_number' => $e['rsvp_whatsapp'] ?? null,
                'ask_song' => Normalizer::yes($e['rsvp_pedir_cancion'] ?? 'SI'),
                'ask_message' => Normalizer::yes($e['rsvp_pedir_mensaje'] ?? 'SI'),
            ],
            'venue' => [
                'name' => $e['salon'] ?? '',
                'display_name' => $e['salon_nombre_visible'] ?? ($e['salon'] ?? ''),
                'city' => $e['salon_ciudad'] ?? '',
                'address' => $e['salon_direccion'] ?? '',
                'maps_url' => $this->webUrl($e['salon_maps'] ?? '', 'evento', null, 'salon_maps'),
                'photo' => $this->media($e['salon_foto'] ?? '', $media),
            ],
            'music' => [
                'source' => $musicSource,
                'audio_url' => $this->media($e['musica_audio'] ?? '', $media),
                'spotify_url' => $spotify,
            ],
            'media' => [
                'portrait' => $this->media($portrait, $media),
            ],
            'dress_code' => [
                'colors' => Normalizer::splitList($dressColors),
            ],
            'palette' => $this->palette($design->colors),
            'fonts' => $this->fonts($design->fonts),
            'sections' => $this->sections($design, $media),
            'family' => $this->family($design->first('bendicion')),
            'itinerary' => $this->itinerary($design->first('itinerario')),
            'locations' => $this->locations($design->first('ubicacion'), $media),
            'hotels' => $this->hotels($design->first('hospedaje'), $media),
            'gallery' => $this->gallery($design->first('galeria'), $media, $slug),
            'envelope' => ($rain = $design->first('lluvia_sobres')) ? $this->envelope($rain) : null,
            'gifts' => $this->gifts($design->first('mesa_regalos')),
            'assets' => (object) $media,
        ];

        // Sin mesa de regalos ni galería, la llave no va (como en el formato anterior).
        if ($config['gifts'] === null) {
            unset($config['gifts']);
        }
        if ($config['envelope'] === null) {
            unset($config['envelope']);
        }
        if ($config['gallery'] === []) {
            unset($config['gallery']);
        }
        $page = $this->page($design->page, $media);
        if ($page !== []) {
            $config['page'] = $page;
        }
        $fonts = $this->extraFonts($config['sections']);
        if ($fonts !== []) {
            $config['extra_fonts'] = $fonts;
        }

        $visibleTypes = array_column($config['sections'], 'type');
        if ($musicSource === 'spotify' && array_intersect(['spotify', 'music-player'], $visibleTypes) === []) {
            $this->error('evento', null, 'musica_fuente', 'con Spotify, la playlist necesita dónde mostrarse; agrega la sección playlist o musica');
        }
        if (in_array('weather', $visibleTypes, true) && ! isset($e['clima_coordenadas']) && ($e['salon_ciudad'] ?? '') === '' && VenueLocator::fromMapsUrl($e['salon_maps'] ?? '') === null) {
            $this->error('clima', null, null, 'falta saber dónde es; agrega la ciudad del salón (por ejemplo "Pachuca, Hidalgo") o sus coordenadas');
        }

        return new BuildResult($config, $this->issues);
    }

    private function startsAt(string $value, string $timezone): ?CarbonImmutable
    {
        if ($value === '') {
            $this->error('evento', null, 'inicia', 'falta la fecha y hora (AAAA-MM-DD HH:MM)');

            return null;
        }
        $date = Normalizer::dateTime($value, $timezone);
        if ($date === null) {
            $this->error('evento', null, 'inicia', "'{$value}' no es una fecha válida (AAAA-MM-DD HH:MM)");
        }

        return $date;
    }

    private function deadline(string $value): ?string
    {
        if ($value === '') {
            return null;
        }
        $date = Normalizer::date($value);
        if ($date === null) {
            $this->error('evento', null, 'rsvp_limite', "'{$value}' no es una fecha válida (AAAA-MM-DD)");
        }

        return $date;
    }

    /**
     * "archivo" (MP3 de musica_audio) o "spotify" (la playlist suena al abrir el sobre). Sin
     * la clave: Spotify solo si no hay MP3 pero sí playlist.
     *
     * @param  array<string, string>  $e
     */
    private function musicSource(array $e, ?string $spotify): string
    {
        $key = Normalizer::key($e['musica_fuente'] ?? '');
        if ($key === '') {
            return ($e['musica_audio'] ?? '') === '' && $spotify !== null ? 'spotify' : 'file';
        }
        if (! isset(self::MUSIC_SOURCES[$key])) {
            $this->error('evento', null, 'musica_fuente', "'{$key}' no existe (usa archivo o spotify)");

            return 'file';
        }
        if (self::MUSIC_SOURCES[$key] === 'spotify' && $spotify === null) {
            $this->error('evento', null, 'musica_fuente', 'para usar Spotify agrega el enlace de la playlist (spotify)');

            return 'file';
        }

        return self::MUSIC_SOURCES[$key];
    }

    /**
     * Los nombres conocidos se traducen a los tokens del contrato; cualquier otro
     * ("lino") se vuelve un token propio (--color-lino) para el tema.
     *
     * @param  array<string, string>  $colors
     * @return array<string, string>
     */
    private function palette(array $colors): array
    {
        $out = [];
        foreach ($colors as $name => $color) {
            $color = trim($color);
            if ($color === '') {
                continue;
            }
            if (! Normalizer::isHex($color)) {
                $this->error('colores', null, $name, "'{$color}' no es un color hex (#RRGGBB)");

                continue;
            }
            $out[Normalizer::colorToken($name)] = strtoupper($color);
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $fonts
     * @return array<string, string>
     */
    private function fonts(array $fonts): array
    {
        $out = [];
        foreach ($fonts as $role => $font) {
            $font = trim($font);
            if ($font === '') {
                continue;
            }
            if (! preg_match(Normalizer::FONT_FAMILY, $font)) {
                $this->error('fuentes', null, $role, "'{$font}' no es el nombre de una fuente (solo letras, números y espacios)");

                continue;
            }
            $out[str_replace('_', '-', $role)] = $font;
        }

        return $out;
    }

    /**
     * Las secciones visibles, en el orden del diseño. Las ocultas también se revisan (para
     * que publicarlas después no sorprenda), pero no se publican.
     *
     * @param  array<string, string>  $media
     * @return list<array<string, mixed>>
     */
    private function sections(Design $design, array $media): array
    {
        $out = [];
        foreach ($design->sections as $section) {
            $entry = $this->section($section, $design->texts, $media);
            if ($section->visible()) {
                $out[] = $entry;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $globalTexts  bloque "textos"
     * @param  array<string, string>  $media
     * @return array<string, mixed>
     */
    private function section(DesignSection $section, array $globalTexts, array $media): array
    {
        $id = $section->id;
        $kind = $section->kind();
        $f = $section->fields;

        $effects = array_map(Normalizer::effect(...), Normalizer::splitList($f['efectos'] ?? ''));

        $overlay = trim($f['overlay'] ?? '');
        if ($overlay !== '' && (! is_numeric($overlay) || $overlay < 0 || $overlay > 1)) {
            $this->error($id, null, 'overlay', "'{$overlay}' debe ir de 0 a 1");
            $overlay = '';
        }

        $edge = $this->choice($f['orilla'] ?? '', Catalog::EDGES, $id, 'orilla');

        $desktop = Normalizer::key($f['escritorio'] ?? '');
        if ($desktop !== '' && ! isset(self::DESKTOP[$desktop])) {
            $this->error($id, null, 'escritorio', "'{$desktop}' no existe (usa completo o mitad)");
        }

        $fit = Normalizer::key($f['fondo_ajuste'] ?? '');
        if ($fit !== '' && ! isset(self::BACKGROUND_FIT[$fit])) {
            $this->error($id, null, 'fondo_ajuste', "'{$fit}' no existe (usa cubrir o mosaico)");
        }

        $background = array_filter([
            // La capa de imagen pone su imagen como fondo quieto (se queda mientras la página pasa).
            'image' => $this->media(($f['fondo'] ?? '') ?: ($kind === 'capa' ? ($f['imagen'] ?? '') : ''), $media),
            'fit' => self::BACKGROUND_FIT[$fit] ?? null,
            'color' => Normalizer::colorRef($f['color_fondo'] ?? ''),
            'overlay' => $overlay === '' ? null : (float) $overlay,
            'attachment' => Normalizer::yes($f['fijo'] ?? '') || $kind === 'capa' ? 'sticky' : null,
        ], fn ($v) => $v !== null && $v !== '');

        $entry = array_filter([
            'type' => Catalog::type($kind),
            'title' => trim($f['titulo'] ?? '') ?: null,
            'subtitle' => trim($f['subtitulo'] ?? '') ?: null,
            'text' => trim($f['texto'] ?? '') ?: null,
            'button' => trim($f['boton'] ?? '') ?: null,
            'variant' => trim($f['variante'] ?? '') ?: null,
            'background' => $background === [] ? null : $background,
            'effects' => $effects,
            'visible' => true,
            'desktop' => self::DESKTOP[$desktop] ?? null,
            'edge' => $edge,
        ], fn ($v) => $v !== null);

        $entry['key'] = $id;
        $colors = $this->sectionColors($id, $f);
        if ($colors !== []) {
            $entry['colors'] = $colors;
        }
        $decor = $this->decor($id, $kind, $f, $media);
        if ($decor !== []) {
            $entry['decor'] = $decor;
        }
        $styles = $this->textStyles($id, $kind, $f, $globalTexts);
        if ($styles !== []) {
            $entry['text_styles'] = $styles;
        }
        if (in_array($kind, ['foto', 'portada'], true) && isset($f['imagen'])) {
            $entry['image'] = $this->media($f['imagen'], $media);
        }

        $this->unknownKeys($id, $f, Catalog::fieldOrder($kind), section: true);

        return $entry;
    }

    /**
     * color_<nombre> (menos color_fondo, que es el fondo del panel): colores propios de la
     * sección que se encima a la paleta. Un hex, o el nombre de otro color de la paleta.
     *
     * @param  array<string, string>  $fields
     * @return array<string, string>
     */
    private function sectionColors(string $id, array $fields): array
    {
        $out = [];
        foreach ($fields as $key => $value) {
            if (! str_starts_with($key, 'color_') || $key === 'color_fondo') {
                continue;
            }
            $color = $this->colorValue($value, $id, null, $key);
            if ($color !== null) {
                $out[Normalizer::colorToken(substr($key, 6))] = $color;
            }
        }

        return $out;
    }

    /**
     * imagen_<adorno>: cambia (o con "ninguna", quita) un adorno del tema en esta sección.
     *
     * @param  array<string, string>  $fields
     * @param  array<string, string>  $media
     * @return array<string, ?string>
     */
    private function decor(string $id, string $kind, array $fields, array $media): array
    {
        $slots = Catalog::slots($kind);
        $out = [];
        foreach ($fields as $key => $value) {
            if (! str_starts_with($key, 'imagen_')) {
                continue;
            }
            $name = substr($key, 7);
            if (! isset($slots[$name])) {
                $this->warning($id, null, $key, "esta sección no tiene el adorno '{$name}'; se ignoró");

                continue;
            }
            $out[$slots[$name]['slot']] = Normalizer::key($value) === Catalog::NO_IMAGE ? null : $this->media($value, $media);
        }

        return $out;
    }

    /**
     * <bloque>_fuente, <bloque>_color y <bloque>_tamano de cada texto de la sección; los
     * comunes (título, subtítulo, texto, botón) toman lo del bloque "textos" si la sección
     * no trae los suyos.
     *
     * @param  array<string, string>  $fields
     * @param  array<string, string>  $globalTexts
     * @return array<string, array{font?: string, color?: string, size?: float}>
     */
    private function textStyles(string $id, string $kind, array $fields, array $globalTexts): array
    {
        $out = [];
        foreach (Catalog::textBlocks($kind) as $block => $def) {
            $style = [];
            foreach (Catalog::TEXT_PROPS as $prop => $propDef) {
                $key = "{$block}_{$prop}";
                $value = trim($fields[$key] ?? '');
                $where = $id;
                if ($value === '' && isset(Catalog::TEXTS[$block])) {
                    $value = trim($globalTexts[$key] ?? '');
                    $where = 'textos';
                }
                if ($value === '') {
                    continue;
                }
                $parsed = match ($prop) {
                    'fuente' => $this->fontValue($value, $where, $key),
                    'color' => $this->colorValue($value, $where, null, $key),
                    'tamano' => $this->sizeValue($value, $where, $key),
                };
                if ($parsed !== null) {
                    $style[$propDef['prop']] = $parsed;
                }
            }
            if ($style !== []) {
                $out[$def['block']] = $style;
            }
        }

        return $out;
    }

    private function fontValue(string $value, string $where, string $key): ?string
    {
        if (! preg_match(Normalizer::FONT_FAMILY, $value)) {
            $this->error($where, null, $key, "'{$value}' no es el nombre de una fuente (solo letras, números y espacios)");

            return null;
        }

        return $value;
    }

    private function colorValue(string $value, string $where, ?int $item, string $key): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (str_starts_with($value, '#')) {
            if (! Normalizer::isHex($value)) {
                $this->error($where, $item, $key, "'{$value}' no es un color hex (#RRGGBB)");

                return null;
            }

            return strtoupper($value);
        }
        if (! preg_match('/^[a-z0-9 _-]+$/i', $value)) {
            $this->error($where, $item, $key, "'{$value}' no es un color (usa #RRGGBB o un nombre de la paleta, como acento)");

            return null;
        }

        return Normalizer::colorToken($value);
    }

    private function sizeValue(string $value, string $where, string $key): ?float
    {
        $number = str_replace([',', '%'], ['.', ''], $value);
        if (! is_numeric($number) || $number < Catalog::TEXT_SIZE_MIN || $number > Catalog::TEXT_SIZE_MAX) {
            $this->error($where, null, $key, "'{$value}' debe ser un porcentaje de ".Catalog::TEXT_SIZE_MIN.' a '.Catalog::TEXT_SIZE_MAX);

            return null;
        }

        return round((float) $number / 100, 3);
    }

    /**
     * Familias que usan los estilos de texto, sin repetir, para cargarlas de Google Fonts.
     *
     * @param  list<array<string, mixed>>  $sections
     * @return list<string>
     */
    private function extraFonts(array $sections): array
    {
        $fonts = [];
        foreach ($sections as $section) {
            foreach ($section['text_styles'] ?? [] as $style) {
                if (isset($style['font'])) {
                    $fonts[$style['font']] = true;
                }
            }
        }

        return array_keys($fonts);
    }

    /**
     * @param  array<string, string>  $page
     * @param  array<string, string>  $media
     * @return array<string, string|bool>
     */
    private function page(array $page, array $media): array
    {
        $out = [];
        $image = $this->media($page['fondo'] ?? '', $media);
        if ($image !== null) {
            $out['image'] = $image;
        }
        if (trim($page['decoracion'] ?? '') !== '') {
            $out['decor'] = Normalizer::yes($page['decoracion']);
        }
        if (Normalizer::yes($page['difuminar'] ?? '')) {
            $out['blend'] = true;
        }
        // Detalles de diseño de toda la invitación; vacíos, los pone el tema.
        $choices = [
            'edge' => $this->choice($page['orilla'] ?? '', Catalog::EDGES, 'pagina', 'orilla'),
            'buttons' => $this->choice($page['botones'] ?? '', Catalog::BUTTONS, 'pagina', 'botones'),
            'corners' => $this->choice($page['esquinas'] ?? '', Catalog::CORNERS, 'pagina', 'esquinas'),
        ];
        foreach (['confetti' => 'confeti', 'metal' => 'metalico'] as $key => $field) {
            if (trim($page[$field] ?? '') !== '') {
                $out[$key] = Normalizer::yes($page[$field]);
            }
        }

        return [...$out, ...array_filter($choices, fn ($v) => $v !== null)];
    }

    /**
     * Un grupo por elemento ("Mis papás" + un nombre por línea); dos grupos con el mismo
     * rol se juntan, como en el Excel.
     *
     * @return list<array{role: string, names: list<string>}>
     */
    private function family(?DesignSection $section): array
    {
        $groups = [];
        foreach ($section?->items ?? [] as $item) {
            $role = trim($item['rol'] ?? '');
            $names = array_values(array_filter(array_map('trim', explode("\n", $item['nombres'] ?? '')), fn ($n) => $n !== ''));
            if ($role === '' || $names === []) {
                continue;
            }
            $groups[$role] = [...($groups[$role] ?? []), ...$names];
        }

        return array_map(fn ($role, $names) => ['role' => (string) $role, 'names' => $names], array_keys($groups), $groups);
    }

    /** @return list<array<string, string>> */
    private function itinerary(?DesignSection $section): array
    {
        $out = [];
        foreach ($section?->items ?? [] as $i => $item) {
            $label = trim($item['actividad'] ?? '');
            if ($label === '') {
                continue;
            }
            $out[] = array_filter([
                'time' => $this->time($item['hora'] ?? '', $section->id, $i + 1, 'hora'),
                'label' => $label,
                'icon' => trim($item['icono'] ?? '') ?: null,
            ], fn ($v) => $v !== null);
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $media
     * @return list<array<string, string|null>>
     */
    private function locations(?DesignSection $section, array $media): array
    {
        $out = [];
        foreach ($section?->items ?? [] as $i => $item) {
            $name = trim($item['lugar'] ?? '');
            if ($name === '') {
                continue;
            }
            $out[] = [
                'label' => trim($item['etiqueta'] ?? ''),
                'name' => $name,
                'time' => trim($item['hora'] ?? '') === '' ? null : $this->time($item['hora'], $section->id, $i + 1, 'hora'),
                'address' => trim($item['direccion'] ?? ''),
                'maps_url' => $this->webUrl($item['maps'] ?? '', $section->id, $i + 1, 'maps'),
                'photo' => $this->media($item['foto'] ?? '', $media),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $media
     * @return list<array<string, string|null>>
     */
    private function hotels(?DesignSection $section, array $media): array
    {
        $out = [];
        foreach ($section?->items ?? [] as $i => $item) {
            $name = trim($item['nombre'] ?? '');
            if ($name === '') {
                continue;
            }
            $out[] = [
                'name' => $name,
                'note' => trim($item['nota'] ?? ''),
                'address' => trim($item['direccion'] ?? ''),
                'maps_url' => $this->webUrl($item['maps'] ?? '', $section->id, $i + 1, 'maps'),
                'phone' => trim($item['telefono'] ?? ''),
                'photo' => $this->media($item['foto'] ?? '', $media),
            ];
        }

        return $out;
    }

    /**
     * Las fotos de la galería, en el orden de la lista; las filas sin foto se saltan. Las que
     * están en media/ llevan su ancho y alto: la galería las acomoda según su forma (sin
     * recortarlas) y les aparta el lugar antes de que carguen.
     *
     * @param  array<string, string>  $media
     * @return list<array{photo: string, caption: string, width?: int, height?: int}>
     */
    private function gallery(?DesignSection $section, array $media, string $slug): array
    {
        $events = app(EventRepository::class);
        $out = [];
        foreach ($section?->items ?? [] as $item) {
            $file = trim($item['foto'] ?? '');
            $photo = $this->media($file, $media);
            if ($photo === null) {
                continue;
            }
            $entry = ['photo' => $photo, 'caption' => trim($item['pie'] ?? '')];
            $path = isset($media[$file]) ? $events->mediaFile($slug, $file) : null;
            $size = $path === null ? false : @getimagesize($path);
            if ($size !== false && $size[0] > 0 && $size[1] > 0) {
                $entry['width'] = (int) $size[0];
                $entry['height'] = (int) $size[1];
            }
            $out[] = $entry;
        }

        return $out;
    }

    /**
     * Una opción de diseño (orilla, botones, esquinas): el nombre del CSV → su valor en el
     * contrato. Vacío: null (lo pone el tema). Uno que no existe se avisa y se ignora.
     *
     * @param  array<string, array{value: string, label: string}>  $options
     */
    private function choice(string $value, array $options, string $block, string $field): ?string
    {
        $key = Normalizer::key($value);
        if ($key === '') {
            return null;
        }
        if (! isset($options[$key])) {
            $this->warning($block, null, $field, "'{$key}' no existe (usa ".implode(', ', array_keys($options)).'); se ignoró');

            return null;
        }

        return $options[$key]['value'];
    }

    /** Tiendas conocidas de la mesa de regalos: clave → nombre que se ve. */
    private const GIFT_STORES = [
        'liverpool' => 'Liverpool',
        'amazon' => 'Amazon',
        'palacio' => 'El Palacio de Hierro',
        'sears' => 'Sears',
        'costco' => 'Costco',
        'otra' => '',
    ];

    /**
     * Mesa de regalos: las tiendas (con su enlace y su número de evento) y la lluvia de
     * sobres. Los datos bancarios van completos; EventController (el enlace general) los
     * quita cuando la sección pide "solo con enlace" (es lo normal), ver GiftPrivacy.
     *
     * @return array{stores: list<array<string, string>>, envelope: ?array<string, mixed>}|null
     */
    private function gifts(?DesignSection $section): ?array
    {
        if ($section === null) {
            return null;
        }
        $stores = [];
        foreach ($section->items as $i => $item) {
            $key = Normalizer::key($item['tienda'] ?? '');
            if ($key !== '' && ! isset(self::GIFT_STORES[$key])) {
                $this->warning($section->id, $i + 1, 'tienda', "'{$key}' no es una tienda de la lista; se tomó como otra");
                $key = 'otra';
            }
            $name = trim($item['nombre'] ?? '') ?: (self::GIFT_STORES[$key] ?? '');
            $url = $this->webUrl($item['enlace'] ?? '', $section->id, $i + 1, 'enlace');
            $number = trim($item['numero_evento'] ?? '');
            if ($name === '' && $url === '' && $number === '') {
                continue;
            }
            $stores[] = [
                'store' => $key === '' ? 'other' : ($key === 'otra' ? 'other' : $key),
                'name' => $name,
                'note' => trim($item['nota'] ?? ''),
                'url' => $url,
                'event_number' => $number,
            ];
        }

        $envelope = $this->envelope($section);

        return ['stores' => $stores, 'envelope' => $envelope];
    }

    /**
     * La lluvia de sobres de una sección (la propia "lluvia_sobres" o, en invitaciones
     * anteriores, la de la mesa de regalos); null si no trae nada que mostrar.
     *
     * @return array<string, mixed>|null
     */
    private function envelope(DesignSection $section): ?array
    {
        $f = $section->fields;
        $account = preg_replace('/\s+/', '', trim($f['cuenta'] ?? '')) ?? '';
        $title = $section->kind() === 'lluvia_sobres' ? 'titulo' : 'sobres_titulo';
        $text = $section->kind() === 'lluvia_sobres' ? 'texto' : 'sobres_texto';
        $envelope = [
            'title' => trim($f[$title] ?? ''),
            'text' => trim($f[$text] ?? ''),
            'bank' => trim($f['banco'] ?? ''),
            'account' => $account,
            'holder' => trim($f['titular'] ?? ''),
            'box' => Normalizer::yes($f['sobre_fisico'] ?? ''),
            'hidden' => false,
            // Lo normal: los datos bancarios solo en las invitaciones personales.
            'private' => trim($f['solo_con_enlace'] ?? '') === '' || Normalizer::yes($f['solo_con_enlace']),
        ];

        return $envelope['text'] !== '' || $envelope['account'] !== '' || $envelope['box'] ? $envelope : null;
    }

    /** Un enlace va en un botón: solo http(s). Cualquier otra cosa se reporta y se quita. */
    private function webUrl(string $value, string $block, ?int $item, string $field): string
    {
        $value = trim($value);
        if ($value !== '' && ! Normalizer::isWebUrl($value)) {
            $this->error($block, $item, $field, "debe ser un enlace (https://…), no '{$value}'");

            return '';
        }

        return $value;
    }

    /** "17:00", "5:00 pm" → "17:00"; si no es una hora, se reporta y queda vacía. */
    private function time(string $value, string $block, int $item, string $field): string
    {
        $time = Normalizer::time($value);
        if ($time === null) {
            $this->error($block, $item, $field, "hora '{$value}' no válida (usa 17:00 o 5:00 pm)");

            return '';
        }

        return $time;
    }

    /**
     * Un archivo que existe en media/ del evento se vuelve su URL; una URL completa pasa
     * tal cual; cualquier otro nombre se deja para que la web lo busque en los assets del tema.
     *
     * @param  array<string, string>  $media
     */
    private function media(string $value, array $media): ?string
    {
        $value = trim($value);

        return match (true) {
            $value === '' => null,
            isset($media[$value]) => $media[$value],
            default => $value,
        };
    }

    /**
     * Avisa (sin perder nada) de los campos que esta versión no conoce.
     *
     * @param  array<string, string>  $values
     * @param  list<string>  $known
     */
    private function unknownKeys(string $block, array $values, array $known, bool $section = false): void
    {
        foreach (array_keys($values) as $key) {
            // En una sección, color_<propio> es válido con cualquier nombre e imagen_<adorno>
            // ya se revisó en decor().
            $patterned = $section && (str_starts_with($key, 'color_') || str_starts_with($key, 'imagen_'));
            if (! in_array($key, $known, true) && ! $patterned) {
                $this->warning($block, null, $key, 'campo desconocido: se guarda, pero la invitación no lo usa');
            }
        }
    }

    private function error(string $block, ?int $item, ?string $field, string $text): void
    {
        $this->issue('error', $block, $item, $field, $text);
    }

    private function warning(string $block, ?int $item, ?string $field, string $text): void
    {
        $this->issue('warning', $block, $item, $field, $text);
    }

    private function issue(string $level, string $block, ?int $item, ?string $field, string $text): void
    {
        $where = $block.($item !== null ? ", elemento {$item}" : '').($field !== null ? " → {$field}" : '');
        $this->issues[] = ['level' => $level, 'block' => $block, 'item' => $item, 'field' => $field, 'message' => "{$where}: {$text}"];
    }
}
