<?php

namespace App\Services\Layout;

use App\Services\Weather\VenueLocator;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Convierte las pestañas del layout (en español, como las escribe una persona en Excel)
 * en el objeto `config` que consume la invitación. Las claves de salida van en inglés
 * porque son contrato de código (ver web/src/types/event.ts).
 */
final class EventConfigBuilder
{
    /** Pestaña "paleta": nombre en el layout → token CSS (--color-<token>). */
    private const PALETTE = [
        'fondo' => 'bg',
        'texto' => 'text',
        'primario' => 'primary',
        'primario_fuerte' => 'primary-strong',
        'primario_claro' => 'primary-soft',
        'acento' => 'accent',
        'acento_suave' => 'accent-soft',
        'superficie' => 'surface',
        'marco' => 'frame',
    ];

    /** Pestaña "secciones": nombre en español → tipo de sección. También acepta el tipo directo. */
    private const SECTIONS = [
        'portada' => 'hero-envelope',
        'sobre' => 'hero-envelope',
        'musica' => 'music-player',
        'bendicion' => 'blessing',
        'familia' => 'blessing',
        'fecha' => 'save-the-date',
        'save_the_date' => 'save-the-date',
        'foto' => 'photo-arch',
        'ubicacion' => 'location',
        'frase' => 'quote',
        'itinerario' => 'itinerary',
        'vestimenta' => 'dress-code',
        'dress_code' => 'dress-code',
        'cuenta_regresiva' => 'countdown',
        'hoteles' => 'hotels',
        'spotify' => 'spotify',
        'playlist' => 'spotify',
        'clima' => 'weather',
        'confirmacion' => 'rsvp',
        'cierre' => 'closing',
        'sin_ninos' => 'no-kids',
        'solo_adultos' => 'no-kids',
        'dedicatoria' => 'dedications',
        'dedicatorias' => 'dedications',
    ];

    /** Efectos: alias en español → nombre en código. */
    private const EFFECTS = [
        'aparecer' => 'reveal',
        'parallax' => 'parallax',
        'flotar' => 'float',
        'brillo' => 'shine',
        'linea' => 'timeline-fill',
        'escribir' => 'typewriter',
        'destellos' => 'sparkle',
        'cascada' => 'cascade',
        'acercamiento' => 'ken-burns',
        'cambio_de_color' => 'color-shift',
        'cambio_color' => 'color-shift',
        'colores' => 'color-shift',
    ];

    private const RSVP_MODES = ['token', 'open', 'whatsapp', 'off'];

    /** Clave "musica_fuente": de dónde sale la canción que suena al abrir el sobre. */
    private const MUSIC_SOURCES = ['archivo' => 'file', 'mp3' => 'file', 'file' => 'file', 'spotify' => 'spotify'];

    /** Enlace de "Compartir" de Spotify (con o sin /intl-es/) o URI de la app. */
    private const SPOTIFY_LINK = '~^(https?://open\.spotify\.com/(intl-[a-z]{2}(-[a-z]{2})?/)?(embed/)?|spotify:)(playlist|album|track|artist|episode|show)[/:][A-Za-z0-9]+~i';

    public const MIN_PANEL_PASSWORD = 8;

    /** Columna "fondo_ajuste": cómo se acomoda la imagen de fondo. */
    private const BACKGROUND_FIT = ['cubrir' => 'cover', 'cover' => 'cover', 'mosaico' => 'tile', 'tile' => 'tile'];

    /** Columna "escritorio": cuánto de la fila ocupa la sección en pantallas grandes. */
    private const DESKTOP = ['completo' => 'full', 'full' => 'full', 'mitad' => 'half', 'half' => 'half'];

    /** @var list<string> */
    private array $errors = [];

