<?php

namespace App\Services\Invitations;

use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Reglas de la invitación personal (/i/{token}): para cuántas personas es, qué nombres ya
 * se registraron (fijos) y si todavía se puede confirmar. El servidor es la única autoridad.
 */
final class InvitationService
{
    public const NOT_FOUND = 'Invitación no encontrada.';

    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly DedicationStore $dedications,
    ) {}

    /** null si el token no existe o el evento no está publicado. */
    public function find(string $token): ?Invitation
    {
        $where = $this->invitations->locate($token);
        if ($where === null) {
            return null;
        }

        $event = $this->events->find($where['slug']);
        if ($event === null || ! $event['published']) {
            return null;
        }

        $record = $this->invitations->all($where['slug'])[$where['id']] ?? null;

        return $record === null ? null : new Invitation($where['slug'], $event, $record);
    }

    /** Motivo en español si ya no se puede confirmar; null si sí se puede. */
    public static function closedReason(array $event): ?string
    {
        $rsvp = $event['rsvp'];
        if ($rsvp['mode'] === 'off') {
            return 'Las confirmaciones no están abiertas.';
        }
        if (! $rsvp['open']) {
            $date = CarbonImmutable::parse($rsvp['deadline'])->locale('es')->isoFormat('D [de] MMMM');

            return "Las confirmaciones cerraron el {$date}.";
        }

        return null;
    }

    /**
     * Registra nombres en los lugares libres. Los ya registrados no cambian.
     *
     * @param  list<string>  $names
     * @return array<string, mixed>
     *
     * @throws RsvpException 409 si ya cerró · 422 si no hay lugares
     */
    public function respond(Invitation $invitation, bool $attending, array $names): array
    {
        $closed = self::closedReason($invitation->event);
        if ($closed !== null) {
            throw new RsvpException($closed, 409);
        }

        $this->responses->add(
            $invitation->slug,
            $invitation->record,
            array_values(array_filter(array_map($this->cleanName(...), $names), fn ($n) => $n !== '')),
            $attending,
            $this->now($invitation->event),
        );

        return $this->present($invitation);
    }

    /**
     * Guarda la dedicatoria del enlace (una por invitación; la que ya está no cambia).
     *
     * @return array<string, mixed>
     *
     * @throws RsvpException 409 si ya envió una · 422 si el nombre o el texto quedan vacíos
     */
    public function dedicate(Invitation $invitation, string $name, string $message): array
    {
        $name = $this->cleanName($name);
        $message = $this->cleanMessage($message);
        if ($name === '') {
            throw new RsvpException('Escribe tu nombre.', 422, 'name');
        }
        if ($message === '') {
            throw new RsvpException('Escribe tu dedicatoria.', 422, 'message');
        }

        $this->dedications->add($invitation->slug, $invitation->record, $name, $message, $this->now($invitation->event));

        return $this->present($invitation);
    }

    /** Anota la apertura. Nunca debe tumbar la invitación: si falla, solo se reporta. */
    public function recordOpen(Invitation $invitation): void
    {
        try {
            $this->responses->recordOpen($invitation->slug, $invitation->record['id'], $this->now($invitation->event));
        } catch (Throwable $e) {
            report($e);
        }
    }

    /**
     * Forma pública: para cuántas personas es, quiénes ya están y si se puede seguir llenando.
     *
     * @return array<string, mixed>
     */
    public function present(Invitation $invitation): array
    {
        $guests = $this->responses->guests($invitation->slug, $invitation->record['id']);
        $dedication = $this->dedications->find($invitation->slug, $invitation->record['id']);
        $timezone = $invitation->event['timezone'];
        $closed = self::closedReason($invitation->event);

        return [
            'label' => $invitation->record['label'] !== '' ? $invitation->record['label'] : null,
            'passes' => $invitation->record['passes'],
            'guests' => array_map(fn ($g) => [
                'slot' => $g['slot'],
                'full_name' => $g['name'],
                'attending' => $g['attending'],
                'responded_at' => CarbonImmutable::parse($g['responded_at'], $timezone)->toIso8601String(),
            ], $guests),
            'remaining' => max(0, $invitation->record['passes'] - count($guests)),
            'open' => $closed === null,
            'closed_message' => $closed,
            'deadline' => $invitation->event['rsvp']['deadline'],
            'dedication' => $dedication === null ? null : [
                'name' => $dedication['name'],
                'message' => $dedication['message'],
                'sent_at' => CarbonImmutable::parse($dedication['sent_at'], $timezone)->toIso8601String(),
            ],
        ];
    }

    private function now(array $event): CarbonImmutable
    {
        return CarbonImmutable::now($event['timezone']);
    }

    /** Un nombre en una sola línea, sin caracteres de control. */
    private function cleanName(string $name): string
    {
        return trim((string) preg_replace(['/[\x00-\x1F\x7F]+/u', '/\s+/u'], ' ', $name));
    }

    /** Un texto con sus renglones (máximo una línea en blanco seguida), sin caracteres de control. */
    private function cleanMessage(string $message): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $message);
        $text = (string) preg_replace(['/[\x00-\x09\x0B-\x1F\x7F]+/u', '/[ \t]+/u', '/ *\n */u', '/\n{3,}/u'], [' ', ' ', "\n", "\n\n"], $text);

        return trim($text);
    }
}
