<?php

namespace Tests\Unit\Design;

use App\Services\Design\BuildResult;
use App\Services\Design\Catalog;
use App\Services\Design\Design;
use App\Services\Design\DesignFile;
use App\Services\Design\DesignSection;
use App\Services\Design\InvitationConfigBuilder;
use Carbon\CarbonImmutable;
use Tests\TestCase;
use Tests\Unit\Media\Mp3DurationTest;

class InvitationConfigBuilderTest extends TestCase
{
    private const MEDIA = ['salon.webp' => 'https://ejemplo.test/media/nueva/salon.webp'];

    private function build(Design $design, array $settings = [], bool $lenient = false, ?array $media = null): BuildResult
    {
        return app(InvitationConfigBuilder::class)->build('nueva', $design, $media ?? self::MEDIA, $settings, $lenient, CarbonImmutable::parse('2026-10-14 12:00', 'America/Mexico_City'));
    }

    private function fixture(): Design
    {
        [$design] = app(DesignFile::class)->read(base_path('tests/Fixtures/eventos/nueva/invitacion.csv'));

        return $design;
    }

    private function minimal(array $sections = [], array $event = []): Design
    {
        return new Design(
            event: ['tema' => 'jardin-azul', 'inicia' => '2026-11-28 17:00', ...$event],
            sections: $sections,
        );
    }

    public function test_builds_the_same_contract_the_web_already_reads(): void
    {
        $result = $this->build($this->fixture());
        $this->assertSame([], $result->errors());
        $config = $result->config;

        $this->assertSame('jardin-azul', $config['theme']);
        $this->assertSame('2026-11-28T17:00:00-06:00', $config['starts_at']);
        $this->assertSame(['full_name' => 'Festejada Nueva', 'short_name' => 'Nue'], $config['celebrant']);
        $this->assertSame(['primary' => '#96792C', 'accent' => '#2F4A7A', 'lino' => '#F0EDE8'], $config['palette']);
        $this->assertSame(['script' => 'Great Vibes'], $config['fonts']);
        $this->assertSame('Salón Nuevo', $config['venue']['name']);
        $this->assertSame('https://ejemplo.test/media/nueva/salon.webp', $config['venue']['photo']);
        $this->assertSame('https://ejemplo.test/retrato.webp', $config['media']['portrait']);
        $this->assertSame(['#000000', '#FFFFFF'], $config['dress_code']['colors']);
        $this->assertSame([
            ['role' => 'Mis papás', 'names' => ['Persona Uno', 'Persona Dos']],
            ['role' => 'Mis padrinos', 'names' => ['Persona Tres']],
        ], $config['family']);
        $this->assertSame([
            ['time' => '17:00', 'label' => 'Recepción'],
            ['time' => '17:50', 'label' => 'Entrada', 'icon' => 'corona.webp'],
        ], $config['itinerary']);
        $this->assertSame(['decor' => false], $config['page']);
        $this->assertSame('2026-11-06', $config['rsvp']['deadline']);
        $this->assertTrue($config['rsvp']['open']);
    }

    public function test_hidden_sections_are_not_published_and_each_section_carries_its_key(): void
    {
        $config = $this->build($this->fixture())->config;

        $this->assertSame(['hero-envelope', 'blessing', 'photo-arch', 'itinerary', 'dress-code'], array_column($config['sections'], 'type'));
        $this->assertSame(['portada', 'bendicion', 'foto', 'itinerario', 'vestimenta'], array_column($config['sections'], 'key'));
        $this->assertStringNotContainsString('Confirmación secreta', json_encode($config));
    }

    public function test_sections_get_their_colors_decor_and_text_styles(): void
    {
        $sections = array_column($this->build($this->fixture())->config['sections'], null, 'key');

        // Colores propios: hex en mayúsculas; color_fondo sigue siendo el fondo del panel.
        $this->assertSame(['text' => '#FFFFFF'], $sections['vestimenta']['colors']);
        $this->assertSame(['color' => 'frame'], $sections['vestimenta']['background']);
        // "ninguna" quita el adorno de la sección.
        $this->assertSame(['seal' => null], $sections['portada']['decor']);
        // Estilos: lo de la sección gana y lo de "textos" llena lo demás.
        $this->assertSame(['font' => 'Playfair Display', 'color' => 'accent'], $sections['itinerario']['text_styles']['title']);
        $this->assertSame(['size' => 1.2], $sections['itinerario']['text_styles']['time']);
        $this->assertSame(['color' => 'accent'], $sections['vestimenta']['text_styles']['title']);
        // La foto también lleva su imagen en la sección.
        $this->assertSame('https://ejemplo.test/retrato.webp', $sections['foto']['image']);
    }

