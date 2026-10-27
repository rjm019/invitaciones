<?php

namespace App\Services\Reminders;

use App\Services\Design\Normalizer;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Invitations\WhatsAppLink;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Las reglas de los recordatorios: a qué invitaciones les toca hoy y en qué estado está
 * cada una. No manda nada ni escribe; recibe "ahora" para poder probarse con cualquier fecha.
 */
final class ReminderPlanner
{
    public const OPTIONS = [2, 3, 5, 7];

    /** Código de Meta: el número no tiene WhatsApp. */
    public const NO_WHATSAPP = '131026';

    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly ReminderLog $log,
    ) {}

    /** ¿El gestor encendió los recordatorios de este evento? */
    public function enabled(string $slug): bool
    {
        return Normalizer::yes($this->events->settings($slug)['whatsapp_recordatorios'] ?? '');
    }

    /**
     * Ajustes del evento: cada cuántos días (0 = apagado), cuándo se dio el permiso y el tope.
     *
     * @return array{every_days: int, consent_at: ?string, cap: int}
     */
    public function settings(string $slug): array
    {
        $s = $this->events->settings($slug);
        $every = (int) ($s['recordatorio_cada_dias'] ?? 0);
        $cap = (int) ($s['whatsapp_tope'] ?? 0);

        return [
            'every_days' => in_array($every, self::OPTIONS, true) ? $every : 0,
            'consent_at' => trim($s['recordatorio_permiso'] ?? '') ?: null,
            'cap' => $cap > 0 ? $cap : (int) config('invitaciones.whatsapp.default_cap'),
        ];
    }

    /**
     * El estado de cada invitación, a quiénes les toca hoy y el bloque `reminders` del panel.
     * Con la función apagada: `reminders` null y nada en `links`/`due`.
     *
     * @param  array<string, mixed>  $event  config del evento (EventRepository::find)
     * @return array{reminders: array<string, mixed>|null, links: array<string, array{status: string, sent: int, last_sent_at: ?string, next_at: ?string}>, due: list<string>}
     */
    public function evaluate(string $slug, array $event, CarbonImmutable $now): array
    {
        if (! $this->enabled($slug)) {
            return ['reminders' => null, 'links' => [], 'due' => []];
        }

        $tz = $event['timezone'];
        $today = $now->setTimezone($tz)->startOfDay();
        $config = $this->settings($slug);
        $perLink = (int) config('invitaciones.whatsapp.per_link_max');
        $states = $this->log->states($slug);
        $used = array_sum(array_column($states, 'sent'));
        $guests = $this->responses->all($slug);
        $optOuts = $this->log->optedOut();

        $reason = match (true) {
            $config['every_days'] === 0 => 'off',
            $config['consent_at'] === null => 'no_consent',
            $this->pastWindow($event, $today) => 'deadline',
            $used >= $config['cap'] => 'cap',
            default => null,
        };
        // Último día en que puede salir uno: la fecha límite, y 2 días antes del evento.
        $lastDay = $this->lastDay($event, $tz);

        $links = [];
        $due = [];
        $stats = ['with_phone' => 0, 'pending_with_phone' => 0, 'pending_without_phone' => 0];
        $nextRun = null;
        foreach ($this->invitations->all($slug) as $id => $record) {
            $state = $states[$id] ?? ['status' => '', 'detail' => '', 'sent' => 0, 'last_sent' => '', 'last_attempt' => ''];
            $phone = $record['phone'];
            $responded = ($guests[$id] ?? []) !== [];
            $stats['with_phone'] += $phone !== '' ? 1 : 0;
            if (! $responded) {
                $stats[$phone !== '' ? 'pending_with_phone' : 'pending_without_phone']++;
            }
            $optedOut = $phone !== '' && (isset($optOuts[WhatsAppLink::phone($phone)]) || $state['status'] === 'baja');
            $noWhatsapp = $state['status'] === 'fallido' && $state['detail'] === self::NO_WHATSAPP;

            $status = match (true) {
                $responded => 'responded',
                $phone === '' => 'no_phone',
                $optedOut => 'opted_out',
                $noWhatsapp => 'no_whatsapp',
                $state['status'] === 'fallido' => 'failed',
                $state['status'] === 'leido' => 'read',
                $state['status'] === 'entregado' => 'delivered',
                $state['status'] === 'enviado' => 'sent',
                default => 'waiting',
            };

            $nextAt = null;
            if ($reason === null && ! in_array($status, ['responded', 'no_phone', 'opted_out', 'no_whatsapp'], true) && $state['sent'] < $perLink) {
                $base = $this->day($state['last_sent'] !== '' ? $state['last_sent'] : $record['created_at'], $tz);
                $candidate = $base === null ? $today : $base->addDays($config['every_days']);
                if ($candidate < $today) {
                    $candidate = $today;
                }
                if ($state['last_attempt'] === $today->format('Y-m-d')) {
                    $candidate = $candidate->max($today->addDay());
                }
                if ($lastDay === null || $candidate <= $lastDay) {
                    $nextAt = $candidate->format('Y-m-d');
                }
            }
            if ($nextAt !== null) {
                $nextRun = $nextRun === null || $nextAt < $nextRun ? $nextAt : $nextRun;
                if ($nextAt === $today->format('Y-m-d') && $used + count($due) < $config['cap']) {
                    $due[] = (string) $id;
                }
            }

            $links[(string) $id] = [
                'status' => $status,
                'sent' => $state['sent'],
                'last_sent_at' => $this->iso($state['last_sent'], $tz),
                'next_at' => $nextAt,
            ];
        }

        return [
            'reminders' => [
                'every_days' => $config['every_days'],
                'options' => self::OPTIONS,
                'consent_at' => $config['consent_at'],
                'cap' => $config['cap'],
                'used' => $used,
                'per_link_max' => $perLink,
                ...$stats,
                'next_run' => $nextRun,
                'active' => $reason === null,
                'stopped_reason' => $reason,
            ],
            'links' => $links,
            'due' => $due,
        ];
    }

    /** ¿Ya pasó la fecha límite, o falta menos de 2 días para el evento? */
    private function pastWindow(array $event, CarbonImmutable $today): bool
    {
        $last = $this->lastDay($event, $event['timezone']);

        return $last !== null && $today > $last;
    }

    /** Último día en que puede salir un recordatorio, o null si el evento no marca ninguno. */
    private function lastDay(array $event, string $tz): ?CarbonImmutable
    {
        $limits = [];
        if (! empty($event['rsvp']['deadline'])) {
            $limits[] = $this->day($event['rsvp']['deadline'], $tz);
        }
        if (! empty($event['starts_at'])) {
            $limits[] = $this->day($event['starts_at'], $tz)?->subDays(2);
        }
        $limits = array_values(array_filter($limits));

        return $limits === [] ? null : min($limits);
    }

    private function day(string $value, string $tz): ?CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($value, $tz)->setTimezone($tz)->startOfDay();
        } catch (Throwable) {
            return null;
        }
    }

    private function iso(string $local, string $tz): ?string
    {
        if ($local === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($local, $tz)->toIso8601String();
        } catch (Throwable) {
            return null;
        }
    }
}