    /**
     * @param  array<string, list<array<string, string>>>  $sheets
     * @param  array<string, string>  $media  archivo en media/ → URL pública
     * @return array<string, mixed>
     */
    public function build(string $slug, array $sheets, array $media, ?CarbonImmutable $now = null): array
    {
        $this->errors = [];
        $now ??= CarbonImmutable::now();

        $e = $this->keyValues($sheets['evento'] ?? []);
        if ($e === []) {
            throw new LayoutException($slug, ['falta la pestaña "evento" (columnas clave, valor)']);
        }

        $timezone = $e['zona_horaria'] ?? 'America/Mexico_City';
        $startsAt = $this->dateTime($e['inicia'] ?? '', $timezone, 'evento → inicia');
        $deadline = $this->date($e['rsvp_limite'] ?? '', 'evento → rsvp_limite');
        $mode = strtolower($e['rsvp_modo'] ?? 'token');

        if (! isset($e['tema']) || $e['tema'] === '') {
            $this->errors[] = 'evento → tema: falta el tema (por ejemplo jardin-azul)';
        }
        if (! in_array($mode, self::RSVP_MODES, true)) {
            $this->errors[] = "evento → rsvp_modo: '{$mode}' no existe (usa token, open, whatsapp u off)";
        }
        if ($startsAt && $deadline && $deadline > $startsAt->format('Y-m-d')) {
            $this->errors[] = 'evento → rsvp_limite: la fecha límite es después del evento';
        }
        if (isset($e['clima_coordenadas']) && VenueLocator::parse($e['clima_coordenadas']) === null) {
            $this->errors[] = "evento → clima_coordenadas: '{$e['clima_coordenadas']}' no son coordenadas (usa latitud, longitud; por ejemplo 20.1170, -98.7333)";
        }
        $spotify = $e['spotify'] ?? null;
        if ($spotify !== null && ! preg_match(self::SPOTIFY_LINK, $spotify)) {
            $this->errors[] = "evento → spotify: '{$spotify}' no es un enlace de Spotify (en Spotify: Compartir → Copiar enlace de la playlist)";
            $spotify = null;
        }
        $musicSource = $this->musicSource($e, $spotify);
        // La clave del panel nunca sale en el config público; aquí solo se revisa que sea segura.
        if (isset($e['clave_panel']) && mb_strlen($e['clave_panel']) < self::MIN_PANEL_PASSWORD) {
            $this->errors[] = 'evento → clave_panel: usa al menos '.self::MIN_PANEL_PASSWORD.' caracteres';
        }

        $config = [
            'slug' => $slug,
            'type' => $e['tipo'] ?? 'otro',
            'theme' => $e['tema'] ?? '',
            'title' => $e['titulo'] ?? '',
            'subtitle' => $e['subtitulo'] ?? '',
            'celebrant' => array_filter([
                'full_name' => $e['festejada'] ?? '',
                'short_name' => $e['festejada_corto'] ?? ($e['festejada'] ?? ''),
                'partner_name' => $e['pareja'] ?? '',
            ], fn ($v) => $v !== ''),
            'starts_at' => $startsAt?->toIso8601String(),
            'timezone' => $timezone,
            'published' => $this->yes($e['publicado'] ?? 'SI'),
            'rsvp' => [
                'mode' => $mode,
                'deadline' => $deadline,
                'open' => $deadline === null || $now->setTimezone($timezone)->format('Y-m-d') <= $deadline,
                'whatsapp_number' => $e['rsvp_whatsapp'] ?? null,
                'ask_song' => $this->yes($e['rsvp_pedir_cancion'] ?? 'SI'),
                'ask_message' => $this->yes($e['rsvp_pedir_mensaje'] ?? 'SI'),
            ],
            'venue' => [
                'name' => $e['salon'] ?? '',
                'display_name' => $e['salon_nombre_visible'] ?? ($e['salon'] ?? ''),
                'city' => $e['salon_ciudad'] ?? '',
                'address' => $e['salon_direccion'] ?? '',
                'maps_url' => $e['salon_maps'] ?? '',
                'photo' => $this->media($e['salon_foto'] ?? '', $media),
            ],
            'music' => [
                'source' => $musicSource,
                'audio_url' => $this->media($e['musica_audio'] ?? '', $media),
                'spotify_url' => $spotify,
            ],
            'media' => [
                'portrait' => $this->media($e['retrato'] ?? '', $media),
            ],
            'dress_code' => [
                'colors' => $this->splitList($e['vestimenta_colores'] ?? ''),
            ],
            'palette' => $this->palette($sheets['paleta'] ?? []),
            'fonts' => $this->fonts($sheets['tipografia'] ?? []),
            'sections' => $this->sections($sheets['secciones'] ?? [], $media),
            'family' => $this->family($sheets['familia'] ?? []),
            'itinerary' => $this->itinerary($sheets['itinerario'] ?? []),
            'locations' => $this->locations($sheets['ubicaciones'] ?? [], $media),
            'assets' => (object) $media,
        ];

        $visible = array_filter($config['sections'], fn ($s) => $s['visible']);
        $visibleTypes = array_column($visible, 'type');
        if ($musicSource === 'spotify' && array_intersect(['spotify', 'music-player'], $visibleTypes) === []) {
            $this->errors[] = 'evento → musica_fuente: con Spotify, la playlist necesita dónde mostrarse; agrega la sección playlist o musica';
        }
        $needsPlace = in_array('weather', $visibleTypes, true);
        if ($needsPlace && ! isset($e['clima_coordenadas']) && ($e['salon_ciudad'] ?? '') === '' && VenueLocator::fromMapsUrl($e['salon_maps'] ?? '') === null) {
            $this->errors[] = 'secciones → clima: falta saber dónde es; agrega salon_ciudad (por ejemplo "Pachuca, Hidalgo") o clima_coordenadas en la pestaña evento';
        }

        if ($this->errors !== []) {
            throw new LayoutException($slug, $this->errors);
        }

        return $config;
    }

