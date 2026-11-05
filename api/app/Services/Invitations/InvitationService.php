<?php

namespace App\Services\Invitations;

use App\Services\Album\AlbumService;
use App\Services\Album\EventEnded;
use App\Services\Csv\CsvFile;
use App\Services\Design\Normalizer;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Throwable;

/**
 * Reglas de la invitación personal (/i/{token}): para cuántas personas es, qué nombres ya
 * se registraron (fijos) y si todavía se puede confirmar. El servidor es la única autoridad.
 */
final class InvitationService
{
    public const NOT_FOUND = 'Invitación no encontrada.';

    /** Texto del aviso de la fecha límite; {cuando} se vuelve "hoy", "mañana" o "en N días". */
    public const DEADLINE_NOTICE = 'Recuerda que {cuando} es la fecha límite para confirmar tu asistencia';

    public const DEADLINE_NOTICE_SLOT = '{cuando}';

    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly DedicationStore $dedications,
        private readonly TriviaService $trivia,
        private readonly AlbumService $album,
    ) {}

    /**
     * null si el token no existe o el evento no está publicado.
     *
     * @throws EventEnded si el evento ya terminó (se cerró el álbum): responde 410
     */
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
        $this->album->guard($where['slug'], $event);

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

    /** ¿Es una muestra? (los demos de la landing: todo se puede probar, nada se guarda) */
    public static function isDemo(Invitation $invitation): bool
    {
        return (bool) ($invitation->event['demo'] ?? false);
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

        $names = array_values(array_filter(array_map($this->cleanName(...), $names), fn ($n) => $n !== ''));
        if (self::isDemo($invitation)) {
            return $this->presentDemo($invitation, $names, $attending);
        }

        $this->responses->add($invitation->slug, $invitation->record, $names, $attending, $this->now($invitation->event));

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

        if (self::isDemo($invitation)) {
            return ['dedication' => ['name' => $name, 'message' => $message, 'sent_at' => $this->now($invitation->event)->toIso8601String()]]
                + $this->present($invitation);
        }

        $this->dedications->add($invitation->slug, $invitation->record, $name, $message, $this->now($invitation->event));

        return $this->present($invitation);
    }

    /** Abre la trivia del enlace (marca el inicio en el servidor). */
    public function startTrivia(Invitation $invitation): array
    {
        return $this->trivia->start($invitation);
    }

    /**
     * Califica y guarda la trivia del enlace (una por invitación).
     *
     * @param  list<int>  $answers
     * @return array<string, mixed> el resultado (aciertos y total) y la invitación
     *
     * @throws RsvpException 409 si ya respondió o ya cerró · 422 si falta el nombre o una respuesta
     */
    public function answerTrivia(Invitation $invitation, string $name, array $answers): array
    {
        $result = $this->trivia->submit($invitation, $name, $answers);
        $present = $this->present($invitation);
        if (self::isDemo($invitation) && $present['trivia'] !== null) {
            // Una muestra no guarda: el resultado se ve igual, pero cada visita empieza de cero.
            $present['trivia']['result'] = $result;
            $present['trivia']['open'] = false;
        }

        return ['result' => $result, 'invitation' => $present];
    }

    /**
     * Sube una foto del álbum de este enlace (una por petición).
     *
     * @return array<string, mixed> el estado del álbum de este enlace
     *
     * @throws RsvpException 409 aún no es el día · 422 foto inválida o ya subió 2 · 507 álbum lleno
     */
    public function uploadAlbumPhoto(Invitation $invitation, UploadedFile $photo): array
    {
        $this->album->upload($invitation, $photo);

        return ['album' => $this->album->present($invitation)];
    }

    /** Anota la apertura. Nunca debe tumbar la invitación: si falla, solo se reporta. */
    public function recordOpen(Invitation $invitation): void
    {
        if (self::isDemo($invitation)) {
            return; // las visitas a una muestra no se anotan
        }
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
            'trivia' => $this->trivia->present($invitation),
        ] + (($album = $this->album->present($invitation)) === null ? [] : ['album' => $album])
            + (($days = $this->deadlineDays($invitation, count($guests))) === null ? [] : [
                'deadline_days' => $days,
                'deadline_notice' => $this->deadlineNotice($invitation->slug, $days),
            ]);
    }

    /** El aviso ya armado: el texto que escribió el cliente en su panel, o el de siempre. */
    private function deadlineNotice(string $slug, int $days): string
    {
        $when = match ($days) {
            0 => 'hoy',
            1 => 'mañana',
            default => "en {$days} días",
        };
        $text = CsvFile::unsafe($this->events->settings($slug)['aviso_fecha_texto'] ?? '') ?: self::DEADLINE_NOTICE;

        return str_replace(self::DEADLINE_NOTICE_SLOT, $when, $text);
    }

    /**
     * Días que faltan para la fecha límite (0 = hoy) para el aviso de la invitación. Solo con el
     * ajuste `aviso_fecha_limite` encendido, las confirmaciones abiertas y lugares sin nombre;
     * null en cualquier otro caso (la invitación sale idéntica).
     */
    private function deadlineDays(Invitation $invitation, int $named): ?int
    {
        $deadline = $invitation->event['rsvp']['deadline'] ?? null;
        if (! $deadline || $named >= $invitation->record['passes']
            || self::closedReason($invitation->event) !== null
            || ! Normalizer::yes($this->events->settings($invitation->slug)['aviso_fecha_limite'] ?? '')) {
            return null;
        }
        $timezone = $invitation->event['timezone'];
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $days = (int) $today->diffInDays(CarbonImmutable::parse($deadline, $timezone)->startOfDay(), false);

        return $days >= 0 ? $days : null;
    }

    /**
     * Una muestra responde como si guardara (los nombres aparecen fijos y se descuentan los
     * lugares), con las mismas reglas de cupo, pero no escribe nada: cada visita empieza de cero.
     *
     * @param  list<string>  $names
     * @return array<string, mixed>
     *
     * @throws RsvpException 422 si no hay lugares para todos los nombres
     */
    private function presentDemo(Invitation $invitation, array $names, bool $attending): array
    {
        $presented = $this->present($invitation);
        $known = array_map(fn ($g) => ResponseStore::normalize($g['full_name']), $presented['guests']);
        $new = [];
        foreach ($names as $name) {
            $key = ResponseStore::normalize($name);
            if (! in_array($key, $known, true)) {
                $known[] = $key;
                $new[] = $name;
            }
        }
        $used = array_column($presented['guests'], 'slot');
        $free = array_values(array_diff(range(1, $invitation->record['passes']), $used));
        if (count($new) > count($free)) {
            $left = count($free);
            throw new RsvpException(match ($left) {
                0 => 'Tu invitación ya está completa.',
                1 => 'Solo queda 1 lugar en tu invitación.',
                default => "Solo quedan {$left} lugares en tu invitación.",
            }, 422, 'guests');
        }
        $at = $this->now($invitation->event)->toIso8601String();
        foreach ($new as $i => $name) {
            $presented['guests'][] = ['slot' => $free[$i], 'full_name' => $name, 'attending' => $attending, 'responded_at' => $at];
        }
        $presented['remaining'] = max(0, $invitation->record['passes'] - count($presented['guests']));

        return $presented;
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