    public function test_the_fonts_of_the_texts_are_listed_once_to_load_them(): void
    {
        $design = $this->minimal([
            new DesignSection('itinerario', ['titulo_fuente' => 'Great Vibes', 'hora_fuente' => 'Lora']),
            new DesignSection('cierre', ['titulo_fuente' => 'Great Vibes']),
        ]);

        $this->assertSame(['Great Vibes', 'Lora'], $this->build($design)->config['extra_fonts']);
    }

    public function test_text_styles_are_validated(): void
    {
        $design = $this->minimal([new DesignSection('cierre', [
            'titulo_fuente' => "Lora'; background:url(x)",
            'titulo_color' => '#12',
            'texto_tamano' => '400',
            'texto_color' => 'acento_fuerte',
        ])]);

        $result = $this->build($design, lenient: true);

        $this->assertCount(3, $result->errors());
        $this->assertStringContainsString('cierre → titulo_fuente', $result->errors()[0]);
        $this->assertStringContainsString('cierre → titulo_color', $result->errors()[1]);
        $this->assertStringContainsString('cierre → texto_tamano', $result->errors()[2]);
        $this->assertSame(['text' => ['color' => 'accent-strong']], $result->config['sections'][0]['text_styles']);
    }

    public function test_only_web_links_reach_the_buttons(): void
    {
        $design = $this->minimal(
            [new DesignSection('ubicacion', [], [['lugar' => 'Iglesia', 'maps' => 'javascript:alert(1)']])],
            ['salon_maps' => 'data:text/html,hola'],
        );

        $result = $this->build($design, lenient: true);

        $this->assertSame('', $result->config['venue']['maps_url']);
        $this->assertSame('', $result->config['locations'][0]['maps_url']);
        $this->assertStringContainsString('evento → salon_maps: debe ser un enlace', $result->errors()[0]);
        $this->assertStringContainsString('ubicacion, elemento 1 → maps: debe ser un enlace', $result->errors()[1]);
    }

    public function test_locations_without_the_new_fields_keep_the_same_config(): void
    {
        $result = $this->build($this->minimal([
            new DesignSection('ubicacion', ['titulo' => 'Dónde'], [['etiqueta' => 'Misa', 'lugar' => 'Iglesia', 'hora' => '5pm']]),
        ]));

        $this->assertSame([], $result->errors());
        $this->assertSame([['label' => 'Misa', 'name' => 'Iglesia', 'time' => '17:00', 'address' => '', 'maps_url' => '', 'photo' => null]], $result->config['locations']);
        $this->assertSame(['type' => 'location', 'title' => 'Dónde', 'visible' => true, 'key' => 'ubicacion'], array_diff_key($result->config['sections'][0], ['effects' => 1]));
    }

    public function test_location_type_sets_label_and_icon_and_each_section_has_its_places(): void
    {
        $result = $this->build($this->minimal([
            new DesignSection('ubicacion', ['calendario' => 'SI', 'acomodo' => 'lado a lado'], [
                ['tipo' => 'Ceremonia religiosa', 'lugar' => 'Parroquia', 'hora' => '17:00'],
                ['tipo' => 'recepción', 'etiqueta' => 'La fiesta', 'lugar' => 'Salón', 'hora' => '19:30'],
            ]),
            new DesignSection('ubicacion-2', ['acomodo' => 'uno debajo del otro'], [['tipo' => 'otro', 'lugar' => 'Hotel']]),
        ]));

        $this->assertSame([], $result->errors());
        $places = $result->config['locations'];
        $this->assertSame(['religious', 'church', 'Ceremonia religiosa', '2026-11-28T17:00:00-06:00'], [$places[0]['kind'], $places[0]['icon'], $places[0]['label'], $places[0]['starts_at']]);
        $this->assertSame(['reception', 'La fiesta', '2026-11-28T19:30:00-06:00'], [$places[1]['kind'], $places[1]['label'], $places[1]['starts_at']]);
        [$first, $second] = $result->config['sections'];
        $this->assertTrue($first['calendar']);
        $this->assertSame('side', $first['layout']);
        $this->assertArrayNotHasKey('places', $first);
        $this->assertSame('stack', $second['layout']);
        $this->assertArrayNotHasKey('calendar', $second);
        $this->assertSame('Hotel', $second['places'][0]['name']);
        $this->assertArrayNotHasKey('starts_at', $second['places'][0]);
    }

