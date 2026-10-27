<?php

namespace Tests\Feature\Reminders;

use App\Services\Invitations\EventSettings;
use Carbon\CarbonImmutable;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\Concerns\EnablesReminders;
use Tests\TestCase;

class ReminderPanelTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;
    use EnablesReminders;

    private const BASE = '/api/admin/events/prueba';

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

    /** @return array<string, string> */
    private function auth(): array
    {
        $token = $this->postJson(self::BASE.'/session', ['password' => 'clave-de-prueba'])->assertOk()->json('token');

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_with_the_function_off_the_panel_is_the_same_as_before(): void
    {
        $overview = $this->getJson(self::BASE, $this->auth())->assertOk();

        $overview->assertJsonPath('reminders', null)->assertJsonPath('invitations.0.phone', null)->assertJsonPath('invitations.0.reminder', null);
        $this->assertStringStartsWith('https://wa.me/?text=', $overview->json('invitations.0.whatsapp_url'));

        $headers = $this->auth();
        $this->putJson(self::BASE.'/invitations/1/phone', ['phone' => '5512345678'], $headers)
            ->assertForbidden()->assertJsonPath('message', 'Los recordatorios por WhatsApp no están activos en esta invitación.');
        $this->putJson(self::BASE.'/reminders', ['every_days' => 3, 'consent' => true], $headers)->assertForbidden();

        // Crear con teléfono: se ignora (no se guarda).
        $this->postJson(self::BASE.'/invitations', ['passes' => 2, 'phone' => '5512345678'], $headers)->assertCreated()->assertJsonPath('invitation.phone', null);
        $this->assertSame('', $this->readCsv('prueba', 'invitaciones.csv')[3]['telefono']);
    }

    public function test_phone_on_create_and_edit_and_in_the_whatsapp_link(): void
    {
        $this->enableReminders(['recordatorio_cada_dias' => null, 'recordatorio_permiso' => null]);
        $headers = $this->auth();

        $created = $this->postJson(self::BASE.'/invitations', ['passes' => 2, 'label' => 'Tía Ana', 'phone' => '55 1234 5678'], $headers)
            ->assertCreated()
            ->assertJsonPath('invitation.phone', '525512345678')
            ->assertJsonPath('invitation.reminder.status', 'waiting');
        $this->assertStringStartsWith('https://wa.me/525512345678?text=', $created->json('invitation.whatsapp_url'));

        $this->postJson(self::BASE.'/invitations', ['passes' => 2, 'phone' => '123'], $headers)
            ->assertStatus(422)->assertJsonPath('errors.phone.0', 'Escribe un teléfono de 10 dígitos o con lada internacional (+…).');

        $this->putJson(self::BASE.'/invitations/1/phone', ['phone' => '+52 1 55 9999 8888'], $headers)
            ->assertOk()->assertJsonPath('invitations.0.phone', '525599998888');
        $this->putJson(self::BASE.'/invitations/1/phone', ['phone' => 'hola'], $headers)->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->putJson(self::BASE.'/invitations/99/phone', ['phone' => '5512345678'], $headers)->assertNotFound();
        $this->putJson(self::BASE.'/invitations/1/phone', ['phone' => null], $headers)->assertOk()->assertJsonPath('invitations.0.phone', null);
        $this->assertSame('', $this->readCsv('prueba', 'invitaciones.csv')[0]['telefono']);
    }

    public function test_the_reminders_card_data_and_consent(): void
    {
        $this->enableReminders(['recordatorio_cada_dias' => null, 'recordatorio_permiso' => null]);
        $this->setPhone('1');
        $headers = $this->auth();

        $r = $this->getJson(self::BASE, $headers)->assertOk()->json('reminders');
        $this->assertSame(['off', false, null, 300, 0, 1, 1, 1], [$r['stopped_reason'], $r['active'], $r['consent_at'], $r['cap'], $r['used'], $r['with_phone'], $r['pending_with_phone'], $r['pending_without_phone']]);
        $this->assertSame([2, 3, 5, 7], $r['options']);

        $this->putJson(self::BASE.'/reminders', ['every_days' => 3, 'consent' => false], $headers)
            ->assertStatus(422)->assertJsonPath('errors.consent.0', 'Confirma que tienes permiso de tus invitados para escribirles por WhatsApp.');
        $this->putJson(self::BASE.'/reminders', ['every_days' => 4, 'consent' => true], $headers)->assertStatus(422);

        $r = $this->putJson(self::BASE.'/reminders', ['every_days' => 3, 'consent' => true], $headers)->assertOk()->json('reminders');
        $this->assertSame([3, true, '2026-10-13'], [$r['every_days'], $r['active'], $r['next_run']]);
        $this->assertSame('2026-10-13 12:00:00', $r['consent_at']);

        // El permiso conserva su primera fecha.
        CarbonImmutable::setTestNow('2026-10-14 12:00:00 America/Mexico_City');
        $headers = $this->auth();
        $r = $this->putJson(self::BASE.'/reminders', ['every_days' => 5, 'consent' => true], $headers)->assertOk()->json('reminders');
        $this->assertSame([5, '2026-10-13 12:00:00'], [$r['every_days'], $r['consent_at']]);

        $r = $this->putJson(self::BASE.'/reminders', ['every_days' => 0, 'consent' => false], $headers)->assertOk()->json('reminders');
        $this->assertSame([0, null, 'off'], [$r['every_days'], $r['consent_at'], $r['stopped_reason']]);

        $history = collect($this->readCsv('prueba', EventSettings::HISTORY));
        $this->assertTrue($history->every(fn ($h) => $h['usuario'] === 'panel'));
        $this->assertContains('recordatorio_cada_dias', $history->pluck('clave')->all());
    }

    public function test_the_panel_version_changes_with_the_log(): void
    {
        $this->enableReminders();
        $headers = $this->auth();
        $before = $this->getJson(self::BASE.'/version', $headers)->json('version');

        $this->logReminder('1', 'enviado', '2026-10-13 11:00:00');

        $this->assertNotSame($before, $this->getJson(self::BASE.'/version', $headers)->json('version'));
    }

    public function test_the_phone_never_reaches_the_public_endpoints(): void
    {
        $this->enableReminders();
        $this->setPhone('1', '525512345678');

        foreach (['/api/public/invitations/Fam1Token001', '/api/public/events/prueba'] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            $this->assertStringNotContainsString('5512345678', $body);
            $this->assertStringNotContainsString('phone', $body);
            $this->assertStringNotContainsString('telefono', $body);
        }
    }

    public function test_the_manager_turns_it_on_and_sets_the_cap_only_if_admin(): void
    {
        $this->managerUser('beto', 'editor');
        $this->asManager()->putJson('/api/manager/events/prueba/settings', ['people' => ['beto']])->assertOk();

        $this->asManager('beto', 'editor')->putJson('/api/manager/events/prueba/settings', ['whatsapp_reminders' => true])->assertStatus(403);
        $this->putJson('/api/manager/events/prueba/settings', ['whatsapp_cap' => 50])->assertStatus(403);

        $this->asManager()->putJson('/api/manager/events/prueba/settings', ['whatsapp_reminders' => true, 'whatsapp_cap' => 50])
            ->assertOk()
            ->assertJsonPath('settings.whatsapp_reminders', true)
            ->assertJsonPath('settings.whatsapp_cap', 50)
            ->assertJsonPath('settings.whatsapp_used', 0);
        $this->assertSame('SI', app(EventSettings::class)->read("{$this->eventos}/prueba")['whatsapp_recordatorios']);

        $this->putJson('/api/manager/events/prueba/settings', ['whatsapp_cap' => 0])->assertStatus(422);
        $this->putJson('/api/manager/events/prueba/settings', ['whatsapp_cap' => 5001])->assertStatus(422);

        $this->putJson('/api/manager/events/prueba/settings', ['whatsapp_reminders' => false])
            ->assertOk()->assertJsonPath('settings.whatsapp_reminders', false)->assertJsonPath('settings.whatsapp_cap', 50);
    }
}
