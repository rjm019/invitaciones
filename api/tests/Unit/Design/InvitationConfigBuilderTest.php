<?php

namespace Tests\Unit\Design;

use App\Services\Design\BuildResult;
use App\Services\Design\Design;
use App\Services\Design\DesignFile;
use App\Services\Design\DesignSection;
use App\Services\Design\InvitationConfigBuilder;
use Carbon\CarbonImmutable;
use Tests\TestCase;

class InvitationConfigBuilderTest extends TestCase
{
    private const MEDIA = ['salon.webp' => 'https://ejemplo.test/media/nueva/salon.webp'];

    private function build(Design $design, array $settings = [], bool $lenient = false): BuildResult
    {
        return app(InvitationConfigBuilder::class)->build('nueva', $design, self::MEDIA, $settings, $lenient, CarbonImmutable::parse('2026-10-14 12:00', 'America/Mexico_City'));
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
}