    public function test_dress_code_examples_link_is_its_own_validated_field(): void
    {
        $with = $this->build($this->minimal([new DesignSection('vestimenta', ['variante' => 'muestrario', 'enlace' => 'https://ejemplo.test/ideas', 'boton' => 'Ver ideas'])]));
        $without = $this->build($this->minimal([new DesignSection('vestimenta', ['variante' => 'muestrario'])]));
        $bad = $this->build($this->minimal([new DesignSection('vestimenta', ['enlace' => 'javascript:alert(1)'])]), lenient: true);

        $this->assertSame([], $with->errors());
        $this->assertSame('https://ejemplo.test/ideas', $with->config['sections'][0]['link']);
        $this->assertSame('Ver ideas', $with->config['sections'][0]['button']);
        $this->assertArrayNotHasKey('link', $without->config['sections'][0]);
        $this->assertArrayNotHasKey('link', $bad->config['sections'][0]);
        $this->assertStringContainsString('vestimenta → enlace: debe ser un enlace', $bad->errors()[0]);
    }

    public function test_engraved_and_lace_variants_and_the_estate_slot_pass_through(): void
    {
        $result = $this->build($this->minimal([
            new DesignSection('itinerario', ['variante' => 'grabado', 'en_vivo' => 'SI'], [['hora' => '17:00', 'actividad' => 'Misa']]),
            new DesignSection('ubicacion', ['variante' => 'grabado', 'acomodo' => 'lado a lado', 'calendario' => 'SI', 'imagen_hacienda' => 'salon.webp']),
            new DesignSection('galeria', ['variante' => 'bastidor']),
            new DesignSection('video', ['variante' => 'encaje', 'fuente' => 'youtube', 'enlace' => 'https://youtu.be/dQw4w9WgXcQ']),
        ]), lenient: true);

        $sections = $result->config['sections'];
        $this->assertSame([], array_filter($result->errors(), fn ($e) => str_contains($e, 'variante') || str_contains($e, 'hacienda')));
        $this->assertSame('grabado', $sections[0]['variant']);
        $this->assertTrue($sections[0]['live']);
        $this->assertSame('grabado', $sections[1]['variant']);
        $this->assertSame('side', $sections[1]['layout']);
        $this->assertTrue($sections[1]['calendar']);
        $this->assertSame('https://ejemplo.test/media/nueva/salon.webp', $sections[1]['decor']['estate']);
        $this->assertSame('bastidor', $sections[2]['variant']);
        $this->assertSame('encaje', $sections[3]['variant']);
    }

    public function test_the_lace_template_builds_clean_with_every_variant(): void
    {
        $file = base_path('../deploy/plantillas/encaje/invitacion.csv');
        if (! is_file($file)) {
            $this->markTestSkipped('deploy/plantillas no está montado en este contenedor.');
        }
        [$design] = app(DesignFile::class)->read($file);

        $result = $this->build($design, media: []);

        $this->assertSame([], $result->errors());
        $this->assertSame('encaje', $result->config['theme']);
        $variants = collect($result->config['sections'])->pluck('variant', 'type')->all();
        $this->assertEquals(
            ['itinerary' => 'grabado', 'location' => 'grabado', 'gallery' => 'bastidor', 'trivia' => 'tarjetas', 'video' => 'encaje', 'social-post' => 'encaje', 'dress-code' => 'muestrario'],
            array_intersect_key($variants, array_flip(['itinerary', 'location', 'gallery', 'trivia', 'video', 'social-post', 'dress-code'])),
        );
    }

