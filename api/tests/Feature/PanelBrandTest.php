<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class PanelBrandTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        config(['invitaciones.frontend_url' => 'https://invitaciones.test']);
    }

    /** @return array<string, string> */
    private function auth(): array
    {
        $token = $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])
            ->assertOk()
            ->json('token');

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_the_login_shows_the_big_title_and_the_colors_without_private_data(): void
    {
        $brand = $this->getJson('/api/admin/events/prueba/brand')->assertOk()->json('brand');

        $this->assertSame('XV de Fes', $brand['title']);
        $this->assertSame('jardin-azul', $brand['theme']);
        $this->assertArrayHasKey('palette', $brand);
        $this->assertArrayHasKey('fonts', $brand);
        // Sin sesión: ni fotos ni datos del evento.
        $this->assertSame(['title', 'theme', 'palette', 'fonts'], array_keys($brand));
    }

    public function test_the_layout_can_choose_the_panel_title(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'titulo_panel,Los XV de Fes');

        $this->getJson('/api/admin/events/prueba/brand')->assertOk()->assertJsonPath('brand.title', 'Los XV de Fes');
    }

    public function test_an_unknown_event_has_no_brand(): void
    {
        $this->getJson('/api/admin/events/no-existe/brand')->assertNotFound();
    }

    public function test_with_a_session_the_panel_gets_what_the_whatsapp_image_needs(): void
    {
        $headers = $this->auth();
        $this->postJson('/api/admin/events/prueba/invitations', ['passes' => 2, 'label' => 'Familia Pérez'], $headers)->assertCreated();

        $panel = $this->getJson('/api/admin/events/prueba', $headers)->assertOk();

        $panel->assertJsonPath('brand.title', 'XV de Fes')
            ->assertJsonPath('brand.subtitle', 'mis xv años')
            ->assertJsonPath('brand.celebrant.short_name', 'Fes')
            ->assertJsonPath('brand.venue.name', 'Salón Prueba')
            ->assertJsonPath('brand.timezone', 'America/Mexico_City');
        $this->assertArrayHasKey('assets', $panel->json('brand'));
        $this->assertSame(['background' => null, 'phrase' => null, 'text' => null], $panel->json('brand.card'));

        $invitation = collect($panel->json('invitations'))->firstWhere('label', 'Familia Pérez');
        $this->assertSame("¡Hola, Familia Pérez! Te compartimos tu invitación (2 pases): {$invitation['url']}", $invitation['message']);
        $this->assertStringContainsString(rawurlencode($invitation['message']), $invitation['whatsapp_url']);
    }

    public function test_the_layout_chooses_the_background_and_phrase_of_the_whatsapp_image(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'tarjeta_fondo,sobre-azul.webp');
        $this->appendLine('prueba', 'evento.csv', 'tarjeta_frase,Celebremos juntos');
        $this->appendLine('prueba', 'evento.csv', 'tarjeta_texto,esta etapa tan especial');

        $this->getJson('/api/admin/events/prueba', $this->auth())->assertOk()->assertJsonPath('brand.card', [
            'background' => 'sobre-azul.webp',
            'phrase' => 'Celebremos juntos',
            'text' => 'esta etapa tan especial',
        ]);
        // La entrada al panel no lo trae.
        $this->assertArrayNotHasKey('card', $this->getJson('/api/admin/events/prueba/brand')->json('brand'));
    }

    public function test_the_panel_page_already_carries_its_colors(): void
    {
        $spa = storage_path('framework/testing/app-'.bin2hex(random_bytes(4)).'.html');
        @mkdir(dirname($spa), 0775, true);
        file_put_contents($spa, '<!DOCTYPE html><html><head></head><body></body></html>');
        config(['invitaciones.spa_path' => $spa]);
        $this->beforeApplicationDestroyed(fn () => @unlink($spa));

        $html = (string) $this->get('/panel/prueba')->assertOk()->getContent();
        $this->assertMatchesRegularExpression('#<script>window\.__BOOT__=(.*?)</script></head>#s', $html);
        preg_match('#window\.__BOOT__=(.*?)</script>#s', $html, $m);
        $boot = json_decode($m[1], true);

        $this->assertSame(['kind' => 'panel', 'key' => 'prueba'], ['kind' => $boot['kind'], 'key' => $boot['key']]);
        $this->assertSame('XV de Fes', $boot['data']['brand']['title']);
        $this->assertArrayNotHasKey('assets', $boot['data']['brand']);
    }
}
