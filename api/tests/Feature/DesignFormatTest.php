<?php

namespace Tests\Feature;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/**
 * Un evento en el formato nuevo (invitacion.csv + ajustes.csv) funciona igual que uno del
 * Excel de antes en todo lo público: invitación general y personal, confirmar, panel del
 * dueño, la imagen para WhatsApp y el clima.
 */
class DesignFormatTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        config(['invitaciones.frontend_url' => 'https://invitaciones.test']);
    }

    private function login(string $slug = 'nueva', string $password = 'clave-de-prueba-nueva'): string
    {
        return $this->postJson("/api/admin/events/{$slug}/session", ['password' => $password])->assertOk()->json('token');
    }

    public function test_the_public_invitation_reads_the_new_format(): void
    {
        $event = $this->getJson('/api/public/events/nueva')->assertOk()->json('event');

        $this->assertSame('jardin-azul', $event['theme']);
        $this->assertSame(['portada', 'bendicion', 'foto', 'itinerario', 'vestimenta'], array_column($event['sections'], 'key'));
        $this->assertSame(url('/media/nueva/salon.webp'), $event['venue']['photo']);
        $this->assertSame(['size' => 1.2], $event['sections'][3]['text_styles']['time']);
        $this->assertArrayNotHasKey('clave_panel', $event);
        $this->assertStringNotContainsString('clave-de-prueba-nueva', $this->getJson('/api/public/events/nueva')->getContent());
    }

    public function test_a_personal_link_works_and_guests_can_confirm(): void
    {
        $this->getJson('/api/public/invitations/NuevaToken01')
            ->assertOk()
            ->assertJsonPath('invitation.label', 'Familia Nueva')
            ->assertJsonPath('event.slug', 'nueva');

        $this->postJson('/api/public/invitations/NuevaToken01/rsvp', ['attending' => true, 'guests' => [['full_name' => 'Ana']]])
            ->assertOk();
        $this->assertSame('Ana', $this->readCsv('nueva', 'respuestas.csv')[0]['nombre']);
    }

    public function test_the_owner_panel_uses_the_password_from_the_settings(): void
    {
        $this->postJson('/api/admin/events/nueva/session', ['password' => 'otra-clave'])->assertStatus(422);
        $token = $this->login();

        $panel = $this->withToken($token)->getJson('/api/admin/events/nueva')->assertOk();
        $panel->assertJsonPath('brand.title', 'XV de Nue')
            ->assertJsonPath('brand.palette.accent', '#2F4A7A');
        $this->assertSame('¡Hola, Familia Nueva! https://invitaciones.test/i/NuevaToken01', $panel->json('invitations.0.message'));
    }

    public function test_the_draft_does_not_wake_up_the_owner_panel(): void
    {
        $token = $this->login();
        $version = $this->withToken($token)->getJson('/api/admin/events/nueva/version')->json('version');

        mkdir("{$this->eventos}/nueva/borrador");
        file_put_contents("{$this->eventos}/nueva/borrador/invitacion.csv", "seccion,elemento,campo,valor\r\nevento,,tema,otro\r\n");

        $this->withToken($token)->getJson('/api/admin/events/nueva/version')->assertJsonPath('version', $version);
        // Lo que ven los invitados tampoco cambia hasta publicar.
        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.theme', 'jardin-azul');
    }

    public function test_the_owner_deadline_still_wins(): void
    {
        $token = $this->login();
        $this->withToken($token)->putJson('/api/admin/events/nueva/deadline', ['deadline' => '2026-11-10'])->assertOk();

        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.rsvp.deadline', '2026-11-10');
        // La clave del panel sigue en ajustes.csv junto a la fecha.
        $settings = array_column($this->readCsv('nueva', 'ajustes.csv'), 'valor', 'clave');
        $this->assertSame('clave-de-prueba-nueva', $settings['clave_panel']);
        $this->assertSame('2026-11-10', $settings['rsvp_limite']);
    }

    public function test_hidden_or_template_invitations_are_not_public(): void
    {
        (new CsvFile)->write("{$this->eventos}/nueva/ajustes.csv", ['clave', 'valor'], [['clave' => 'publicado', 'valor' => 'NO']]);
        $this->getJson('/api/public/events/nueva')->assertNotFound();
        $this->getJson('/api/public/invitations/NuevaToken01')->assertNotFound();

        (new CsvFile)->write("{$this->eventos}/nueva/ajustes.csv", ['clave', 'valor'], [['clave' => 'plantilla', 'valor' => 'SI']]);
        $this->getJson('/api/public/events/nueva')->assertNotFound();
        // Una plantilla no tiene panel del cliente.
        $this->postJson('/api/admin/events/nueva/session', ['password' => 'clave-de-prueba-nueva'])->assertStatus(403);
    }

    public function test_errors_in_the_published_file_are_reported_in_spanish(): void
    {
        config(['app.debug' => true]);
        file_put_contents("{$this->eventos}/nueva/invitacion.csv", "seccion,elemento,campo,valor\r\nevento,,tema,jardin-azul\r\nevento,,inicia,mañana\r\n");

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');

        $this->assertSame(["evento → inicia: 'mañana' no es una fecha válida (AAAA-MM-DD HH:MM)"], $errors);
    }

    public function test_the_weather_reads_the_venue_from_the_new_format(): void
    {
        Http::fake(['*' => Http::response(['results' => []])]);
        $this->appendLine('nueva', 'invitacion.csv', 'evento,,clima_coordenadas,"20.1170, -98.7333"');

        $this->assertSame('20.1170, -98.7333', app(EventRepository::class)->eventValue('nueva', 'clima_coordenadas'));
        $this->getJson('/api/public/events/nueva')->assertOk();
    }
}