    public function test_live_itinerary_is_only_flagged_when_asked(): void
    {
        $off = $this->build($this->minimal([new DesignSection('itinerario', [], [['hora' => '17:00', 'actividad' => 'Misa']])]));
        $on = $this->build($this->minimal([new DesignSection('itinerario', ['en_vivo' => 'SI'], [['hora' => '17:00', 'actividad' => 'Misa']])]));

        $this->assertArrayNotHasKey('live', $off->config['sections'][0]);
        $this->assertTrue($on->config['sections'][0]['live']);
    }

    public function test_lenient_mode_always_gives_a_config_and_says_where_each_problem_is(): void
    {
        $design = new Design(sections: [new DesignSection('itinerario', [], [['hora' => '25:00', 'actividad' => 'Baile']])]);

        $result = $this->build($design, lenient: true);

        $this->assertTrue($result->hasErrors());
        $this->assertSame('jardin-azul', $result->config['theme']);
        $this->assertNull($result->config['starts_at']);
        $issue = collect($result->issues)->firstWhere('field', 'hora');
        $this->assertSame(['level' => 'error', 'block' => 'itinerario', 'item' => 1, 'field' => 'hora'], array_slice($issue, 0, 4));
        $this->assertStringContainsString("itinerario, elemento 1 → hora: hora '25:00' no válida", $issue['message']);
    }

    public function test_settings_win_over_the_invitation(): void
    {
        $design = $this->minimal(event: ['rsvp_limite' => '2026-11-06']);

        $this->assertSame('2026-11-10', $this->build($design, ['rsvp_limite' => '2026-11-10'])->config['rsvp']['deadline']);
        $this->assertFalse($this->build($design, ['publicado' => 'NO'])->config['published']);
        // Una plantilla nunca se publica.
        $this->assertFalse($this->build($design, ['publicado' => 'SI', 'plantilla' => 'SI'])->config['published']);
    }

    public function test_the_paper_sheet_slot_and_safe_zone_travel_to_the_section(): void
    {
        $this->assertSame(['slot' => 'sheet', 'label' => 'Lámina de papel'], Catalog::slots('frase')['lamina']);
        $this->assertArrayHasKey('lamina', Catalog::slots('lluvia_sobres'));

        $design = $this->minimal([new DesignSection('frase', [
            'texto' => 'Hola', 'variante' => 'lamina', 'imagen_lamina' => 'salon.webp',
            'zona_arriba' => '22', 'zona_izquierda' => '12.5', 'proporcion' => '0.72',
        ])]);
        $result = $this->build($design);
        $section = $result->config['sections'][0];

        $this->assertSame([], $result->errors());
        $this->assertSame([], $result->warnings());
        $this->assertSame('lamina', $section['variant']);
        $this->assertSame('https://ejemplo.test/media/nueva/salon.webp', $section['decor']['sheet']);
        $this->assertSame(['top' => 22.0, 'left' => 12.5, 'aspect' => 0.72], $section['sheet']);

        // Sin campos de zona, la sección no lleva `sheet`.
        $plain = $this->build($this->minimal([new DesignSection('frase', ['texto' => 'Hola'])]));
        $this->assertArrayNotHasKey('sheet', $plain->config['sections'][0]);
    }

    public function test_a_layer_can_drop_its_shadow(): void
    {
        $plain = $this->build($this->minimal([new DesignSection('capa', ['imagen' => 'salon.webp', 'sin_oscurecer' => 'SI'])]));
        $this->assertSame([], $plain->warnings());
        $this->assertTrue($plain->config['sections'][0]['plain']);

        // Sin el campo, la sección no cambia.
        $shaded = $this->build($this->minimal([new DesignSection('capa', ['imagen' => 'salon.webp'])]));
        $this->assertArrayNotHasKey('plain', $shaded->config['sections'][0]);
    }

    public function test_the_safe_zone_is_validated(): void
    {
        $result = $this->build($this->minimal([new DesignSection('lluvia_sobres', [
            'texto' => 'x', 'zona_abajo' => '60', 'proporcion' => 'ancha',
        ])]), lenient: true);

        $this->assertCount(2, $result->errors());
        $this->assertStringContainsString('zona_abajo', $result->errors()[0]);
        $this->assertStringContainsString('proporcion', $result->errors()[1]);
    }