    /**
     * "archivo" (MP3 de musica_audio) o "spotify" (la playlist suena al abrir el sobre). Sin
     * la clave: Spotify solo si no hay MP3 pero sí playlist.
     *
     * @param  array<string, string>  $e
     */
    private function musicSource(array $e, ?string $spotify): string
    {
        $key = LayoutReader::key($e['musica_fuente'] ?? '');
        if ($key === '') {
            return ($e['musica_audio'] ?? '') === '' && $spotify !== null ? 'spotify' : 'file';
        }
        if (! isset(self::MUSIC_SOURCES[$key])) {
            $this->errors[] = "evento → musica_fuente: '{$key}' no existe (usa archivo o spotify)";

            return 'file';
        }
        if (self::MUSIC_SOURCES[$key] === 'spotify' && $spotify === null) {
            $this->errors[] = 'evento → musica_fuente: para usar Spotify agrega el enlace de la playlist en la clave spotify';

            return 'file';
        }

        return self::MUSIC_SOURCES[$key];
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, string>
     */
    private function keyValues(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $key = LayoutReader::key($row['clave'] ?? '');
            if ($key !== '') {
                $out[$key] = trim($row['valor'] ?? '');
            }
        }

        return array_filter($out, fn ($v) => $v !== '');
    }

    /**
     * Los nombres conocidos se traducen a los tokens del contrato; cualquier otro
     * ("oro_claro") se vuelve un token propio (--color-oro-claro) para el tema.
     *
     * @param  list<array<string, string>>  $rows
     * @return array<string, string>
     */
    private function palette(array $rows): array
    {
        $out = [];
        foreach ($rows as $i => $row) {
            $name = LayoutReader::key($row['token'] ?? '');
            $color = trim($row['color'] ?? '');
            if ($name === '' || $color === '') {
                continue;
            }
            if (! preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $color)) {
                $this->errors[] = 'paleta, fila '.($i + 2).": '{$color}' no es un color hex (#RRGGBB)";

                continue;
            }
            $out[self::PALETTE[$name] ?? str_replace('_', '-', $name)] = strtoupper($color);
        }

