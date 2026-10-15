<?php

namespace Tests\Feature;

use App\Services\Invitations\EventSettings;
use App\Services\Invitations\InvitationStore;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use CopiesEventFixtures;

    private const PASSWORD = 'clave-de-prueba';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        config(['invitaciones.frontend_url' => 'https://invitaciones.test']);
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function login(string $slug = 'prueba', string $password = self::PASSWORD): string
    {
        return $this->postJson("/api/admin/events/{$slug}/session", ['password' => $password])
            ->assertOk()
            ->json('token');
    }

    /** @return array<string, string> */
    private function auth(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_enters_only_with_the_password_of_the_layout(): void
    {
        $this->postJson('/api/admin/events/prueba/session', ['password' => 'otra-clave'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La clave no es correcta.');

        $this->postJson('/api/admin/events/borrador/session', ['password' => self::PASSWORD])
            ->assertForbidden(); // el evento no tiene clave_panel: no hay panel
        $this->postJson('/api/admin/events/no-existe/session', ['password' => self::PASSWORD])
            ->assertNotFound();

        $this->postJson('/api/admin/events/prueba/session', ['password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonStructure(['token', 'expires_at']);
    }

    public function test_guessing_the_password_is_throttled(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/events/prueba/session', ['password' => "intento-{$i}"])->assertStatus(422);
        }
        $this->postJson('/api/admin/events/prueba/session', ['password' => self::PASSWORD])->assertStatus(429);
    }

    public function test_nothing_is_visible_without_a_valid_session(): void
    {
        $this->getJson('/api/admin/events/prueba')->assertUnauthorized();
        $this->getJson('/api/admin/events/prueba', $this->auth('inventado'))->assertUnauthorized();
        $this->postJson('/api/admin/events/prueba/invitations', ['passes' => 2])->assertUnauthorized();

        // Una sesión de otro evento no sirve aquí.
        $this->appendLine('borrador', 'evento.csv', 'clave_panel,otra-clave-larga');
        $other = $this->login('borrador', 'otra-clave-larga');
        $this->getJson('/api/admin/events/prueba', $this->auth($other))->assertUnauthorized();

        // La sesión vence a las 12 horas…
        $token = $this->login();
        $this->getJson('/api/admin/events/prueba', $this->auth($token))->assertOk();
        CarbonImmutable::setTestNow('2026-10-14 00:30:00 America/Mexico_City');
        $this->getJson('/api/admin/events/prueba', $this->auth($token))
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Tu sesión terminó. Escribe la clave de nuevo.');

        // …y si la clave cambia en el Excel, las sesiones abiertas dejan de servir.
        $token = $this->login();
        $evento = "{$this->eventos}/prueba/evento.csv";
        file_put_contents($evento, str_replace('clave-de-prueba', 'clave-nueva-123', (string) file_get_contents($evento)));
        $this->getJson('/api/admin/events/prueba', $this->auth($token))->assertUnauthorized();
    }

    public function test_lists_every_link_with_its_number_of_guests(): void
    {
        $data = $this->getJson('/api/admin/events/prueba', $this->auth($this->login()))->assertOk()->json();

        $this->assertSame(['invitations' => 3, 'seats' => 6, 'attending' => 0, 'declined' => 1, 'empty' => 5], $data['summary']);
        $this->assertSame(['1', '2', '3'], array_column($data['invitations'], 'id'));
        $this->assertSame([3, 2, 1], array_column($data['invitations'], 'passes'));
        $this->assertSame('https://invitaciones.test/i/Fam1Token001', $data['invitations'][0]['url']);
        $this->assertSame(
            [['slot' => 1, 'full_name' => 'Persona Previa', 'attending' => false, 'table' => null, 'responded_at' => '2026-10-01T10:00:00-06:00']],
            $data['invitations'][1]['guests'],
        );
        $this->assertSame(
            ['deadline' => '2026-11-06', 'open' => true, 'changes_used' => 0, 'changes_left' => 3, 'max_changes' => 3],
            $data['rsvp'],
        );
    }

    public function test_generates_a_link_for_the_number_of_guests(): void
    {
        $token = $this->login();

        $invitation = $this->postJson('/api/admin/events/prueba/invitations', ['passes' => 4, 'label' => ' Familia  Nueva '], $this->auth($token))
            ->assertCreated()
            ->json('invitation');

        $this->assertSame(['4', 'Familia Nueva', 4, []], [$invitation['id'], $invitation['label'], $invitation['passes'], $invitation['guests']]);
        $this->assertMatchesRegularExpression('#^https://invitaciones\.test/i/[A-Za-z0-9]{12}$#', $invitation['url']);
        $this->assertSame(
            'https://wa.me/?text='.rawurlencode("¡Hola, Familia Nueva! Te compartimos tu invitación (4 pases): {$invitation['url']}"),
            $invitation['whatsapp_url'],
        );

        // El enlace abre la invitación con 4 lugares.
        $public = basename($invitation['url']);
        $this->getJson("/api/public/invitations/{$public}")->assertOk()->assertJsonPath('invitation.passes', 4);

        // Sin nombre también se puede.
        $this->postJson('/api/admin/events/prueba/invitations', ['passes' => 1], $this->auth($token))
            ->assertCreated()
            ->assertJsonPath('invitation.label', null);
        $this->assertCount(5, $this->readCsv('prueba', InvitationStore::FILE));
    }

    public function test_the_number_of_guests_is_validated(): void
    {
        $token = $this->login();
        foreach ([0, 31, 'tres', null] as $passes) {
            $this->postJson('/api/admin/events/prueba/invitations', ['passes' => $passes], $this->auth($token))
                ->assertStatus(422)
                ->assertJsonPath('errors.passes.0', 'Escribe para cuántos invitados es (de 1 a 30).');
        }
    }

    public function test_the_deadline_can_change_only_three_times(): void
    {
        $token = $this->login();
        $change = fn (string $date) => $this->putJson('/api/admin/events/prueba/deadline', ['deadline' => $date], $this->auth($token));

        $change('2026-10-12')->assertStatus(422)->assertJsonPath('errors.deadline.0', 'La fecha límite no puede ser antes de hoy.');
        $change('2026-11-29')->assertStatus(422)->assertJsonPath('errors.deadline.0', 'La fecha límite no puede ser después del evento.');
        $change('2026-11-06')->assertStatus(422)->assertJsonPath('errors.deadline.0', 'Esa ya es la fecha límite.');
        $change('mañana')->assertStatus(422)->assertJsonPath('errors.deadline.0', 'Elige una fecha válida.');

        $change('2026-11-10')->assertOk()->assertJsonPath('rsvp.changes_left', 2)->assertJsonPath('rsvp.deadline', '2026-11-10');
        $change('2026-11-12')->assertOk()->assertJsonPath('rsvp.changes_left', 1);
        $change('2026-11-08')->assertOk()->assertJsonPath('rsvp.changes_left', 0);
        $change('2026-11-09')->assertStatus(409)->assertJsonPath('message', 'Ya usaste los 3 cambios de fecha límite.');

        // El cambio vive en ajustes.csv (el Excel del dueño no se toca) y aplica en todos lados.
        $this->assertSame('2026-11-08', array_column($this->readCsv('prueba', EventSettings::FILE), 'valor', 'clave')['rsvp_limite']);
        $this->assertCount(3, $this->readCsv('prueba', EventSettings::HISTORY));
        $this->assertSame('panel', $this->readCsv('prueba', EventSettings::HISTORY)[0]['usuario']);
        $this->getJson('/api/public/events/prueba')->assertJsonPath('event.rsvp.deadline', '2026-11-08');

        CarbonImmutable::setTestNow('2026-11-08 20:00:00 America/Mexico_City');
        $this->postJson('/api/public/invitations/Fam1Token001/rsvp', ['attending' => true, 'guests' => [['full_name' => 'Ana']]])
            ->assertOk(); // el 7 ya habría estado cerrado con la fecha original
    }

    public function test_the_version_changes_only_when_something_happens(): void
    {
        $token = $this->login();
        $version = fn () => $this->getJson('/api/admin/events/prueba/version', $this->auth($token))->assertOk()->json('version');

        $first = $version();
        $this->assertSame($first, $version());
        $this->assertSame($first, $this->getJson('/api/admin/events/prueba', $this->auth($token))->json('version'));

        // Un invitado abre su invitación → cambia (el panel se actualiza solo).
        $this->getJson('/api/public/invitations/Fam1Token001')->assertOk();
        $afterOpen = $version();
        $this->assertNotSame($first, $afterOpen);

        // Un invitado confirma → cambia otra vez.
        $this->postJson('/api/public/invitations/Fam1Token001/rsvp', ['attending' => true, 'guests' => [['full_name' => 'Ana']]])->assertOk();
        $this->assertNotSame($afterOpen, $version());
    }

    public function test_assigns_tables_to_confirmed_guests(): void
    {
        $token = $this->login();
        $this->postJson('/api/public/invitations/Fam1Token001/rsvp', [
            'attending' => true,
            'guests' => [['full_name' => 'Ana Prueba'], ['full_name' => 'Luis Prueba']],
        ])->assertOk();
        $tables = fn (array $assignments) => $this->putJson('/api/admin/events/prueba/tables', ['assignments' => $assignments], $this->auth($token));

        // Toda la invitación a la mesa 5 de una vez; luego Luis a la 7.
        $tables([['invitation' => '1', 'slot' => 1, 'table' => 5], ['invitation' => '1', 'slot' => 2, 'table' => 5]])
            ->assertOk()
            ->assertJsonPath('invitations.0.guests.0.table', 5)
            ->assertJsonPath('invitations.0.guests.1.table', 5);
        $tables([['invitation' => '1', 'slot' => 2, 'table' => 7]])->assertOk();

        $rows = array_values(array_filter($this->readCsv('prueba', 'respuestas.csv'), fn ($r) => $r['invitacion'] === '1'));
        $this->assertSame(['5', '7'], array_column($rows, 'mesa'));

        // Quitar la mesa.
        $tables([['invitation' => '1', 'slot' => 2, 'table' => null]])->assertOk()->assertJsonPath('invitations.0.guests.1.table', null);
    }

    public function test_table_assignments_are_validated(): void
    {
        $token = $this->login();
        $tables = fn (array $assignments) => $this->putJson('/api/admin/events/prueba/tables', ['assignments' => $assignments], $this->auth($token));

        $tables([['invitation' => '1', 'slot' => 1, 'table' => 5]])
            ->assertStatus(422)
            ->assertJsonPath('message', 'La invitación #1 no tiene a nadie en el lugar 1.');
        $tables([['invitation' => '2', 'slot' => 1, 'table' => 5]])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Persona Previa no asistirá: no necesita mesa.');
        $tables([['invitation' => '2', 'slot' => 1, 'table' => 0]])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['assignments.0.table' => ['La mesa debe ser un número de 1 a 999.']]);
        $this->putJson('/api/admin/events/prueba/tables', ['assignments' => [['invitation' => '2', 'slot' => 1, 'table' => 5]]])
            ->assertUnauthorized();
    }

    public function test_the_password_never_reaches_the_public_invitation(): void
    {
        $this->assertStringNotContainsString(self::PASSWORD, $this->getJson('/api/public/events/prueba')->getContent());
        $this->assertStringNotContainsString(self::PASSWORD, $this->getJson('/api/public/invitations/Fam1Token001')->getContent());
    }

    public function test_a_short_password_is_a_layout_error(): void
    {
        $evento = "{$this->eventos}/prueba/evento.csv";
        file_put_contents($evento, str_replace('clave-de-prueba', 'corta', (string) file_get_contents($evento)));
        config(['app.debug' => true]);

        $this->getJson('/api/public/events/prueba')
            ->assertStatus(503)
            ->assertJsonPath('errors.0', 'evento → clave_panel: usa al menos 8 caracteres');
    }
}