    public function test_unknown_fields_and_decor_are_warnings_not_errors(): void
    {
        $design = $this->minimal([new DesignSection('fecha', ['inventado' => 'x', 'imagen_sobre' => 'otro.webp'])], ['color_favorito' => 'azul']);

        $result = $this->build($design);

        $this->assertSame([], $result->errors());
        $this->assertCount(3, $result->warnings());
        $this->assertArrayNotHasKey('decor', $result->config['sections'][0]);
    }

    public function test_a_bad_time_zone_is_reported_instead_of_breaking_the_page(): void
    {
        $result = $this->build($this->minimal(event: ['zona_horaria' => 'Marte/Olympus']), lenient: true);

        $this->assertStringContainsString('zona_horaria', $result->errors()[0]);
        $this->assertSame('America/Mexico_City', $result->config['timezone']);
    }

    private const VIDEO_MEDIA = [
        'salon.webp' => 'https://ejemplo.test/media/nueva/salon.webp',
        'baile-1a2b.mp4' => 'https://ejemplo.test/media/nueva/baile-1a2b.mp4',
    ];

    public function test_video_from_youtube_carries_only_the_validated_parts(): void
    {
        $section = new DesignSection('video', ['fuente' => 'youtube', 'enlace' => 'https://youtu.be/dQw4w9WgXcQ?si=zzz', 'poster' => 'salon.webp', 'formato' => 'vertical']);

        $result = $this->build($this->minimal([$section]), media: self::VIDEO_MEDIA);

        $this->assertSame([], $result->errors());
        $entry = $result->config['sections'][0];
        $this->assertSame('video', $entry['type']);
        $this->assertSame([
            'source' => 'youtube',
            'format' => 'vertical',
            'network' => 'youtube',
            'kind' => 'video',
            'id' => 'dQw4w9WgXcQ',
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'embed' => 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            'poster' => 'https://ejemplo.test/media/nueva/salon.webp',
        ], $entry['video']);
        // La URL que escribió la persona (con "si=zzz") no viaja en el config.
        $this->assertStringNotContainsString('zzz', json_encode($result->config));
    }

    public function test_video_from_a_library_mp4(): void
    {
        $ok = $this->build($this->minimal([new DesignSection('video', ['fuente' => 'archivo', 'archivo' => 'baile-1a2b.mp4'])]), media: self::VIDEO_MEDIA);
        $this->assertSame([], $ok->errors());
        $this->assertSame(['source' => 'file', 'format' => 'horizontal', 'file' => 'https://ejemplo.test/media/nueva/baile-1a2b.mp4'], $ok->config['sections'][0]['video']);

        // Una imagen, un archivo que no existe o una URL de afuera no son un MP4 de la biblioteca.
        foreach (['salon.webp', 'otro.mp4', 'https://evil.test/x.mp4'] as $bad) {
            $result = $this->build($this->minimal([new DesignSection('video', ['fuente' => 'archivo', 'archivo' => $bad])]), lenient: true, media: self::VIDEO_MEDIA);
            $this->assertStringContainsString('archivo', $result->errors()[0]);
            $this->assertArrayNotHasKey('video', $result->config['sections'][0]);
        }
    }

    public function test_video_and_post_links_are_validated(): void
    {
        foreach (['javascript:alert(1)', 'http://youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/123456', 'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ'] as $bad) {
            $video = $this->build($this->minimal([new DesignSection('video', ['fuente' => 'youtube', 'enlace' => $bad])]), lenient: true);
            $this->assertStringContainsString('enlace', $video->errors()[0], $bad);
            $this->assertArrayNotHasKey('video', $video->config['sections'][0]);

            $post = $this->build($this->minimal([new DesignSection('publicacion', ['red' => 'instagram', 'enlace' => $bad])]), lenient: true);
            $this->assertStringContainsString('enlace', $post->errors()[0], $bad);
            $this->assertArrayNotHasKey('post', $post->config['sections'][0]);
        }
        // Un enlace de otra red que la elegida tampoco entra.
        $wrong = $this->build($this->minimal([new DesignSection('video', ['fuente' => 'instagram', 'enlace' => 'https://youtu.be/dQw4w9WgXcQ'])]), lenient: true);
        $this->assertNotSame([], $wrong->errors());
    }