        return $out;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, string>
     */
    private function fonts(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $role = str_replace('_', '-', LayoutReader::key($row['rol'] ?? ''));
            $font = trim($row['fuente'] ?? '');
            if ($role !== '' && $font !== '') {
                $out[$role] = $font;
            }
        }

        return $out;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @param  array<string, string>  $media
     * @return list<array<string, mixed>>
     */
    private function sections(array $rows, array $media): array
    {
        $out = [];
        foreach ($rows as $i => $row) {
            $raw = LayoutReader::key($row['seccion'] ?? '');
            if ($raw === '') {
                continue;
            }
            $type = self::SECTIONS[$raw] ?? str_replace('_', '-', $raw);

            $effects = [];
            foreach ($this->splitList($row['efectos'] ?? '') as $effect) {
                $key = LayoutReader::key($effect);
                $effects[] = self::EFFECTS[$key] ?? str_replace('_', '-', $key);
            }

            $overlay = trim($row['overlay'] ?? '');
            if ($overlay !== '' && (! is_numeric($overlay) || $overlay < 0 || $overlay > 1)) {
                $this->errors[] = 'secciones, fila '.($i + 2).": overlay '{$overlay}' debe ir de 0 a 1";
                $overlay = '';
            }

            $desktop = LayoutReader::key($row['escritorio'] ?? '');
            if ($desktop !== '' && ! isset(self::DESKTOP[$desktop])) {
                $this->errors[] = 'secciones, fila '.($i + 2).": escritorio '{$desktop}' no existe (usa completo o mitad)";
            }

            $fit = LayoutReader::key($row['fondo_ajuste'] ?? '');
            if ($fit !== '' && ! isset(self::BACKGROUND_FIT[$fit])) {
                $this->errors[] = 'secciones, fila '.($i + 2).": fondo_ajuste '{$fit}' no existe (usa cubrir o mosaico)";
            }

            $background = array_filter([
                'image' => $this->media($row['fondo'] ?? '', $media),
                'fit' => self::BACKGROUND_FIT[$fit] ?? null,
                'color' => $this->colorRef($row['color_fondo'] ?? ''),
                'overlay' => $overlay === '' ? null : (float) $overlay,
                'attachment' => $this->yes($row['fijo'] ?? '') ? 'sticky' : null,
            ], fn ($v) => $v !== null && $v !== '');

            // Las palabras de cada sección viven en su renglón: así se editan junto a su fondo y efectos.
            $out[] = array_filter([
                'type' => $type,
                'order' => is_numeric($row['orden'] ?? '') ? (float) $row['orden'] : $i + 1,
                'title' => trim($row['titulo'] ?? '') ?: null,
                'subtitle' => trim($row['subtitulo'] ?? '') ?: null,
                'text' => trim($row['texto'] ?? '') ?: null,
                'button' => trim($row['boton'] ?? '') ?: null,
                'variant' => trim($row['variante'] ?? '') ?: null,
                'background' => $background === [] ? null : $background,
                'effects' => $effects,
                'visible' => $this->yes($row['visible'] ?? 'SI'),
                'desktop' => self::DESKTOP[$desktop] ?? null,
            ], fn ($v) => $v !== null);
        }

        usort($out, fn ($a, $b) => $a['order'] <=> $b['order']);

        return array_map(function ($s) {
            unset($s['order']);

            return $s;
        }, $out);
    }

