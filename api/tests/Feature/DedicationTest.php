<?php

namespace Tests\Feature;

use App\Services\Invitations\DedicationStore;
use Carbon\CarbonImmutable;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class DedicationTest extends TestCase
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

    private function send(string $token, string $name, string $message): TestResponse
    {
        return $this->postJson("/api/public/invitations/{$token}/dedication", ['name' => $name, 'message' => $message]);
    }

    public function test_each_link_leaves_one_dedication_that_shows_up_in_its_invitation(): void
    {
        $this->send('Fam1Token001', '  Ana   Prueba ', "¡Muchas felicidades!\r\n\r\n\r\nTe queremos.")
            ->assertOk()
            ->assertJsonPath('invitation.dedication', [
                'name' => 'Ana Prueba',
                'message' => "¡Muchas felicidades!\n\nTe queremos.",
                'sent_at' => '2026-10-13T12:00:00-06:00',
            ]);

        $this->assertSame(
            [['invitacion' => '1', 'para' => 'Familia Prueba', 'nombre' => 'Ana Prueba', 'dedicatoria' => "¡Muchas felicidades!\n\nTe queremos.", 'fecha' => '2026-10-13 12:00:00']],
            $this->readCsv('prueba', DedicationStore::FILE),
        );
        $raw = file_get_contents("{$this->eventos}/prueba/".DedicationStore::FILE);
        $this->assertStringStartsWith("\xEF\xBB\xBFinvitacion,para,nombre,dedicatoria,fecha\r\n", $raw);

        // Al volver a abrir el enlace, la dedicatoria ya está ahí; las otras invitaciones no tienen.
        $this->getJson('/api/public/invitations/Fam1Token001')->assertJsonPath('invitation.dedication.name', 'Ana Prueba');
        $this->getJson('/api/public/invitations/Fam2Token002')->assertJsonPath('invitation.dedication', null);
    }

    public function test_a_second_dedication_from_the_same_link_is_rejected_and_the_first_stays(): void
    {
        $this->send('Fam1Token001', 'Ana Prueba', 'Primera')->assertOk();
        $this->send('Fam1Token001', 'Luis Prueba', 'Segunda')
            ->assertStatus(409)
            ->assertJsonPath('message', 'Ya enviaste tu dedicatoria. ¡Gracias!');

        $rows = $this->readCsv('prueba', DedicationStore::FILE);
        $this->assertCount(1, $rows);
        $this->assertSame('Primera', $rows[0]['dedicatoria']);

        $this->send('Fam2Token002', 'Eva Prueba', 'Otra familia')->assertOk();
        $this->assertCount(2, $this->readCsv('prueba', DedicationStore::FILE));
    }

    public function test_name_and_message_are_validated(): void
    {
        $this->send('Fam1Token001', '', '   ')
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Escribe tu nombre.')
            ->assertJsonPath('errors.message.0', 'Escribe tu dedicatoria.');
        $this->send('Fam1Token001', str_repeat('a', DedicationStore::MAX_NAME + 1), str_repeat('b', DedicationStore::MAX_MESSAGE + 1))
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Tu nombre es muy largo (máximo 80 letras).')
            ->assertJsonPath('errors.message.0', 'Tu dedicatoria es muy larga (máximo 600 letras).');
        $this->send('Fam1Token001', 'Ana', "\x01\x02")
            ->assertStatus(422)
            ->assertJsonPath('errors.message.0', 'Escribe tu dedicatoria.');

        $this->assertSame([], $this->readCsv('prueba', DedicationStore::FILE));
    }

    public function test_unknown_links_cannot_leave_dedications(): void
    {
        $this->send('NoExiste0000', 'Ana', 'Hola')->assertNotFound();
    }

    public function test_dedications_are_still_accepted_after_the_rsvp_deadline(): void
    {
        CarbonImmutable::setTestNow('2026-11-20 12:00:00 America/Mexico_City');
        $this->send('Fam1Token001', 'Ana Prueba', 'Felicidades')->assertOk();
    }

    public function test_text_that_looks_like_a_formula_is_safe_in_excel_and_shown_as_written(): void
    {
        $this->send('Fam1Token001', '=Ana', '=HYPERLINK("x")')
            ->assertOk()
            ->assertJsonPath('invitation.dedication.name', '=Ana')
            ->assertJsonPath('invitation.dedication.message', '=HYPERLINK("x")');

        $row = $this->readCsv('prueba', DedicationStore::FILE)[0];
        $this->assertSame("'=Ana", $row['nombre']);
        $this->assertSame("'=HYPERLINK(\"x\")", $row['dedicatoria']);
    }

    public function test_the_owner_sees_the_dedications_in_the_panel_newest_first(): void
    {
        $this->send('Fam1Token001', 'Ana Prueba', 'Primera')->assertOk();
        CarbonImmutable::setTestNow('2026-10-14 09:30:00 America/Mexico_City');
        $this->send('Fam2Token002', 'Eva Prueba', 'Segunda')->assertOk();

        $token = $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])->json('token');
        $this->getJson('/api/admin/events/prueba', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('dedications', [
                ['invitation' => '2', 'label' => null, 'name' => 'Eva Prueba', 'message' => 'Segunda', 'sent_at' => '2026-10-14T09:30:00-06:00'],
                ['invitation' => '1', 'label' => 'Familia Prueba', 'name' => 'Ana Prueba', 'message' => 'Primera', 'sent_at' => '2026-10-13T12:00:00-06:00'],
            ]);
    }

    public function test_sending_is_throttled(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->send('Fam3Token003', '', '')->assertStatus(422);
        }
        $this->send('Fam3Token003', 'Ana', 'Hola')->assertStatus(429);
    }
}