    public function test_social_post_and_its_poster(): void
    {
        $section = new DesignSection('publicacion', ['red' => 'instagram', 'enlace' => 'https://www.instagram.com/reel/C8abcDEF123/?igsh=1', 'poster' => 'https://evil.test/p.jpg', 'texto' => 'Síguenos en Instagram']);

        $result = $this->build($this->minimal([$section]), media: self::VIDEO_MEDIA);

        $this->assertSame([], $result->errors());
        $entry = $result->config['sections'][0];
        $this->assertSame('social-post', $entry['type']);
        $this->assertSame('Síguenos en Instagram', $entry['text']);
        $this->assertSame(['network' => 'instagram', 'kind' => 'reel', 'id' => 'C8abcDEF123', 'url' => 'https://www.instagram.com/reel/C8abcDEF123/'], $entry['post']);
        // Una portada de afuera nunca llega al config (la fachada no pide nada a terceros).
        $this->assertCount(1, $result->warnings());
        $this->assertStringNotContainsString('evil.test', json_encode($result->config));
    }

    public function test_sections_without_link_or_file_have_nothing_to_show_and_no_error(): void
    {
        $result = $this->build($this->minimal([new DesignSection('video', []), new DesignSection('publicacion', [])]));

        $this->assertSame([], $result->errors());
        $this->assertArrayNotHasKey('video', $result->config['sections'][0]);
        $this->assertArrayNotHasKey('post', $result->config['sections'][1]);
    }

    public function test_album_days_are_clamped_and_sample_photos_only_show_in_a_demo(): void
    {
        $items = [['foto' => 'salon.webp'], ['foto' => 'salon.webp']];
        $section = fn (string $days) => new DesignSection('album', ['titulo' => 'Álbum', 'album_dias' => $days], $items);

        $result = $this->build($this->minimal([$section('99')]));
        $entry = $result->config['sections'][0];
        $this->assertSame('guest-album', $entry['type']);
        $this->assertSame(20, $entry['days']);
        $this->assertCount(1, $result->warnings());
        $this->assertArrayNotHasKey('photos', $entry, 'las fotos de ejemplo solo salen en una muestra');

        $this->assertSame(5, $this->build($this->minimal([$section('')]))->config['sections'][0]['days']);
        $this->assertSame(7, $this->build($this->minimal([$section('7')]))->config['sections'][0]['days']);

        $demo = $this->build($this->minimal([$section('7')]), ['demo' => 'SI'])->config['sections'][0];
        $this->assertCount(2, $demo['photos']);
    }

    public function test_music_start_is_omitted_when_empty_or_zero_and_exposed_when_positive(): void
    {
        $base = $this->build($this->minimal(event: ['musica_audio' => 'c.mp3']));
        $zero = $this->build($this->minimal(event: ['musica_audio' => 'c.mp3', 'musica_inicio' => '0']));
        $this->assertSame([], $base->errors());
        $this->assertEquals($base->config, $zero->config);
        $this->assertArrayNotHasKey('start', $base->config['music']);

        // Sin poder leer el archivo no se inventa nada: solo se revisa el rango.
        $with = $this->build($this->minimal(event: ['musica_audio' => 'c.mp3', 'musica_inicio' => '45']));
        $this->assertSame([], $with->errors());
        $this->assertSame(45, $with->config['music']['start']);
    }

    public function test_music_start_rejects_negative_text_and_absurd_values(): void
    {
        foreach (['-5', 'abc', '4.5', '36001'] as $bad) {
            $result = $this->build($this->minimal(event: ['musica_audio' => 'c.mp3', 'musica_inicio' => $bad]));
            $this->assertCount(1, $result->errors(), $bad);
            $this->assertArrayNotHasKey('start', $result->config['music']);
        }
    }

