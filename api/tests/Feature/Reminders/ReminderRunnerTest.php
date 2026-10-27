<?php

namespace Tests\Feature\Reminders;

use App\Services\Reminders\LogChannel;
use App\Services\Reminders\MetaWhatsAppChannel;
use App\Services\Reminders\ReminderChannel;
use App\Services\Reminders\ReminderResult;
use App\Services\Reminders\ReminderRunner;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CopiesEventFixtures;
use Tests\Concerns\EnablesReminders;
use Tests\TestCase;

class ReminderRunnerTest extends TestCase
{
    use CopiesEventFixtures;
    use EnablesReminders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->enableReminders();
        $this->setPhone('1');
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_the_log_channel_is_the_default_and_a_run_is_idempotent(): void
    {
        $this->assertInstanceOf(LogChannel::class, app(ReminderChannel::class));

        $first = app(ReminderRunner::class)->run();
        $this->assertSame(1, $first['sent']);
        $this->assertSame(0, $first['failed']);
        $this->assertSame(1, $first['events']);

        $rows = $this->readCsv('prueba', 'recordatorios.csv');
        $this->assertCount(1, $rows);
        $this->assertSame(['1', 'enviado'], [$rows[0]['invitacion'], $rows[0]['estado']]);
        $this->assertStringStartsWith('log-', $rows[0]['wamid']);
        $this->assertStringContainsString($rows[0]['wamid'], (string) file_get_contents("{$this->eventos}/_gestor/whatsapp/mensajes.csv"));

        // La segunda corrida del día no manda de nuevo.
        $second = app(ReminderRunner::class)->run();
        $this->assertSame(0, $second['sent']);
        $this->assertCount(1, $this->readCsv('prueba', 'recordatorios.csv'));
    }

    public function test_it_only_sends_inside_the_hours_window(): void
    {
        $night = CarbonImmutable::parse('2026-10-13 22:00:00', 'America/Mexico_City');

        $summary = app(ReminderRunner::class)->run(now: $night);

        $this->assertSame(0, $summary['sent']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame([], $this->readCsv('prueba', 'recordatorios.csv'));
    }

    public function test_the_daily_limit_leaves_the_rest_for_the_next_run(): void
    {
        $this->setPhone('3');
        config(['invitaciones.whatsapp.daily_limit' => 1]);

        $summary = app(ReminderRunner::class)->run();

        $this->assertSame(1, $summary['sent']);
        $this->assertSame(1, $summary['skipped']);
    }

    public function test_dry_run_lists_without_sending_or_writing(): void
    {
        $this->artisan('recordatorios:enviar', ['--probar' => true, '--slug' => 'prueba'])
            ->expectsOutputToContain('prueba: invitación #1')
            ->assertSuccessful();

        $this->assertSame([], $this->readCsv('prueba', 'recordatorios.csv'));
        $this->assertFileDoesNotExist("{$this->eventos}/_gestor/whatsapp/mensajes.csv");

        $this->artisan('recordatorios:enviar')->assertSuccessful();
        $this->assertCount(1, $this->readCsv('prueba', 'recordatorios.csv'));
    }

    public function test_meta_sends_the_template_with_its_parameters(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.ABC']]])]);
        config(['invitaciones.whatsapp' => [...config('invitaciones.whatsapp'), 'driver' => 'meta', 'token' => 'tok', 'phone_number_id' => '999', 'template' => 'recordatorio_rsvp']]);
        $this->assertInstanceOf(MetaWhatsAppChannel::class, app(ReminderChannel::class));

        $summary = app(ReminderRunner::class)->run();

        $this->assertSame(1, $summary['sent']);
        Http::assertSent(function ($request) {
            $template = $request['template'];

            return $request->url() === 'https://graph.facebook.com/v23.0/999/messages'
                && $request->hasHeader('Authorization', 'Bearer tok')
                && $request['messaging_product'] === 'whatsapp'
                && $request['to'] === '525512345678'
                && $request['type'] === 'template'
                && $template['name'] === 'recordatorio_rsvp'
                && $template['language']['code'] === 'es_MX'
                && $template['components'][0]['parameters'] === [
                    ['type' => 'text', 'text' => 'Familia Prueba'],
                    ['type' => 'text', 'text' => 'XV de Fes'],
                    ['type' => 'text', 'text' => '6 de noviembre'],
                ]
                && $template['components'][1] === ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [['type' => 'text', 'text' => 'Fam1Token001']]]
                && $template['components'][2] === ['type' => 'button', 'sub_type' => 'quick_reply', 'index' => '1', 'parameters' => [['type' => 'payload', 'payload' => 'BAJA']]];
        });
        $this->assertSame('wamid.ABC', $this->readCsv('prueba', 'recordatorios.csv')[0]['wamid']);
    }

    public function test_a_token_error_stops_the_run_without_marking_anyone(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['code' => 190, 'message' => 'token']], 400)]);
        config(['invitaciones.whatsapp' => [...config('invitaciones.whatsapp'), 'driver' => 'meta', 'token' => 'vencido', 'phone_number_id' => '999']]);
        $this->setPhone('3');

        $summary = app(ReminderRunner::class)->run();

        $this->assertSame(['sent' => 0, 'failed' => 0, 'stopped' => '190'], ['sent' => $summary['sent'], 'failed' => $summary['failed'], 'stopped' => $summary['stopped']]);
        Http::assertSentCount(1); // no insiste con los demás enlaces
        $this->assertSame([], $this->readCsv('prueba', 'recordatorios.csv'));
    }

    public function test_a_meta_failure_is_logged_with_its_code_and_not_retried_today(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['code' => 131026, 'message' => 'no whatsapp']], 400)]);
        config(['invitaciones.whatsapp' => [...config('invitaciones.whatsapp'), 'driver' => 'meta', 'token' => 'tok', 'phone_number_id' => '999']]);

        $summary = app(ReminderRunner::class)->run();

        $this->assertSame(1, $summary['failed']);
        $row = $this->readCsv('prueba', 'recordatorios.csv')[0];
        $this->assertSame(['fallido', '131026'], [$row['estado'], $row['detalle']]);
        $this->assertSame(0, app(ReminderRunner::class)->run()['failed']);
    }

    public function test_the_channel_returns_a_fatal_result_for_a_401(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response([], 401)]);

        $result = (new MetaWhatsAppChannel(config('invitaciones.whatsapp')))->send('525512345678', ['name' => 'a', 'event' => 'b', 'deadline' => 'c', 'token' => 'd']);

        $this->assertEquals(new ReminderResult(false, null, 'http-401', true), $result);
    }

    public function test_the_internal_endpoint_needs_its_key(): void
    {
        $this->postJson('/api/internal/reminders/run')->assertStatus(503); // sin clave configurada

        config(['invitaciones.whatsapp.run_key' => 'clave-del-cron']);
        $this->postJson('/api/internal/reminders/run')->assertStatus(401);
        $this->postJson('/api/internal/reminders/run', [], ['X-Reminders-Key' => 'otra'])->assertStatus(401);

        $this->postJson('/api/internal/reminders/run', [], ['X-Reminders-Key' => 'clave-del-cron'])
            ->assertOk()
            ->assertJson(['sent' => 1, 'failed' => 0, 'skipped' => 0, 'events' => 1]);
    }
}
