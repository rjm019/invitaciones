<?php

namespace Tests\Feature\Reminders;

use App\Services\Invitations\EventSettings;
use App\Services\Layout\EventRepository;
use App\Services\Reminders\ReminderLog;
use App\Services\Reminders\ReminderPlanner;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\Concerns\EnablesReminders;
use Tests\TestCase;

class ReminderPlannerTest extends TestCase
{
    use CopiesEventFixtures;
    use EnablesReminders;

    /** Hoy: 13-oct (el enlace 1 y el 3 se crearon el 1-oct; el 2 ya respondió). */
    private function plan(string $now = '2026-10-13 12:00:00'): array
    {
        $events = app(EventRepository::class);
        $events->forget('prueba');

        return app(ReminderPlanner::class)->evaluate('prueba', $events->find('prueba'), CarbonImmutable::parse($now, 'America/Mexico_City'));
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->enableReminders();
        $this->setPhone('1');
        $this->setPhone('2');
    }

    public function test_it_is_off_by_default_and_nothing_changes(): void
    {
        $this->enableReminders(['whatsapp_recordatorios' => null]);

        $this->assertSame(['reminders' => null, 'links' => [], 'due' => []], $this->plan());
    }

    public function test_only_a_pending_link_with_a_phone_is_due(): void
    {
        $plan = $this->plan();

        $this->assertSame(['1'], $plan['due']);
        $this->assertSame('waiting', $plan['links']['1']['status']);
        $this->assertSame('responded', $plan['links']['2']['status']); // ya respondió: aunque tenga teléfono
        $this->assertSame('no_phone', $plan['links']['3']['status']);
        $this->assertSame('2026-10-13', $plan['links']['1']['next_at']);
        $this->assertNull($plan['links']['2']['next_at']);

        $r = $plan['reminders'];
        $this->assertSame(['every_days' => 3, 'cap' => 300, 'used' => 0, 'with_phone' => 2, 'pending_with_phone' => 1, 'pending_without_phone' => 1, 'next_run' => '2026-10-13', 'active' => true, 'stopped_reason' => null],
            array_intersect_key($r, array_flip(['every_days', 'cap', 'used', 'with_phone', 'pending_with_phone', 'pending_without_phone', 'next_run', 'active', 'stopped_reason'])));
        $this->assertSame([2, 3, 5, 7], $r['options']);
        $this->assertSame(5, $r['per_link_max']);
    }

    public function test_waits_every_n_days_since_the_last_send(): void
    {
        $this->logReminder('1', 'enviado', '2026-10-12 11:00:00');

        $plan = $this->plan();
        $this->assertSame([], $plan['due']);
        $this->assertSame('sent', $plan['links']['1']['status']);
        $this->assertSame(1, $plan['links']['1']['sent']);
        $this->assertSame('2026-10-15', $plan['links']['1']['next_at']);
        $this->assertSame('2026-10-12T11:00:00-06:00', $plan['links']['1']['last_sent_at']);

        $this->assertSame(['1'], $this->plan('2026-10-15 10:00:00')['due']);
    }

    public function test_it_does_not_try_twice_the_same_day(): void
    {
        $this->logReminder('1', 'fallido', '2026-10-13 10:30:00', '131000');

        $plan = $this->plan();
        $this->assertSame([], $plan['due']);
        $this->assertSame('failed', $plan['links']['1']['status']);
        $this->assertSame('2026-10-14', $plan['links']['1']['next_at']);
    }

    public function test_no_whatsapp_and_opt_outs_stop_a_link(): void
    {
        $this->logReminder('1', 'fallido', '2026-10-01 11:00:00', '131026');
        $plan = $this->plan();
        $this->assertSame([], $plan['due']);
        $this->assertSame('no_whatsapp', $plan['links']['1']['status']);

        // Una baja de otro evento, con el mismo teléfono (aunque venga en otro formato), también cuenta.
        $this->setPhone('3', '525599998888');
        app(ReminderLog::class)->optOut('5215599998888', 'otro', '9', CarbonImmutable::now());
        $plan = $this->plan();
        $this->assertSame('opted_out', $plan['links']['3']['status']);
        $this->assertNotContains('3', $plan['due']);
    }

    public function test_a_link_stops_at_five_and_the_event_at_its_cap(): void
    {
        foreach (['2026-09-01', '2026-09-04', '2026-09-07', '2026-09-10', '2026-09-13'] as $day) {
            $this->logReminder('1', 'enviado', "{$day} 11:00:00");
        }
        $plan = $this->plan();
        $this->assertSame([], $plan['due']);
        $this->assertNull($plan['links']['1']['next_at']);
        $this->assertSame(5, $plan['links']['1']['sent']);

        $this->setPhone('3');
        $this->enableReminders(['whatsapp_tope' => '5']);
        $plan = $this->plan();
        $this->assertSame([], $plan['due']);
        $this->assertSame('cap', $plan['reminders']['stopped_reason']);
        $this->assertFalse($plan['reminders']['active']);
    }

    public function test_the_cap_trims_the_list_of_the_day(): void
    {
        $this->setPhone('3');
        $this->logReminder('2', 'enviado', '2026-10-01 11:00:00'); // gasta 1 de 2

        $this->enableReminders(['whatsapp_tope' => '2']);
        $this->assertSame(['1'], $this->plan()['due']);
    }

    public function test_it_stops_after_the_deadline_and_two_days_before_the_event(): void
    {
        $plan = $this->plan('2026-11-06 12:00:00'); // el día de la fecha límite todavía sale
        $this->assertSame(['1'], $plan['due']);

        $plan = $this->plan('2026-11-07 12:00:00');
        $this->assertSame([], $plan['due']);
        $this->assertSame('deadline', $plan['reminders']['stopped_reason']);
        $this->assertNull($plan['reminders']['next_run']);

        // Con la fecha límite lejana, sigue sin salir a menos de 2 días del evento (28-nov).
        app(EventSettings::class)->put("{$this->eventos}/prueba", ['rsvp_limite' => '2026-11-28'], CarbonImmutable::now());
        $this->assertSame(['1'], $this->plan('2026-11-26 12:00:00')['due']);
        $this->assertSame('deadline', $this->plan('2026-11-27 12:00:00')['reminders']['stopped_reason']);
    }

    public function test_it_needs_a_frequency_and_the_permission(): void
    {
        $this->enableReminders(['recordatorio_cada_dias' => null]);
        $plan = $this->plan();
        $this->assertSame('off', $plan['reminders']['stopped_reason']);
        $this->assertSame([], $plan['due']);

        $this->enableReminders(['recordatorio_cada_dias' => '3', 'recordatorio_permiso' => null]);
        $plan = $this->plan();
        $this->assertSame('no_consent', $plan['reminders']['stopped_reason']);
        $this->assertSame([], $plan['due']);
        $this->assertNull($plan['links']['1']['next_at']);
    }

    public function test_delivery_states_follow_the_last_row(): void
    {
        $this->logReminder('1', 'enviado', '2026-10-12 11:00:00');
        $this->logReminder('1', 'entregado', '2026-10-12 11:00:05');
        $this->assertSame('delivered', $this->plan()['links']['1']['status']);

        $this->logReminder('1', 'leido', '2026-10-12 12:00:00');
        $this->assertSame('read', $this->plan()['links']['1']['status']);
    }
}
