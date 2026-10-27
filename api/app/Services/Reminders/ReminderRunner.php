<?php

namespace App\Services\Reminders;

use App\Services\Csv\CsvFile;
use App\Services\Invitations\InvitationStore;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Panel\PanelService;
use Carbon\CarbonImmutable;

/**
 * Una corrida de recordatorios: recorre los eventos con la función encendida y manda a
 * quien le toca hoy. Es idempotente (lo que ya se intentó hoy no se repite), así que el
 * cron puede llamarla cada hora. Va bajo un candado global para que dos corridas no se pisen.
 */
final class ReminderRunner
{
    private const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ReminderPlanner $planner,
        private readonly ReminderLog $log,
        private readonly ReminderChannel $channel,
        private readonly CsvFile $csv,
    ) {}

    /**
     * @param  bool  $dryRun  solo dice a quién le toca (ignora la ventana horaria, no manda ni escribe)
     * @return array{sent: int, failed: int, skipped: int, events: int, stopped: ?string, due: list<array{event: string, invitation: string}>}
     */
    public function run(?string $slug = null, bool $dryRun = false, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        if ($dryRun) {
            return $this->process($slug, true, $now);
        }

        $this->log->ensureDir();

        return $this->csv->locked($this->log->dir().'/run', fn () => $this->process($slug, false, $now));
    }

    /** @return array{sent: int, failed: int, skipped: int, events: int, stopped: ?string, due: list<array{event: string, invitation: string}>} */
    private function process(?string $only, bool $dryRun, CarbonImmutable $now): array
    {
        $summary = ['sent' => 0, 'failed' => 0, 'skipped' => 0, 'events' => 0, 'stopped' => null, 'due' => []];
        $slugs = array_values(array_filter(
            $this->events->slugs(),
            fn ($s) => ($only === null || $only === $s) && $this->planner->enabled($s),
        ));

        // Máximo del día entre todos los eventos (el límite de Meta).
        $left = (int) config('invitaciones.whatsapp.daily_limit') - $this->sentToday($slugs, $now);

        foreach ($slugs as $slug) {
            try {
                $event = $this->events->find($slug);
            } catch (LayoutException) {
                continue;
            }
            if ($event === null) {
                continue;
            }
            $local = $now->setTimezone($event['timezone']);
            $plan = $this->planner->evaluate($slug, $event, $local);
            $summary['events']++;
            if ($plan['due'] === []) {
                continue;
            }
            if (! $dryRun && ! $this->inHours((int) $local->format('G'))) {
                $summary['skipped'] += count($plan['due']);

                continue;
            }

            $records = $this->invitations->all($slug);
            $title = PanelService::titleFor($slug, $event, $this->events->eventValue($slug, 'titulo_panel'));
            foreach ($plan['due'] as $id) {
                $record = $records[$id];
                if ($dryRun) {
                    $summary['due'][] = ['event' => $slug, 'invitation' => $id];

                    continue;
                }
                if ($left <= 0) {
                    $summary['skipped']++;

                    continue;
                }

                $result = $this->channel->send($record['phone'], [
                    'name' => $record['label'] !== '' ? $record['label'] : 'de nuevo',
                    'event' => $title,
                    'deadline' => $this->spanishDate($event['rsvp']['deadline'] ?? $event['starts_at']),
                    'token' => $record['token'],
                ]);
                if ($result->fatal) {
                    // Token o permisos: no se marca a nadie, la siguiente corrida lo reintenta.
                    $summary['stopped'] = (string) $result->errorCode;

                    return $summary;
                }
                if ($result->ok) {
                    $this->log->add($slug, $id, $result->wamid, 'enviado', '', $local);
                    $this->log->index((string) $result->wamid, $slug, $id, $local);
                    $summary['sent']++;
                    $left--;
                } else {
                    $this->log->add($slug, $id, null, 'fallido', (string) $result->errorCode, $local);
                    $summary['failed']++;
                }
            }
        }

        return $summary;
    }

    /** @param  list<string>  $slugs */
    private function sentToday(array $slugs, CarbonImmutable $now): int
    {
        $total = 0;
        foreach ($slugs as $slug) {
            try {
                $tz = $this->events->find($slug)['timezone'] ?? null;
            } catch (LayoutException) {
                continue;
            }
            if ($tz !== null) {
                $total += $this->log->sentOn($slug, $now->setTimezone($tz)->format('Y-m-d'));
            }
        }

        return $total;
    }

    private function inHours(int $hour): bool
    {
        [$from, $to] = array_map('intval', explode('-', (string) config('invitaciones.whatsapp.hours'))) + [10, 20];

        return $hour >= $from && $hour < $to;
    }

    /** "2026-11-06" → "6 de noviembre" */
    private function spanishDate(string $date): string
    {
        $day = CarbonImmutable::parse($date);

        return $day->day.' de '.self::MONTHS[$day->month - 1];
    }
}
