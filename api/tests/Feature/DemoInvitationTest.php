<?php

namespace Tests\Feature;

use App\Services\Invitations\DedicationStore;
use App\Services\Invitations\ResponseStore;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/** Las muestras de la landing (demo=SI en ajustes.csv): se prueba todo y no se guarda nada. */
class DemoInvitationTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-15 12:00:00 America/Mexico_City');
        $this->appendLine('nueva', 'ajustes.csv', 'demo,SI');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_a_demo_says_so_and_does_not_count_visits(): void
    {
        $this->getJson('/api/public/events/nueva')->assertOk()->assertJsonPath('event.demo', true);
        $this->getJson('/api/public/invitations/NuevaToken01')->assertOk()->assertJsonPath('event.demo', true);

        $this->assertFileDoesNotExist("{$this->eventos}/nueva/".ResponseStore::OPENS);
    }

    public function test_confirming_a_demo_answers_as_usual_but_writes_nothing(): void
    {
        $this->postJson('/api/public/invitations/NuevaToken01/rsvp', ['attending' => true, 'guests' => [['full_name' => ' Ana  Muestra ']]])
            ->assertOk()
            ->assertJsonPath('invitation.guests.0.full_name', 'Ana Muestra')
            ->assertJsonPath('invitation.guests.0.slot', 1)
            ->assertJsonPath('invitation.remaining', 1);

        // Con las mismas reglas de cupo (2 lugares).
        $this->postJson('/api/public/invitations/NuevaToken01/rsvp', ['attending' => true, 'guests' => [['full_name' => 'Uno'], ['full_name' => 'Dos'], ['full_name' => 'Tres']]])
            ->assertStatus(422);

        $this->postJson('/api/public/invitations/NuevaToken01/dedication', ['name' => 'Ana', 'message' => '¡Felicidades!'])
            ->assertOk()
            ->assertJsonPath('invitation.dedication.message', '¡Felicidades!');

        // Nada quedó en los archivos: la siguiente visita empieza de cero.
        $this->assertSame([], $this->readCsv('nueva', ResponseStore::FILE));
        $this->assertSame([], $this->readCsv('nueva', DedicationStore::FILE));
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/".ResponseStore::HISTORY);
        $this->getJson('/api/public/invitations/NuevaToken01')->assertJsonPath('invitation.guests', [])->assertJsonPath('invitation.dedication', null);
    }

    public function test_a_normal_invitation_is_not_a_demo(): void
    {
        $this->getJson('/api/public/events/prueba')->assertOk()->assertJsonPath('event.demo', false);
    }
}
