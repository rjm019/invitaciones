<?php

namespace App\Services\Panel;

use App\Services\Invitations\DedicationStore;
use App\Services\Invitations\EventSettings;
use App\Services\Invitations\InvitationService;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Invitations\RsvpException;
use App\Services\Invitations\WhatsAppLink;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Layout\LayoutReader;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Lo que ve y hace el dueño en el panel: la lista de enlaces generados (para cuántas
 * personas es cada uno y quiénes ya confirmaron), las dedicatorias, generar enlaces
 * nuevos, cambiar la fecha límite (hasta 3 veces) y asignar mesas a los invitados.
 */
final class PanelService
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly EventSettings $settings,
        private readonly DedicationStore $dedications,
    ) {}

    /**
     * @return array<string, mixed>
     *
     * @throws LayoutException
     */
    public function overview(string $slug): array
    {
        $event = $this->event($slug);
        $guests = $this->responses->all($slug);
        $opens = $this->responses->opens($slug);

        $records = $this->invitations->all($slug);
        $list = [];
        $totals = ['invitations' => 0, 'seats' => 0, 'attending' => 0, 'declined' => 0, 'empty' => 0];
        foreach ($records as $id => $record) {
            $mine = $guests[$id] ?? [];
            $attending = count(array_filter($mine, fn ($g) => $g['attending']));
            $totals['invitations']++;
            $totals['seats'] += $record['passes'];
            $totals['attending'] += $attending;
            $totals['declined'] += count($mine) - $attending;
            $totals['empty'] += max(0, $record['passes'] - count($mine));
            $list[] = $this->present($slug, $event, $record, $mine, $opens[$id]['count'] ?? 0);
        }

        return [
            'version' => $this->version($slug),
            'event' => [
                'slug' => $slug,
                'title' => $event['title'],
                'celebrant' => $event['celebrant'],
                'starts_at' => $event['starts_at'],
                'timezone' => $event['timezone'],
                'published' => $event['published'],
            ],
            'rsvp' => $this->rsvp($slug, $event),
            'summary' => $totals,
            'invitations' => $list,
            'dedications' => $this->dedicationList($slug, $records, $event['timezone']),
            'max_passes' => InvitationStore::MAX_PASSES,
        ];
    }

    /**
     * Las dedicatorias, la más reciente primero, con el nombre de su invitación.
     *
     * @param  array<string, array{label: string}>  $records
     * @return list<array<string, mixed>>
     */
    private function dedicationList(string $slug, array $records, string $timezone): array
    {
        $list = [];
        foreach ($this->dedications->all($slug) as $id => $d) {
            $label = $records[$id]['label'] ?? '';
            $list[] = [
                'invitation' => (string) $id,
                'label' => $label !== '' ? $label : null,
                'name' => $d['name'],
                'message' => $d['message'],
                'sent_at' => $this->iso($d['sent_at'], $timezone),
            ];
        }
        usort($list, fn ($a, $b) => strcmp((string) $b['sent_at'], (string) $a['sent_at']));

        return $list;
    }

    /**
     * @return array<string, mixed>
     */
    public function createInvitation(string $slug, int $passes, string $label): array
    {
        $event = $this->event($slug);
        $record = $this->invitations->create($slug, $passes, $label, CarbonImmutable::now($event['timezone']));

        return $this->present($slug, $event, $record, [], 0);
    }

    /**
     * @return array<string, mixed> la sección rsvp ya con la fecha nueva
     *
     * @throws RsvpException 422 fecha inválida · 409 sin cambios disponibles
     */
    public function changeDeadline(string $slug, string $date): array
    {
        $event = $this->event($slug);
        $today = CarbonImmutable::now($event['timezone'])->format('Y-m-d');
        $eventDay = CarbonImmutable::parse($event['starts_at'])->format('Y-m-d');

        if ($date < $today) {
            throw new RsvpException('La fecha límite no puede ser antes de hoy.', 422, 'deadline');
        }
        if ($date > $eventDay) {
            throw new RsvpException('La fecha límite no puede ser después del evento.', 422, 'deadline');
        }
        if ($date === $event['rsvp']['deadline']) {
            throw new RsvpException('Esa ya es la fecha límite.', 422, 'deadline');
        }

        $this->settings->changeDeadline($this->events->path($slug), $date, $event['rsvp']['deadline'], CarbonImmutable::now($event['timezone']));
        $this->events->forget($slug);

        return $this->rsvp($slug, $this->event($slug));
    }

    /**
     * Huella de los archivos del evento: cambia en cuanto alguien abre o confirma una
     * invitación, o el dueño cambia algo. El panel la consulta cada pocos segundos y solo
     * vuelve a pedir todo cuando cambió (así se ve "en vivo" sin costo).
     */
    public function version(string $slug): string
    {
        $dir = $this->events->path($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
        $files = array_merge(glob($dir.'/*.csv') ?: [], glob($dir.'/'.LayoutReader::XLSX) ?: []);
        sort($files);

        $parts = [];
        foreach ($files as $file) {
            $parts[] = basename($file).':'.(hash_file('xxh128', $file) ?: '');
        }

        return hash('xxh128', implode('|', $parts));
    }

    /**
     * Asigna mesas y devuelve el panel actualizado.
     *
     * @param  list<array{invitation: string, slot: int, table: ?int}>  $assignments
     * @return array<string, mixed>
     */
    public function assignTables(string $slug, array $assignments): array
    {
        $event = $this->event($slug);
        $this->responses->assignTables($slug, $assignments, CarbonImmutable::now($event['timezone']));

        return $this->overview($slug);
    }

    /** @return array<string, mixed> */
    private function event(string $slug): array
    {
        return $this->events->find($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
    }

    /** @return array<string, mixed> */
    private function rsvp(string $slug, array $event): array
    {
        $used = $this->settings->deadlineChanges($this->events->path($slug));

        return [
            'deadline' => $event['rsvp']['deadline'],
            'open' => InvitationService::closedReason($event) === null,
            'changes_used' => $used,
            'changes_left' => max(0, EventSettings::MAX_DEADLINE_CHANGES - $used),
            'max_changes' => EventSettings::MAX_DEADLINE_CHANGES,
        ];
    }

    /**
     * @param  array{id: string, token: string, passes: int, label: string, created_at: string}  $record
     * @param  list<array{slot: int, name: string, attending: bool, responded_at: string}>  $guests
     * @return array<string, mixed>
     */
    private function present(string $slug, array $event, array $record, array $guests, int $opens): array
    {
        $url = rtrim((string) config('invitaciones.frontend_url'), '/').'/i/'.$record['token'];
        $template = $this->events->eventValue($slug, 'mensaje_whatsapp') ?? WhatsAppLink::DEFAULT_MESSAGE;
        $name = $record['label'] !== '' ? $record['label'] : '';

        return [
            'id' => $record['id'],
            'label' => $name !== '' ? $name : null,
            'passes' => $record['passes'],
            'url' => $url,
            'whatsapp_url' => WhatsAppLink::url('', WhatsAppLink::message($template, $name, $record['passes'], $url)),
            'guests' => array_map(fn ($g) => [
                'slot' => $g['slot'],
                'full_name' => $g['name'],
                'attending' => $g['attending'],
                'table' => $g['table'],
                'responded_at' => $this->iso($g['responded_at'], $event['timezone']),
            ], $guests),
            'opens' => $opens,
            'created_at' => $this->iso($record['created_at'], $event['timezone']),
        ];
    }

    private function iso(string $local, string $timezone): ?string
    {
        if ($local === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($local, $timezone)->toIso8601String();
        } catch (Throwable) {
            return null;
        }
    }
}
