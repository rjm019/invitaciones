<?php

namespace Tests\Feature\Reminders;

use App\Services\Reminders\ReminderLog;
use App\Services\Reminders\ReminderRunner;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\Concerns\EnablesReminders;
use Tests\TestCase;

class WhatsAppWebhookTest extends TestCase
{
    use CopiesEventFixtures;
    use EnablesReminders;

    private const SECRET = 'secreto-de-prueba';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->enableReminders();
        $this->setPhone('1');
        config(['invitaciones.whatsapp.app_secret' => self::SECRET, 'invitaciones.whatsapp.verify_token' => 'verifica']);
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
        app(ReminderRunner::class)->run(); // manda al enlace 1 y lo indexa
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function wamid(): string
    {
        return $this->readCsv('prueba', 'recordatorios.csv')[0]['wamid'];
    }

    /** @param  array<string, mixed>  $value */
    private function signed(array $value, ?string $secret = self::SECRET)
    {
        $body = json_encode(['entry' => [['changes' => [['value' => $value]]]]]);
        $signature = 'sha256='.hash_hmac('sha256', $body, $secret ?? '');

        return $this->call('POST', '/api/webhooks/whatsapp', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_X_HUB_SIGNATURE_256' => $signature,
        ], $body);
    }

    public function test_meta_verifies_the_webhook_with_the_token(): void
    {
        $this->get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=1234')
            ->assertOk()->assertSee('1234', false)->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
        $this->get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=mal&hub.challenge=1234')->assertForbidden();
        $this->get('/api/webhooks/whatsapp')->assertForbidden();
    }

    public function test_a_bad_signature_is_rejected_and_nothing_is_saved(): void
    {
        $this->signed(['statuses' => [['id' => $this->wamid(), 'status' => 'read']]], 'otro-secreto')->assertStatus(401);
        $this->postJson('/api/webhooks/whatsapp', ['entry' => []])->assertStatus(401);

        $this->assertCount(1, $this->readCsv('prueba', 'recordatorios.csv'));
    }

    public function test_statuses_become_rows_of_their_event(): void
    {
        $id = $this->wamid();
        $this->signed(['statuses' => [['id' => $id, 'status' => 'sent']]])->assertOk(); // ya está como "enviado"
        $this->signed(['statuses' => [['id' => $id, 'status' => 'delivered'], ['id' => 'desconocido', 'status' => 'read']]])->assertOk();
        $this->signed(['statuses' => [['id' => $id, 'status' => 'failed', 'errors' => [['code' => 131026]]]]])->assertOk();

        $rows = $this->readCsv('prueba', 'recordatorios.csv');
        $this->assertSame(['enviado', 'entregado', 'fallido'], array_column($rows, 'estado'));
        $this->assertSame('131026', $rows[2]['detalle']);
        $this->assertSame('1', $rows[2]['invitacion']);
    }

    public function test_the_unsubscribe_button_and_the_word_baja_opt_out_the_phone(): void
    {
        $id = $this->wamid();
        $this->signed(['messages' => [[
            'from' => '5215512345678', 'type' => 'button', 'button' => ['payload' => 'BAJA', 'text' => 'Ya no recibir'], 'context' => ['id' => $id],
        ]]])->assertOk();

        $this->assertSame('baja', $this->readCsv('prueba', 'recordatorios.csv')[1]['estado']);
        $opted = app(ReminderLog::class)->optedOut();
        $this->assertSame(['525512345678' => true], $opted);

        // Escribir "baja" también cuenta (sin contexto: solo queda el teléfono); otro texto, no.
        $this->signed(['messages' => [
            ['from' => '525599998888', 'type' => 'text', 'text' => ['body' => ' Ba ja ']],
            ['from' => '525511112222', 'type' => 'text', 'text' => ['body' => 'gracias']],
        ]])->assertOk();
        $this->assertSame(['525512345678', '525599998888'], array_map('strval', array_keys(app(ReminderLog::class)->optedOut())));
        $this->assertCount(2, $this->readCsv('prueba', 'recordatorios.csv'));
    }
}
