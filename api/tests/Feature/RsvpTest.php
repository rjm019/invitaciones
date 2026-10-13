<?php

namespace Tests\Feature;

use App\Services\Invitations\ResponseStore;
use Carbon\CarbonImmutable;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class RsvpTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /** @param  list<string>  $names */
    private function send(string $token, array $names, bool $attending = true): TestResponse
    {
        return $this->postJson("/api/public/invitations/{$token}/rsvp", [
            'attending' => $attending,
            'guests' => array_map(fn ($n) => ['full_name' => $n], $names),
        ]);
    }

    /** @return list<array<string, string>> renglones de respuestas.csv de una invitación */
    private function rows(string $invitation): array
    {
        return array_values(array_filter(
            $this->readCsv('prueba', ResponseStore::FILE),
            fn ($r) => $r['invitacion'] === $invitation,
        ));
    }

    public function test_filling_part_of_the_invitation_leaves_the_rest_open(): void
    {
        $this->send('Fam1Token001', ['Ana Prueba'])
            ->assertOk()
            ->assertJsonPath('invitation.remaining', 2)
            ->assertJsonPath('invitation.guests.0.full_name', 'Ana Prueba')
            ->assertJsonPath('invitation.guests.0.attending', true);

        $this->assertSame(
            [['invitacion' => '1', 'para' => 'Familia Prueba', 'lugar' => '1', 'nombre' => 'Ana Prueba', 'asistira' => 'SI', 'respondida' => '2026-10-13 12:00:00', 'mesa' => '']],
            $this->rows('1'),
        );

        // Excel: UTF-8 con BOM y CRLF.
        $raw = file_get_contents("{$this->eventos}/prueba/".ResponseStore::FILE);
        $this->assertStringStartsWith("\xEF\xBB\xBFinvitacion,para", $raw);
        $this->assertStringContainsString("respondida,mesa\r\n", $raw);
    }

    public function test_later_names_take_the_free_places_and_earlier_ones_never_change(): void
    {
        $this->send('Fam1Token001', ['Ana Prueba'])->assertOk();
        $this->send('Fam1Token001', ['Luis Prueba'], attending: false)
            ->assertOk()
            ->assertJsonPath('invitation.remaining', 1)
            ->assertJsonPath('invitation.guests', [
                ['slot' => 1, 'full_name' => 'Ana Prueba', 'attending' => true, 'responded_at' => '2026-10-13T12:00:00-06:00'],
                ['slot' => 2, 'full_name' => 'Luis Prueba', 'attending' => false, 'responded_at' => '2026-10-13T12:00:00-06:00'],
            ]);

        $this->assertCount(2, $this->readCsv('prueba', ResponseStore::HISTORY));
        $this->assertFileExists("{$this->eventos}/prueba/respaldos/respuestas-2026-10-13.csv");
        $this->assertCount(1, $this->rows('2')); // la otra invitación sigue igual
    }

    public function test_sending_the_same_name_again_does_not_duplicate_it(): void
    {
        $this->send('Fam1Token001', ['Ana Prueba'])->assertOk();
        $this->send('Fam1Token001', ['  ana   PRUEBA '])->assertOk()->assertJsonPath('invitation.remaining', 2);
        $this->send('Fam1Token001', ['Ana Prueba', 'Eva Prueba'])->assertOk()->assertJsonPath('invitation.remaining', 1);

        $this->assertSame(['Ana Prueba', 'Eva Prueba'], array_column($this->rows('1'), 'nombre'));
    }

    public function test_cannot_send_more_names_than_free_places(): void
    {
        $this->send('Fam2Token002', ['Uno', 'Dos'])
            ->assertStatus(422)
            ->assertJsonPath('errors.guests.0', 'Solo queda 1 lugar en tu invitación.');

        $this->send('Fam3Token003', ['Uno', 'Dos'])
            ->assertStatus(422)
            ->assertJsonPath('errors.guests.0', 'Tu invitación es para 1 persona.');

        $this->send('Fam3Token003', ['Uno'])->assertOk()->assertJsonPath('invitation.remaining', 0);
        $this->send('Fam3Token003', ['Otro'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Tu invitación ya está completa.');

        $this->assertCount(1, $this->rows('2'));
        $this->assertCount(1, $this->rows('3'));
    }

    public function test_validation_messages_are_in_spanish(): void
    {
        $this->send('Fam1Token001', ['Ana Prueba', ''])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['guests.1.full_name' => ['Falta el nombre de la persona 2.']]);

        $this->postJson('/api/public/invitations/Fam1Token001/rsvp', ['guests' => [['full_name' => 'Ana']]])
            ->assertStatus(422)
            ->assertJsonPath('errors.attending.0', 'Dinos si podrás asistir.');

        $this->send('Fam1Token001', [])
            ->assertStatus(422)
            ->assertJsonPath('errors.guests.0', 'Escribe al menos un nombre.');
    }

    public function test_after_the_deadline_only_the_names_already_sent_count(): void
    {
        $this->send('Fam1Token001', ['Ana Prueba'])->assertOk();

        // El último día todavía cuenta (fin del día en la zona del evento)…
        CarbonImmutable::setTestNow('2026-11-06 23:30:00 America/Mexico_City');
        $this->send('Fam1Token001', ['Luis Prueba'])->assertOk();

        // …y al día siguiente se cierra: los lugares vacíos ya no se pueden llenar.
        CarbonImmutable::setTestNow('2026-11-07 00:30:00 America/Mexico_City');
        $this->send('Fam1Token001', ['Eva Prueba'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Las confirmaciones cerraron el 6 de noviembre.');

        $this->getJson('/api/public/invitations/Fam1Token001')
            ->assertOk()
            ->assertJsonPath('invitation.open', false)
            ->assertJsonPath('invitation.closed_message', 'Las confirmaciones cerraron el 6 de noviembre.')
            ->assertJsonPath('invitation.remaining', 1)
            ->assertJsonCount(2, 'invitation.guests');
    }

    public function test_spreadsheet_formulas_are_neutralized(): void
    {
        $formula = '=HYPERLINK("http://malo.test","clic")';
        $this->send('Fam1Token001', [$formula])->assertOk()->assertJsonPath('invitation.guests.0.full_name', $formula);

        $this->assertSame("'".$formula, $this->rows('1')[0]['nombre']);
    }

    public function test_is_throttled_per_invitation(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->send('Fam1Token001', ['Ana Prueba'])->assertOk();
        }
        $this->send('Fam1Token001', ['Ana Prueba'])->assertStatus(429);
    }

    public function test_unknown_token_is_not_found(): void
    {
        $this->send('ZZZZZZZZZZZZ', ['Ana Prueba'])->assertNotFound();
    }
}