    /**
     * Un renglón por nombre; los renglones con el mismo rol se agrupan en orden.
     *
     * @param  list<array<string, string>>  $rows
     * @return list<array{role: string, names: list<string>}>
     */
    private function family(array $rows): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $role = trim($row['rol'] ?? '');
            $name = trim($row['nombre'] ?? '');
            if ($role === '' || $name === '') {
                continue;
            }
            $groups[$role][] = $name;
        }

        return array_map(fn ($role, $names) => ['role' => (string) $role, 'names' => $names], array_keys($groups), $groups);
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return list<array<string, string>>
     */
    private function itinerary(array $rows): array
    {
        $out = [];
        foreach ($rows as $i => $row) {
            $label = trim($row['actividad'] ?? '');
            if ($label === '') {
                continue;
            }
            $out[] = array_filter([
                'time' => $this->time($row['hora'] ?? '', 'itinerario, fila '.($i + 2)),
                'label' => $label,
                'icon' => trim($row['icono'] ?? '') ?: null,
            ], fn ($v) => $v !== null);
        }

        return $out;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @param  array<string, string>  $media
     * @return list<array<string, string|null>>
     */
    private function locations(array $rows, array $media): array
    {
        $out = [];
        foreach ($rows as $i => $row) {
            $name = trim($row['lugar'] ?? '');
            if ($name === '') {
                continue;
            }
            $out[] = [
                'label' => trim($row['etiqueta'] ?? ''),
                'name' => $name,
                'time' => ($row['hora'] ?? '') === '' ? null : $this->time($row['hora'], 'ubicaciones, fila '.($i + 2)),
                'address' => trim($row['direccion'] ?? ''),
                'maps_url' => trim($row['maps'] ?? ''),
                'photo' => $this->media($row['foto'] ?? '', $media),
            ];
        }

        return $out;
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

    /** Fecha y hora del evento siempre con offset (2026-11-28T17:00:00-06:00). */
    private function dateTime(string $value, string $timezone, string $where): ?CarbonImmutable
    {
        if ($value === '') {
            $this->errors[] = "{$where}: falta la fecha y hora (AAAA-MM-DD HH:MM)";

            return null;
        }
        try {
            return CarbonImmutable::parse($value, $timezone)->setTimezone($timezone);
        } catch (Throwable) {
            $this->errors[] = "{$where}: '{$value}' no es una fecha válida (AAAA-MM-DD HH:MM)";

            return null;
        }
    }

    private function date(string $value, string $where): ?string
    {
        if ($value === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($value)->format('Y-m-d');
        } catch (Throwable) {
            $this->errors[] = "{$where}: '{$value}' no es una fecha válida (AAAA-MM-DD)";

            return null;
        }
    }

    /** "17:00", "5:00 pm", "5 pm" → "17:00". */
    private function time(string $value, string $where): string
    {
        $v = strtolower(str_replace(['.', ' '], '', trim($value)));
        if (preg_match('/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/', $v, $m)) {
            $h = (int) $m[1];
            $min = (int) ($m[2] ?? 0);
            $suffix = $m[3] ?? '';
            if ($suffix === 'pm' && $h < 12) {
                $h += 12;
            }
            if ($suffix === 'am' && $h === 12) {
                $h = 0;
            }
            if ($h < 24 && $min < 60) {
                return sprintf('%02d:%02d', $h, $min);
            }
        }
        $this->errors[] = "{$where}: hora '{$value}' no válida (usa 17:00 o 5:00 pm)";

        return '';
    }

    /** Un hex pasa tal cual; un nombre de la paleta ("lino", "superficie") se vuelve su token. */
    private function colorRef(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (str_starts_with($value, '#')) {
            return strtoupper($value);
        }
        $key = LayoutReader::key($value);

        return self::PALETTE[$key] ?? str_replace('_', '-', $key);
    }

    private function yes(string $value): bool
    {
        return in_array(LayoutReader::key($value), ['si', 's', 'x', 'yes', 'true', '1'], true);
    }

    /** "reveal parallax" / "reveal, parallax" / "reveal|parallax" → lista. */
    private function splitList(string $value): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[\s,;|]+/', $value) ?: [])));
    }
}