    public function test_music_start_must_be_before_the_known_duration_of_the_mp3(): void
    {
        $dir = sys_get_temp_dir().'/ev-'.bin2hex(random_bytes(4));
        mkdir($dir.'/nueva/media', 0777, true);
        file_put_contents($dir.'/nueva/media/c.mp3', Mp3DurationTest::cbr(384)); // ~10 s
        config(['invitaciones.eventos_path' => $dir]);

        try {
            $event = ['musica_audio' => 'c.mp3'];
            $late = $this->build($this->minimal(event: [...$event, 'musica_inicio' => '10']));
            $this->assertStringContainsString('la canción dura 0:10; el inicio debe ser menor.', $late->errors()[0]);
            $this->assertArrayNotHasKey('start', $late->config['music']);

            $ok = $this->build($this->minimal(event: [...$event, 'musica_inicio' => '9']));
            $this->assertSame([], $ok->errors());
            $this->assertSame(9, $ok->config['music']['start']);

            $spotify = $this->build($this->minimal(event: [...$event, 'musica_inicio' => '99', 'musica_fuente' => 'archivo', 'spotify' => 'https://open.spotify.com/playlist/abc']));
            $this->assertNotSame([], $spotify->errors());
        } finally {
            unlink($dir.'/nueva/media/c.mp3');
            rmdir($dir.'/nueva/media');
            rmdir($dir.'/nueva');
            rmdir($dir);
        }
    }

    public function test_a_section_without_canvas_rows_carries_no_canvas_key(): void
    {
        $result = $this->build($this->fixture());
        foreach ($result->config['sections'] as $section) {
            $this->assertArrayNotHasKey('canvas', $section);
        }
    }

    public function test_the_canvas_carries_existing_and_free_elements_with_their_desktop_values(): void
    {
        $design = $this->minimal([new DesignSection('fecha', ['titulo' => 'Hola'], canvas: [
            ['objetivo' => 'texto:title:0', 'x' => '12,5', 'y' => '-3', 'rotacion' => '-15', 'escala' => '1.2', 'voltear_h' => 'SI', 'oculto' => 'NO', 'capa' => '2', 'e_x' => '40', 'e_oculto' => 'SI'],
            ['tipo' => 'texto', 'texto' => 'Hola', 'letra' => 'Great Vibes', 'tamano' => '6', 'alineacion' => 'centro', 'color' => '#abcdef', 'ancho' => '50', 'opacidad' => '80'],
            ['tipo' => 'imagen', 'imagen' => 'salon.webp', 'radio' => '10', 'borde' => '2'],
            ['tipo' => 'forma', 'forma' => 'circulo', 'color' => 'acento'],
        ])]);
        $result = $this->build($design);
        $canvas = $result->config['sections'][0]['canvas'];

        $this->assertSame([], $result->errors());
        $this->assertSame([], $result->warnings());
        $this->assertSame([
            'id' => 'lienzo-1', 'target' => 'texto:title:0', 'x' => 12.5, 'y' => -3.0, 'rotation' => -15.0, 'scale' => 1.2,
            'flip_h' => true, 'hidden' => false, 'layer' => 2, 'desktop' => ['x' => 40.0, 'hidden' => true],
        ], $canvas[0]);
        $this->assertSame(['id' => 'lienzo-2', 'kind' => 'text', 'text' => 'Hola', 'font' => 'Great Vibes', 'size' => 6.0, 'align' => 'center', 'color' => '#ABCDEF', 'width' => 50.0, 'opacity' => 80.0], $canvas[1]);
        $this->assertSame(['id' => 'lienzo-3', 'kind' => 'image', 'image' => 'https://ejemplo.test/media/nueva/salon.webp', 'radius' => 10.0, 'border' => 2.0], $canvas[2]);
        $this->assertSame('circle', $canvas[3]['shape']);
        $this->assertSame('accent', $canvas[3]['color']);
        $this->assertSame(['Great Vibes'], $result->config['extra_fonts']);
    }

    public function test_canvas_values_are_validated_like_the_rest(): void
    {
        $design = $this->minimal([new DesignSection('fecha', [], canvas: [
            ['objetivo' => 'texto:title:0', 'x' => '500', 'escala' => '0', 'opacidad' => '101', 'rotacion' => '400', 'voltear_h' => 'tal vez', 'capa' => '1.5', 'e_ancho' => '0'],
            ['objetivo' => 'cualquiera'],
            ['x' => '5'],
            ['tipo' => 'texto'],
            ['tipo' => 'forma', 'forma' => 'estrella'],
        ])]);
        $result = $this->build($design, lenient: true);

        $this->assertCount(11, $result->errors());
        $this->assertStringContainsString('lienzo-1 → x', $result->errors()[0]);
        $this->assertSame(['id' => 'lienzo-1', 'target' => 'texto:title:0'], $result->config['sections'][0]['canvas'][0]);
        $this->assertCount(1, $result->config['sections'][0]['canvas']);
    }
}
