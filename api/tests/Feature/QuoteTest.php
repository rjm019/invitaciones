<?php

namespace Tests\Feature;

use App\Mail\NewQuote;
use App\Services\Quotes\QuoteNotifier;
use App\Services\Quotes\QuoteStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class QuoteTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-15 18:30:00 America/Mexico_City');
        config(['invitaciones.cotizaciones_correo' => 'ventas@prueba.test']);
        Mail::fake();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /** @param  array<string, mixed>  $data */
    private function quote(array $data = []): TestResponse
    {
        return $this->postJson('/api/public/quotes', $data + [
            'telefono' => '55 1234 5678',
            'nombre' => '  Valeria   Ruiz ',
            'tipo' => 'boda',
            'fecha_evento' => '2027-03-20',
            'idea' => "Algo sencillo,\r\ncon muchas flores.",
            'pagina' => '/invitaciones-digitales-boda',
            'privacidad' => '1',
            'empresa' => '',
            't' => (int) (microtime(true) * 1000) - 20_000,
        ]);
    }

    /** @return list<array<string, string>> */
    private function saved(): array
    {
        return $this->readCsv('_gestor', QuoteStore::FILE);
    }

    public function test_a_quote_is_saved_and_announced_by_mail(): void
    {
        $this->quote()->assertCreated()->assertJson(['ok' => true]);

        $rows = $this->saved();
        $this->assertCount(1, $rows);
        $this->assertSame(
            ['1', '2026-10-15 18:30:00', 'Valeria Ruiz', '+525512345678', 'boda', '2027-03-20', "Algo sencillo,\ncon muchas flores.", '/invitaciones-digitales-boda', 'nueva'],
            [$rows[0]['id'], $rows[0]['fecha'], $rows[0]['nombre'], $rows[0]['telefono'], $rows[0]['tipo'], $rows[0]['fecha_evento'], $rows[0]['idea'], $rows[0]['pagina'], $rows[0]['estado']],
        );

        Mail::assertSent(NewQuote::class, function (NewQuote $mail) {
            return $mail->hasTo('ventas@prueba.test')
                && $mail->envelope()->subject === 'Nueva cotización: Boda · Valeria Ruiz'
                && str_contains(QuoteNotifier::body($mail->quote), 'https://wa.me/525512345678');
        });
    }

    public function test_without_a_mail_address_it_only_stays_in_the_manager(): void
    {
        config(['invitaciones.cotizaciones_correo' => '']);
        $this->quote()->assertCreated();
        $this->assertCount(1, $this->saved());
        Mail::assertNothingSent();
    }

    public function test_phone_numbers_are_normalized(): void
    {
        $cases = [
            '55 1234 5678' => '+525512345678',
            '(55) 1234-5678' => '+525512345678',
            '+52 1 55 1234 5678' => '+525512345678',
            '5215512345678' => '+525512345678',
            '+1 415 555 0100' => '+14155550100',
            '0034 612 345 678' => '+34612345678',
            '12345' => null,
            '55 1234 567' => null,
            'llámame' => null,
        ];
        foreach ($cases as $input => $expected) {
            $this->assertSame($expected, QuoteStore::normalizePhone($input), $input);
        }
    }

    public function test_the_form_is_validated_in_spanish(): void
    {
        $this->quote(['telefono' => '123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.telefono.0', 'Revisa tu número: 10 dígitos (por ejemplo 55 1234 5678).');
        $this->quote(['telefono' => ''])->assertStatus(422)->assertJsonPath('errors.telefono.0', 'Escribe tu WhatsApp o teléfono.');
        $this->quote(['tipo' => 'fiesta'])->assertStatus(422)->assertJsonPath('errors.tipo.0', 'Elige qué celebras.');
        $this->quote(['privacidad' => '0'])
            ->assertStatus(422)
            ->assertJsonPath('errors.privacidad.0', 'Necesitamos que aceptes el aviso de privacidad para escribirte.');
        $this->assertSame([], $this->saved());
    }

    public function test_robots_are_answered_as_usual_but_nothing_is_saved(): void
    {
        $this->quote(['empresa' => 'Spam S.A.'])->assertCreated();
        $this->quote(['t' => (int) (microtime(true) * 1000) - 500])->assertCreated(); // medio segundo: nadie escribe tan rápido
        $this->assertSame([], $this->saved());
        Mail::assertNothingSent();
    }

    public function test_quotes_are_throttled_per_hour(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->quote()->assertCreated();
        }
        $this->quote()->assertStatus(429);
        $this->assertCount(5, $this->saved());
    }

    public function test_without_javascript_the_form_goes_to_the_thank_you_page(): void
    {
        $this->post('/api/public/quotes', ['telefono' => '5512345678', 'tipo' => 'xv', 'privacidad' => 'on'])
            ->assertRedirect('/cotizacion-enviada');
        $this->post('/api/public/quotes', ['telefono' => '12', 'tipo' => 'xv', 'privacidad' => 'on'])
            ->assertRedirect('/#cotizar');
        $this->assertCount(1, $this->saved());
    }

    public function test_who_administers_follows_up_the_quotes(): void
    {
        $this->quote()->assertCreated();
        $this->quote(['nombre' => '', 'tipo' => 'xv', 'telefono' => '3312345678'])->assertCreated();

        $list = $this->asManager()->getJson('/api/manager/quotes')->assertOk()->json();
        $this->assertSame(2, $list['new']);
        $this->assertSame(['2', '1'], array_column($list['quotes'], 'id')); // la más reciente primero
        $this->assertSame(
            ['id' => '2', 'created_at' => '2026-10-15T18:30:00-06:00', 'name' => null, 'phone' => '+523312345678', 'type' => 'xv', 'event_date' => '2027-03-20', 'idea' => "Algo sencillo,\ncon muchas flores.", 'page' => '/invitaciones-digitales-boda', 'status' => 'nueva', 'note' => null, 'handled_by' => null, 'updated_at' => null],
            $list['quotes'][0],
        );

        $this->putJson('/api/manager/quotes/1', ['status' => 'contactada', 'note' => 'Le escribí; quiere verla el lunes.'])
            ->assertOk()
            ->assertJsonPath('quote.status', 'contactada')
            ->assertJsonPath('quote.note', 'Le escribí; quiere verla el lunes.')
            ->assertJsonPath('quote.handled_by', 'ana');
        $this->putJson('/api/manager/quotes/1', ['status' => 'perdida'])->assertStatus(422);
        $this->putJson('/api/manager/quotes/9', ['status' => 'cerrada'])->assertNotFound();
        $this->getJson('/api/manager/quotes/count')->assertOk()->assertJson(['new' => 1]);

        // Descargar para Excel y borrar a petición de la persona.
        $csv = $this->get('/api/manager/quotes/export')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBFid,fecha,nombre,telefono", $csv);
        $this->deleteJson('/api/manager/quotes/2')->assertNoContent();
        $this->deleteJson('/api/manager/quotes/2')->assertNotFound();
        $this->assertSame(['1'], array_column($this->saved(), 'id'));
    }

    public function test_only_who_administers_sees_the_quotes(): void
    {
        $this->getJson('/api/manager/quotes')->assertUnauthorized();
        $this->asManager('beto', 'editor');
        $this->getJson('/api/manager/quotes')->assertForbidden()->assertJsonPath('message', 'Solo quien administra el gestor puede ver esto.');
        $this->putJson('/api/manager/quotes/1', ['status' => 'cerrada'])->assertForbidden();
        $this->deleteJson('/api/manager/quotes/1')->assertForbidden();
    }
}
