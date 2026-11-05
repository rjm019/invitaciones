<?php

namespace App\Services\Design;

use App\Services\Album\AlbumService;
use App\Services\Layout\EventRepository;
use App\Services\Media\ImageOptimizer;
use App\Services\Media\Mp3Duration;
use App\Services\Media\SocialEmbed;
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

    /** Límites de las listas nuevas (vestimenta, historia, información). */
    private const MAX_RESTRICTIONS = 6;

    private const MAX_REFERENCES = 4;

    private const MAX_MOMENTS = 8;

    private const MAX_FAQ = 12;

    private const DESKTOP = ['completo' => 'full', 'full' => 'full', 'mitad' => 'half', 'half' => 'half'];

    private const MAX_MUSIC_START = 36000;

    public const DEFAULT_THEME = 'jardin-azul';

    public const MIN_PANEL_PASSWORD = 8;

    /** @var list<array{level: string, block: string, item: ?int, field: ?string, message: string}> */
    private array $issues = [];

    /** El evento que se está armando (las fotos de la galería se miden en su media/). */
    private string $slug = '';

    /** Zona y arranque del evento que se está armando (la trivia cierra por defecto al empezar). */
    private string $timezone = 'America/Mexico_City';

    private ?CarbonImmutable $startsAt = null;

    /** ¿Es una muestra? (el álbum enseña fotos de ejemplo y no guarda nada) */
    private bool $demo = false;

    /** Id de la primera sección de ubicación: sus lugares van también en `locations`. */
    private ?string $firstLocationId = null;

    /** Acomodo de los lugares de una ubicación: valor del CSV → valor del contrato. */
    private const LOCATION_LAYOUTS = [
        'lado_a_lado' => ['value' => 'side'],
        'uno_debajo_del_otro' => ['value' => 'stack'],
    ];

    /** Tipo de lugar: etiqueta e ícono por defecto. */
    private const LOCATION_KINDS = [
        'ceremonia_religiosa' => ['value' => 'religious', 'label' => 'Ceremonia religiosa', 'icon' => 'church'],
        'ceremonia_civil' => ['value' => 'civil', 'label' => 'Ceremonia civil', 'icon' => 'ring'],
        'recepcion' => ['value' => 'reception', 'label' => 'Recepción', 'icon' => 'champagne-glasses'],
        'ceremonia_y_recepcion' => ['value' => 'both', 'label' => 'Ceremonia y recepción', 'icon' => 'heart'],
        'otro' => ['value' => 'other', 'label' => '', 'icon' => 'location-dot'],
    ];

    /**
     * @param  array<string, string>  $media  archivo en media/ → URL pública
     * @param  array<string, string>  $settings  ajustes.csv (rsvp_limite, publicado, plantilla…)
     */
    public function build(string $slug, Design $design, array $media, array $settings = [], bool $lenient = false, ?CarbonImmutable $now = null): BuildResult
    {
        $this->issues = [];
        $this->slug = $slug;
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
        $this->timezone = $timezone;
        $this->startsAt = $startsAt;
        $this->demo = Normalizer::yes($settings['demo'] ?? 'NO');
        $this->firstLocationId = null;
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
        $musicStart = $musicSource === 'file' ? $this->musicStart($e) : 0;
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
                'monogram' => mb_substr($e['monograma'] ?? '', 0, 8),
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
            'envelope' => ($rain = $design->first('lluvia_sobres')) ? $this->envelope($rain) : null,
            'gifts' => $this->gifts($design->first('mesa_regalos')),
            'assets' => (object) $media,
        ];

        // Sin segundo de inicio, el config queda idéntico al de antes.
        if ($musicStart > 0) {
            $config['music']['start'] = $musicStart;
        }

        // Sin mesa de regalos ni lluvia de sobres, la llave no va (como en el formato anterior).
        if ($config['gifts'] === null) {
            unset($config['gifts']);
        }
        if ($config['envelope'] === null) {
            unset($config['envelope']);
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
     * Segundo en que empieza el MP3 (0 = desde el principio). Entero >= 0 y, si se puede
     * leer la duración del archivo, menor que ella; si no se puede, solo se revisa el rango.
     *
     * @param  array<string, string>  $e
     */
    private function musicStart(array $e): int
    {
        $raw = $e['musica_inicio'] ?? '';
        if ($raw === '') {
            return 0;
        }
        if (! preg_match('/^\d+$/', $raw) || (int) $raw > self::MAX_MUSIC_START) {
            $this->error('evento', null, 'musica_inicio', 'debe ser un número entero de segundos, de 0 a '.self::MAX_MUSIC_START);

            return 0;
        }
        $start = (int) $raw;
        $file = trim($e['musica_audio'] ?? '');
        $path = $start > 0 && $file !== '' ? app(EventRepository::class)->mediaFile($this->slug, $file) : null;
        $duration = $path !== null ? Mp3Duration::seconds($path) : null;
        if ($duration !== null && $start >= floor($duration)) {
            $this->error('evento', null, 'musica_inicio', 'la canción dura '.self::clock($duration).'; el inicio debe ser menor.');

            return 0;
        }

        return $start;
    }

    private static function clock(float $seconds): string
    {
        $s = (int) floor($seconds);

        return intdiv($s, 60).':'.str_pad((string) ($s % 60), 2, '0', STR_PAD_LEFT);
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
            'image' => $this->media($f['fondo'] ?? '', $media),
            'fit' => self::BACKGROUND_FIT[$fit] ?? null,
            'color' => Normalizer::colorRef($f['color_fondo'] ?? ''),
            'overlay' => $overlay === '' ? null : (float) $overlay,
            'attachment' => Normalizer::yes($f['fijo'] ?? '') ? 'sticky' : null,
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
            'silhouette' => $this->choice($f['silueta'] ?? '', Catalog::SILHOUETTES, $id, 'silueta'),
            'fillet' => $this->choice($f['filete'] ?? '', Catalog::FILLETS, $id, 'filete'),
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
        $sheet = $this->sheet($id, $f);
        if ($sheet !== []) {
            $entry['sheet'] = $sheet;
        }
        $pull = $this->pull($id, $f);
        if ($pull !== []) {
            $entry['pull'] = $pull;
        }
        $styles = $this->textStyles($id, $kind, $f, $globalTexts);
        if ($styles !== []) {
            $entry['text_styles'] = $styles;
        }
        $canvas = $this->canvas($section, $media);
        if ($canvas !== []) {
            $entry['canvas'] = $canvas;
        }
        if (in_array($kind, ['foto', 'portada'], true) && isset($f['imagen'])) {
            $entry['image'] = $this->media($f['imagen'], $media);
        }
        // Galería: cada una con sus fotos (puede haber varias repartidas por la invitación).
        if ($kind === 'galeria') {
            $entry['photos'] = $this->gallery($section, $media);
        }
        // Capa de imagen: su foto y las de "Más capas", cada una una capa quieta (SectionShell).
        if ($kind === 'capa') {
            $layers = array_values(array_filter(array_map(
                fn (string $file) => $this->media($file, $media),
                [$f['imagen'] ?? '', ...array_column($section->items, 'foto')],
            )));
            if ($layers !== []) {
                $entry['layers'] = $layers;
            }
            if (Normalizer::yes($f['sin_oscurecer'] ?? 'NO')) {
                $entry['plain'] = true;
            }
        }

        // Ubicación (repetible): cada sección con sus lugares (la primera además va en `locations`).
        if ($kind === 'ubicacion') {
            if ($this->firstLocationId === null) {
                $this->firstLocationId = $id;
            } elseif ($this->firstLocationId !== $id) {
                $entry['places'] = $this->locations($section, $media);
            }
            if (Normalizer::yes($f['calendario'] ?? '')) {
                $entry['calendar'] = true;
            }
            $layout = $this->choice($f['acomodo'] ?? '', self::LOCATION_LAYOUTS, $id, 'acomodo');
            if ($layout !== null) {
                $entry['layout'] = $layout;
            }
        }
        // Vestimenta: el enlace del botón de ejemplos, solo si es https (si no, se reporta y se quita).
        if ($kind === 'vestimenta') {
            $link = $this->webUrl($f['enlace'] ?? '', $id, null, 'enlace');
            if ($link !== '') {
                $entry['link'] = $link;
            }
            $avoid = $this->dressRestrictions($section);
            if ($avoid !== []) {
                $entry['restrictions'] = $avoid;
            }
            $references = $this->dressReferences($section, $media);
            if ($references !== []) {
                $entry['references'] = $references;
            }
        }
        // Historia: sus momentos (año, título, texto y foto opcional).
        if ($kind === 'historia') {
            $entry['moments'] = $this->story($section, $media);
        }
        // Información adicional: preguntas y respuestas del acordeón.
        if ($kind === 'informacion') {
            $entry['items'] = $this->faq($section);
        }
        // Dedicatorias: el muro con las recibidas (apagado salvo que se pida).
        if ($kind === 'dedicatoria' && Normalizer::yes($f['muro'] ?? 'NO')) {
            $entry['wall'] = true;
        }
        // Itinerario en vivo: el día del evento resalta el momento actual (lo calcula la web).
        if ($kind === 'itinerario' && Normalizer::yes($f['en_vivo'] ?? '')) {
            $entry['live'] = true;
        }

        // Trivia: las preguntas sin la respuesta correcta (esa solo la conoce el servidor).
        if ($kind === 'trivia') {
            $entry['questions'] = $this->trivia($section);
            $closes = TriviaQuiz::closesAt($section, $this->timezone) ?? $this->startsAt;
            if ($closes !== null) {
                $entry['closes_at'] = $closes->toIso8601String();
            }
        }

        // Álbum de los invitados: los días que sigue abierto (acotado en el servidor) y las fotos
        // elegidas; en una muestra, las de ejemplo de la lista (nada se guarda).
        if ($kind === 'album') {
            $days = $f['album_dias'] ?? '';
            if (trim($days) !== '' && (! is_numeric($days) || (int) $days < AlbumService::MIN_DAYS || (int) $days > AlbumService::MAX_DAYS)) {
                $this->warning($id, null, 'album_dias', "'{$days}' va de ".AlbumService::MIN_DAYS.' a '.AlbumService::MAX_DAYS.' (se usa '.AlbumService::clampDays($days).')');
            }
            $entry['days'] = AlbumService::clampDays($days);
            $photos = $this->demo ? $this->gallery($section, $media) : app(AlbumService::class)->publicPhotos($this->slug);
            if ($photos !== []) {
                $entry['photos'] = $photos;
            }
        }

        // Video y publicación de redes: solo enlaces ya validados (SocialEmbed) o archivos de la biblioteca.
        if ($kind === 'video') {
            $video = $this->video($section, $media);
            if ($video !== null) {
                $entry['video'] = $video;
            }
        }
        if ($kind === 'publicacion') {
            $post = $this->socialPost($section, $media);
            if ($post !== null) {
                $entry['post'] = $post;
            }
        }

        $this->unknownKeys($id, $f, Catalog::fieldOrder($kind), section: true);

        return $entry;
    }

    /**
     * El video de una sección: YouTube, Instagram o Facebook (enlace validado) o un MP4 de la
     * biblioteca. Un enlace que no sirve se reporta y la sección queda sin video (se oculta).
     *
     * @param  array<string, string>  $media
     * @return array<string, mixed>|null
     */
    private function video(DesignSection $section, array $media): ?array
    {
        $id = $section->id;
        $f = $section->fields;
        $link = trim($f['enlace'] ?? '');
        $file = trim($f['archivo'] ?? '');
        $source = Normalizer::key($f['fuente'] ?? '');
        if (str_starts_with($source, 'archivo')) {
            $source = 'archivo';
        }
        if ($source === '') {
            $source = $link !== '' ? (SocialEmbed::parse($link)['network'] ?? 'youtube') : ($file !== '' ? 'archivo' : '');
        } elseif (! in_array($source, ['archivo', ...SocialEmbed::NETWORKS], true)) {
            $this->error($id, null, 'fuente', "'{$source}' no existe (usa youtube, archivo, instagram o facebook)");

            return null;
        }
        if ($source === '') {
            return null;
        }

        $video = ['source' => $source === 'archivo' ? 'file' : $source, 'format' => $this->videoFormat($f['formato'] ?? '', $id)];
        if ($source === 'archivo') {
            if ($file === '') {
                return null;
            }
            if (! isset($media[$file]) || ! preg_match('/\.mp4$/i', $file)) {
                $this->error($id, null, 'archivo', "'{$file}' no es un MP4 de la biblioteca de archivos");

                return null;
            }
            $video['file'] = $media[$file];
        } else {
            if ($link === '') {
                return null;
            }
            $parsed = SocialEmbed::parse($link, $source);
            if ($parsed === null) {
                $this->error($id, null, 'enlace', 'no es un enlace https de '.SocialEmbed::networkName($source)." que se pueda mostrar: '{$link}'");

                return null;
            }
            $video += array_filter($parsed, fn ($v) => $v !== null);
        }
        $poster = $this->poster($f['poster'] ?? '', $media, $id);
        if ($poster !== null) {
            $video['poster'] = $poster;
        }

        return $video;
    }

    /**
     * La publicación de una red: `red` + `enlace` validados.
     *
     * @param  array<string, string>  $media
     * @return array<string, mixed>|null
     */
    private function socialPost(DesignSection $section, array $media): ?array
    {
        $id = $section->id;
        $f = $section->fields;
        $link = trim($f['enlace'] ?? '');
        $network = Normalizer::key($f['red'] ?? '');
        if ($network !== '' && ! in_array($network, SocialEmbed::NETWORKS, true)) {
            $this->error($id, null, 'red', "'{$network}' no existe (usa instagram, facebook o youtube)");

            return null;
        }
        if ($link === '') {
            return null;
        }
        $parsed = SocialEmbed::parse($link, $network === '' ? null : $network);
        if ($parsed === null) {
            $this->error($id, null, 'enlace', 'no es un enlace https de '.($network === '' ? 'YouTube, Instagram o Facebook' : SocialEmbed::networkName($network))." que se pueda mostrar: '{$link}'");

            return null;
        }
        $post = array_filter($parsed, fn ($v) => $v !== null);
        $poster = $this->poster($f['poster'] ?? '', $media, $id);
        if ($poster !== null) {
            $post['poster'] = $poster;
        }

        return $post;
    }

    /** `horizontal` (16:9) o `vertical` (9:16); lo demás se avisa y queda horizontal. */
    private function videoFormat(string $value, string $block): string
    {
        $key = Normalizer::key($value);
        if ($key !== '' && ! in_array($key, ['horizontal', 'vertical'], true)) {
            $this->warning($block, null, 'formato', "'{$key}' no existe (usa horizontal o vertical); se usó horizontal");
        }

        return $key === 'vertical' ? 'vertical' : 'horizontal';
    }

    /**
     * La portada: solo un archivo de la biblioteca del evento. Una URL de afuera (o un archivo
     * que no existe) se avisa y se ignora: la fachada no puede pedir nada a terceros.
     *
     * @param  array<string, string>  $media
     */
    private function poster(string $value, array $media, string $block): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (! isset($media[$value])) {
            $this->warning($block, null, 'poster', "'{$value}' no está en la biblioteca de archivos; se ignoró la portada");

            return null;
        }

        return $media[$value];
    }

    /**
     * Lo que se pide evitar en la vestimenta: una línea cada uno, hasta MAX_RESTRICTIONS.
     *
     * @return list<string>
     */
    private function dressRestrictions(DesignSection $section): array
    {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $section->field('restricciones') ?? '')), fn ($l) => $l !== ''));
        if (count($lines) > self::MAX_RESTRICTIONS) {
            $this->error($section->id, null, 'restricciones', 'usa hasta '.self::MAX_RESTRICTIONS.' líneas');
            $lines = array_slice($lines, 0, self::MAX_RESTRICTIONS);
        }

        return $lines;
    }

    /**
     * Fotos de referencia de la vestimenta (hasta MAX_REFERENCES): foto y pie opcional.
     *
     * @param  array<string, string>  $media
     * @return list<array{photo: string, caption: string}>
     */
    private function dressReferences(DesignSection $section, array $media): array
    {
        $out = [];
        foreach ($section->items as $i => $item) {
            $photo = $this->media($item['foto'] ?? '', $media);
            if ($photo === null) {
                continue;
            }
            if (count($out) >= self::MAX_REFERENCES) {
                $this->error($section->id, $i + 1, null, 'las referencias admiten hasta '.self::MAX_REFERENCES.' fotos');

                continue;
            }
            $out[] = ['photo' => $photo, 'caption' => trim($item['pie'] ?? '')];
        }

        return $out;
    }

    /**
     * Los momentos de una historia (hasta MAX_MOMENTS): título obligatorio.
     *
     * @param  array<string, string>  $media
     * @return list<array<string, string>>
     */
    private function story(DesignSection $section, array $media): array
    {
        $out = [];
        foreach ($section->items as $i => $item) {
            $title = trim($item['titulo'] ?? '');
            $year = trim($item['anio'] ?? '');
            $text = trim($item['texto'] ?? '');
            $photo = $this->media($item['foto'] ?? '', $media);
            if ($title === '' && $year === '' && $text === '' && $photo === null) {
                continue;
            }
            $n = $i + 1;
            if (count($out) >= self::MAX_MOMENTS) {
                $this->error($section->id, $n, null, 'la historia admite hasta '.self::MAX_MOMENTS.' momentos');

                continue;
            }
            if ($title === '') {
                $this->error($section->id, $n, 'titulo', 'escribe el título del momento');
            }
            $out[] = array_filter(['year' => $year, 'title' => $title, 'text' => $text, 'photo' => $photo], fn ($v) => $v !== null && $v !== '');
        }

        return $out;
    }

    /**
     * Preguntas y respuestas de la información adicional (hasta MAX_FAQ).
     *
     * @return list<array{question: string, answer: string}>
     */
    private function faq(DesignSection $section): array
    {
        $out = [];
        foreach ($section->items as $i => $item) {
            $question = trim($item['pregunta'] ?? '');
            $answer = trim($item['respuesta'] ?? '');
            if ($question === '' && $answer === '') {
                continue;
            }
            $n = $i + 1;
            if (count($out) >= self::MAX_FAQ) {
                $this->error($section->id, $n, null, 'la información admite hasta '.self::MAX_FAQ.' preguntas');

                continue;
            }
            if ($question === '') {
                $this->error($section->id, $n, 'pregunta', 'escribe la pregunta');
            }
            if ($answer === '') {
                $this->error($section->id, $n, 'respuesta', 'escribe la respuesta');
            }
            $out[] = ['question' => $question, 'answer' => $answer];
        }

        return $out;
    }

    /**
     * Las preguntas de la trivia para el config público: texto y opciones, NUNCA `correcta`.
     * Cada fila con problemas se reporta (y no entra).
     *
     * @return list<array{text: string, options: list<string>}>
     */
    private function trivia(DesignSection $section): array
    {
        $id = $section->id;
        $filled = 0;
        foreach ($section->items as $i => $item) {
            $text = trim($item['pregunta'] ?? '');
            $options = TriviaQuiz::options($item);
            if ($text === '' && $options === [] && trim($item['correcta'] ?? '') === '') {
                continue;
            }
            $n = $i + 1;
            if (++$filled > TriviaQuiz::MAX_QUESTIONS) {
                $this->error($id, $n, null, 'la trivia admite hasta '.TriviaQuiz::MAX_QUESTIONS.' preguntas');

                continue;
            }
            if ($text === '') {
                $this->error($id, $n, 'pregunta', 'escribe la pregunta');
            }
            if (count($options) < TriviaQuiz::MIN_OPTIONS) {
                $this->error($id, $n, 'opcion_2', 'cada pregunta necesita al menos 2 opciones');
            } elseif (in_array('', $options, true)) {
                $this->error($id, $n, 'opcion_1', 'llena las opciones en orden, sin dejar huecos');
            }
            $correct = TriviaQuiz::correct($item);
            if ($correct === null || $correct > max(1, count($options))) {
                $this->error($id, $n, 'correcta', 'elige cuál opción es la correcta (el número de la opción)');
            }
        }
        $closes = $section->field('cierra');
        if ($closes !== null && TriviaQuiz::closesAt($section, $this->timezone) === null) {
            $this->error($id, null, 'cierra', "'{$closes}' no es una fecha válida (AAAA-MM-DD HH:MM)");
        }

        return array_map(
            fn (array $q) => ['text' => $q['text'], 'options' => $q['options']],
            TriviaQuiz::questions($section),
        );
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

    /** Rangos del lienzo: campo → [mínimo, máximo, clave en el config]. x, y, ancho y alto van en % del ancho de la sección. */
    private const CANVAS_RANGES = [
        'x' => [-100, 200, 'x'],
        'y' => [-200, 2000, 'y'],
        'ancho' => [1, 300, 'width'],
        'alto' => [1, 600, 'height'],
        'rotacion' => [-360, 360, 'rotation'],
        'escala' => [0.1, 5, 'scale'],
        'escala_y' => [0.1, 5, 'scale_y'],
        'opacidad' => [0, 100, 'opacity'],
    ];

    private const CANVAS_SHAPES = ['linea' => 'line', 'rectangulo' => 'rectangle', 'circulo' => 'circle'];

    private const CANVAS_KINDS = ['texto' => 'text', 'imagen' => 'image', 'forma' => 'shape'];

    private const CANVAS_ALIGN = ['izquierda' => 'left', 'centro' => 'center', 'derecha' => 'right'];

    /**
     * El lienzo de una sección: elementos que ya existen (`objetivo`: texto:<bloque>:<n> o
     * imagen:<n>) o libres (`tipo`: texto, imagen o forma), cada uno con su posición. Solo viaja
     * lo que se escribió; sin elementos no hay llave. Los `e_*` (escritorio) van en `desktop`.
     *
     * @param  array<string, string>  $media
     * @return list<array<string, mixed>>
     */
    private function canvas(DesignSection $section, array $media): array
    {
        $id = $section->id;
        $out = [];
        foreach ($section->canvas as $n => $element) {
            $name = 'lienzo-'.($n + 1);
            $where = fn (string $field) => "{$name} → {$field}";
            $entry = ['id' => $name];

            $target = trim($element['objetivo'] ?? '');
            if ($target !== '') {
                if (! preg_match('/^(texto:[a-z0-9_]{1,40}:\d{1,3}|imagen:\d{1,3})$/', $target)) {
                    $this->error($id, null, $where('objetivo'), "'{$target}' debe ser texto:<bloque>:<n> o imagen:<n>");

                    continue;
                }
                $entry['target'] = $target;
            } else {
                $type = Normalizer::key($element['tipo'] ?? '');
                if (! isset(self::CANVAS_KINDS[$type])) {
                    $this->error($id, null, $where('tipo'), 'falta el objetivo o el tipo (usa texto, imagen o forma)');

                    continue;
                }
                $entry['kind'] = self::CANVAS_KINDS[$type];
                $entry += $this->canvasFree($id, $name, $type, $element, $media);
                if (! isset($entry[$entry['kind']])) {
                    continue;
                }
            }

            foreach (self::CANVAS_RANGES as $field => [$min, $max, $key]) {
                $value = $this->canvasNumber($id, $where($field), $element[$field] ?? '', $min, $max);
                if ($value !== null) {
                    $entry[$key] = $value;
                }
            }
            foreach (['voltear_h' => 'flip_h', 'voltear_v' => 'flip_v', 'bloqueado' => 'locked', 'oculto' => 'hidden', 'eliminado' => 'removed'] as $field => $key) {
                $flag = $this->canvasFlag($id, $where($field), $element[$field] ?? '');
                if ($flag !== null) {
                    $entry[$key] = $flag;
                }
            }
            $layer = trim($element['capa'] ?? '');
            if ($layer !== '') {
                if (! preg_match('/^-?\d{1,3}$/', $layer)) {
                    $this->error($id, null, $where('capa'), "'{$layer}' debe ser un número entero (de -999 a 999)");
                } else {
                    $entry['layer'] = (int) $layer;
                }
            }

            $desktop = [];
            foreach (self::CANVAS_RANGES as $field => [$min, $max, $key]) {
                $value = $this->canvasNumber($id, $where("e_{$field}"), $element["e_{$field}"] ?? '', $min, $max);
                if ($value !== null) {
                    $desktop[$key] = $value;
                }
            }
            $hidden = $this->canvasFlag($id, $where('e_oculto'), $element['e_oculto'] ?? '');
            if ($hidden !== null) {
                $desktop['hidden'] = $hidden;
            }
            $removed = $this->canvasFlag($id, $where('e_eliminado'), $element['e_eliminado'] ?? '');
            if ($removed !== null) {
                $desktop['removed'] = $removed;
            }
            if ($desktop !== []) {
                $entry['desktop'] = $desktop;
            }

            $this->unknownKeys($id.', '.$name, $element, Catalog::CANVAS_FIELDS);
            $out[] = $entry;
        }

        return $out;
    }

    /**
     * Lo propio de un elemento libre: su texto, imagen o forma y su aspecto.
     *
     * @param  array<string, string>  $element
     * @param  array<string, string>  $media
     * @return array<string, mixed>
     */
    private function canvasFree(string $id, string $name, string $type, array $element, array $media): array
    {
        $where = fn (string $field) => "{$name} → {$field}";
        $out = [];
        if ($type === 'texto') {
            $text = trim($element['texto'] ?? '');
            if ($text === '') {
                $this->error($id, null, $where('texto'), 'falta el texto');
            } else {
                $out['text'] = $text;
            }
            $font = trim($element['letra'] ?? '');
            if ($font !== '') {
                $font = $this->fontValue($font, $id, $where('letra'));
                if ($font !== null) {
                    $out['font'] = $font;
                }
            }
            $size = $this->canvasNumber($id, $where('tamano'), $element['tamano'] ?? '', 0.5, 40);
            if ($size !== null) {
                $out['size'] = $size;
            }
            $align = Normalizer::key($element['alineacion'] ?? '');
            if ($align !== '') {
                if (isset(self::CANVAS_ALIGN[$align])) {
                    $out['align'] = self::CANVAS_ALIGN[$align];
                } else {
                    $this->error($id, null, $where('alineacion'), "'{$align}' no existe (usa izquierda, centro o derecha)");
                }
            }
        } elseif ($type === 'imagen') {
            $file = trim($element['imagen'] ?? '');
            if ($file === '') {
                $this->error($id, null, $where('imagen'), 'falta el archivo de la imagen');
            } else {
                $out['image'] = $this->media($file, $media);
            }
            $radius = $this->canvasNumber($id, $where('radio'), $element['radio'] ?? '', 0, 50);
            if ($radius !== null) {
                $out['radius'] = $radius;
            }
        } else {
            $shape = Normalizer::key($element['forma'] ?? '');
            if (! isset(self::CANVAS_SHAPES[$shape])) {
                $this->error($id, null, $where('forma'), "'{$shape}' no existe (usa linea, rectangulo o circulo)");
            } else {
                $out['shape'] = self::CANVAS_SHAPES[$shape];
            }
            $radius = $this->canvasNumber($id, $where('radio'), $element['radio'] ?? '', 0, 50);
            if ($radius !== null) {
                $out['radius'] = $radius;
            }
        }
        $color = $this->colorValue($element['color'] ?? '', $id, null, $where('color'));
        if ($color !== null) {
            $out['color'] = $color;
        }
        if ($type !== 'texto') {
            $border = $this->canvasNumber($id, $where('borde'), $element['borde'] ?? '', 0, 40);
            if ($border !== null) {
                $out['border'] = $border;
            }
        }

        return $out;
    }

    private function canvasNumber(string $id, string $field, string $value, float|int $min, float|int $max): ?float
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $number = str_replace(',', '.', $value);
        if (! is_numeric($number) || $number < $min || $number > $max) {
            $this->error($id, null, $field, "'{$value}' debe ir de {$min} a {$max}");

            return null;
        }

        return (float) $number;
    }

    private function canvasFlag(string $id, string $field, string $value): ?bool
    {
        $key = Normalizer::key($value);
        if ($key === '') {
            return null;
        }
        if (in_array($key, ['no', 'n', 'false', '0'], true)) {
            return false;
        }
        if (! Normalizer::yes($value)) {
            $this->error($id, null, $field, "'{$value}' debe ser SI o NO");

            return null;
        }

        return true;
    }

    /**
     * Zona segura de la lámina de papel (variante `lamina`): zona_arriba/derecha/abajo/izquierda
     * en % de la imagen (0 a 45) y proporcion (ancho / alto). Solo viaja lo que se escribió.
     *
     * @param  array<string, string>  $fields
     * @return array<string, float>
     */
    private function sheet(string $id, array $fields): array
    {
        $out = [];
        foreach (['arriba' => 'top', 'derecha' => 'right', 'abajo' => 'bottom', 'izquierda' => 'left'] as $name => $side) {
            $value = trim($fields['zona_'.$name] ?? '');
            if ($value === '') {
                continue;
            }
            if (! is_numeric($value) || $value < 0 || $value > 45) {
                $this->error($id, null, 'zona_'.$name, "'{$value}' debe ir de 0 a 45");

                continue;
            }
            $out[$side] = (float) $value;
        }
        $ratio = trim($fields['proporcion'] ?? '');
        if ($ratio !== '') {
            if (! is_numeric($ratio) || $ratio <= 0 || $ratio > 10) {
                $this->error($id, null, 'proporcion', "'{$ratio}' debe ser ancho entre alto (por ejemplo 0.72)");
            } else {
                $out['aspect'] = (float) $ratio;
            }
        }

        return $out;
    }

    /**
     * Sobre que se abre (variante `sobre-imagen`): dónde queda la hoja dentro del sobre cerrado,
     * en % de la imagen (hoja_x, hoja_y = centro; hoja_ancho) y su giro en grados (hoja_giro).
     *
     * @param  array<string, string>  $fields
     * @return array<string, float>
     */
    private function pull(string $id, array $fields): array
    {
        $out = [];
        $ranges = ['hoja_x' => ['x', 0, 100], 'hoja_y' => ['y', 0, 100], 'hoja_ancho' => ['width', 10, 100], 'hoja_giro' => ['tilt', -45, 45]];
        foreach ($ranges as $key => [$name, $min, $max]) {
            $value = trim($fields[$key] ?? '');
            if ($value === '') {
                continue;
            }
            if (! is_numeric($value) || $value < $min || $value > $max) {
                $this->error($id, null, $key, "'{$value}' debe ir de {$min} a {$max}");

                continue;
            }
            $out[$name] = (float) $value;
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
            foreach ($section['canvas'] ?? [] as $element) {
                if (isset($element['font'])) {
                    $fonts[$element['font']] = true;
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
            'texture' => $this->choice($page['textura'] ?? '', Catalog::TEXTURES, 'pagina', 'textura'),
            'silhouette' => $this->choice($page['silueta'] ?? '', Catalog::SILHOUETTES, 'pagina', 'silueta'),
            'fillet' => $this->choice($page['filete'] ?? '', Catalog::FILLETS, 'pagina', 'filete'),
        ];
        foreach (['confetti' => 'confeti', 'metal' => 'metalico', 'relief' => 'relieve'] as $key => $field) {
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
            $time = trim($item['hora'] ?? '') === '' ? null : $this->time($item['hora'], $section->id, $i + 1, 'hora');
            $place = [
                'label' => trim($item['etiqueta'] ?? ''),
                'name' => $name,
                'time' => $time,
                'address' => trim($item['direccion'] ?? ''),
                'maps_url' => $this->webUrl($item['maps'] ?? '', $section->id, $i + 1, 'maps'),
                'photo' => $this->media($item['foto'] ?? '', $media),
            ];
            // Con tipo: ícono y etiqueta por defecto (la etiqueta escrita gana). Sin tipo, como antes.
            $kind = $this->choice($item['tipo'] ?? '', self::LOCATION_KINDS, $section->id, 'tipo');
            if ($kind !== null) {
                $def = self::LOCATION_KINDS[Normalizer::key($item['tipo'])];
                $place['kind'] = $kind;
                $place['icon'] = $def['icon'];
                if ($place['label'] === '') {
                    $place['label'] = $def['label'];
                }
            }
            // Agregar al calendario: el día del evento a la hora de este punto.
            if ($time !== null && $time !== '' && Normalizer::yes($section->fields['calendario'] ?? '') && $this->startsAt !== null) {
                [$h, $m] = array_map('intval', explode(':', $time));
                $place['starts_at'] = $this->startsAt->setTime($h, $m)->toIso8601String();
            }
            $out[] = $place;
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
            $hotel = [
                'name' => $name,
                'note' => trim($item['nota'] ?? ''),
                'address' => trim($item['direccion'] ?? ''),
                'maps_url' => $this->webUrl($item['maps'] ?? '', $section->id, $i + 1, 'maps'),
                'phone' => trim($item['telefono'] ?? ''),
                'photo' => $this->media($item['foto'] ?? '', $media),
            ];
            // Opcionales: solo viajan si se llenaron (sin ellos, el config es el de siempre).
            $extras = [
                'distance' => trim($item['distancia'] ?? ''),
                'price' => trim($item['precio'] ?? ''),
                'booking_url' => $this->webUrl($item['reserva'] ?? '', $section->id, $i + 1, 'reserva'),
            ];
            $out[] = $hotel + array_filter($extras, fn ($v) => $v !== '');
        }

        return $out;
    }

    /**
     * Las fotos de la galería, en el orden de la lista; las filas sin foto se saltan. Las que
     * están en media/ llevan su ancho y alto: la galería las acomoda según su forma (sin
     * recortarlas) y les aparta el lugar antes de que carguen.
     *
     * @param  array<string, string>  $media
     * @return list<array{photo: string, caption: string, width?: int, height?: int, thumb?: string, thumb_width?: int}>
     */
    private function gallery(DesignSection $section, array $media): array
    {
        $events = app(EventRepository::class);
        $out = [];
        foreach ($section->items as $item) {
            $file = trim($item['foto'] ?? '');
            $photo = $this->media($file, $media);
            if ($photo === null) {
                continue;
            }
            $entry = ['photo' => $photo, 'caption' => trim($item['pie'] ?? '')];
            $path = isset($media[$file]) ? $events->mediaFile($this->slug, $file) : null;
            $size = $path === null ? false : @getimagesize($path);
            if ($size !== false && $size[0] > 0 && $size[1] > 0) {
                $entry['width'] = (int) $size[0];
                $entry['height'] = (int) $size[1];
            }
            // La miniatura (480 px) solo se ofrece si existe; sin ella la foto se ve como siempre.
            $thumb = $path === null ? null : dirname($path).'/'.ImageOptimizer::thumbName($file);
            $thumbSize = $thumb !== null && is_file($thumb) ? @getimagesize($thumb) : false;
            if ($thumbSize !== false && isset($entry['width'])) {
                $entry['thumb'] = preg_replace('#[^/]+$#', ImageOptimizer::thumbName($file), $photo);
                $entry['thumb_width'] = (int) $thumbSize[0];
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
