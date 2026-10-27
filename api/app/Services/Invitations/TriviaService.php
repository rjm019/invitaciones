<?php

namespace App\Services\Invitations;

use App\Services\Design\DesignSection;
use App\Services\Design\TriviaQuiz;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;

/**
 * Trivia del enlace personal. El servidor es la única autoridad: lee las respuestas
 * correctas del diseño (nunca salen en el config público), califica, mide los segundos
 * desde que se abrió la trivia y guarda una sola participación por invitación. En una
 * muestra (demo) califica igual pero no escribe nada.
 */
final class TriviaService
{
    public const CLOSED = 'La trivia ya cerró.';

    public function __construct(
        private readonly EventRepository $events,
        private readonly TriviaStore $store,
    ) {}

    /** ¿Este evento tiene una trivia con preguntas? */
    public function exists(Invitation $invitation): bool
    {
        return $this->questions($invitation) !== [];
    }

    /** Cuándo cierra (`cierra`, o el inicio del evento); null si no hay ninguno. */
    public function closesAt(Invitation $invitation): ?CarbonImmutable
    {
        $timezone = $invitation->event['timezone'];
        $closes = TriviaQuiz::closesAt($this->section($invitation), $timezone);
        if ($closes !== null) {
            return $closes;
        }
        $start = $invitation->event['starts_at'] ?? null;

        return $start === null ? null : CarbonImmutable::parse($start)->setTimezone($timezone);
    }

    /** Motivo en español si ya no se puede participar; null si sí. */
    public function closedReason(Invitation $invitation): ?string
    {
        $closes = $this->closesAt($invitation);

        return $closes !== null && $this->now($invitation)->greaterThan($closes) ? self::CLOSED : null;
    }

    /**
     * Estado público para el invitado: si sigue abierta y su resultado (aciertos y total),
     * nunca las respuestas correctas. null si el evento no tiene trivia.
     *
     * @return array{open: bool, closed_message: ?string, result: ?array{name: string, correct: int, total: int, seconds: int}}|null
     */
    public function present(Invitation $invitation): ?array
    {
        $total = count($this->questions($invitation));
        if ($total === 0) {
            return null;
        }
        $done = $this->store->find($invitation->slug, $invitation->record['id']);
        $closed = $this->closedReason($invitation);

        return [
            'open' => $closed === null && $done === null,
            'closed_message' => $closed,
            'result' => $done === null ? null : [
                'name' => $done['name'],
                'correct' => $done['correct'],
                'total' => $total,
                'seconds' => $done['seconds'],
            ],
        ];
    }

    /**
     * Abre la trivia: marca el inicio en el servidor (abrirla otra vez no reinicia el reloj).
     *
     * @return array{total: int, started_at: string}
     *
     * @throws RsvpException 404 sin trivia · 409 si ya cerró o ya respondió
     */
    public function start(Invitation $invitation): array
    {
        $total = $this->guard($invitation);
        $now = $this->now($invitation);
        if (InvitationService::isDemo($invitation)) {
            return ['total' => $total, 'started_at' => $now->toIso8601String()];
        }
        $started = $this->store->start($invitation->slug, $invitation->record['id'], $now);

        return ['total' => $total, 'started_at' => CarbonImmutable::parse($started, $now->getTimezone())->toIso8601String()];
    }

    /**
     * Califica y guarda. `answers` trae el número de la opción elegida de cada pregunta, en orden.
     *
     * @param  list<int>  $answers
     * @return array{name: string, correct: int, total: int, seconds: int}
     *
     * @throws RsvpException 404 sin trivia · 409 si ya cerró o ya respondió · 422 datos inválidos
     */
    public function submit(Invitation $invitation, string $name, array $answers): array
    {
        $total = $this->guard($invitation);
        $name = trim((string) preg_replace(['/[\x00-\x1F\x7F]+/u', '/\s+/u'], ' ', $name));
        if ($name === '') {
            throw new RsvpException('Escribe tu nombre.', 422, 'name');
        }

        $questions = $this->questions($invitation);
        $answers = array_values($answers);
        if (count($answers) !== $total) {
            throw new RsvpException('Responde todas las preguntas.', 422, 'answers');
        }
        $correct = 0;
        foreach ($questions as $i => $question) {
            $chosen = $answers[$i];
            if ($chosen < 1 || $chosen > count($question['options'])) {
                throw new RsvpException('Elige una de las opciones de cada pregunta.', 422, 'answers');
            }
            if ($chosen === $question['correct']) {
                $correct++;
            }
        }

        $now = $this->now($invitation);
        if (InvitationService::isDemo($invitation)) {
            return ['name' => $name, 'correct' => $correct, 'total' => $total, 'seconds' => 0];
        }
        $seconds = $this->store->add($invitation->slug, $invitation->record, $name, $answers, $correct, $now);

        return ['name' => $name, 'correct' => $correct, 'total' => $total, 'seconds' => $seconds];
    }

    /**
     * Antes de empezar o enviar: hay trivia, no cerró y este enlace no ha respondido.
     *
     * @return int cuántas preguntas tiene
     */
    private function guard(Invitation $invitation): int
    {
        $total = count($this->questions($invitation));
        if ($total === 0) {
            throw new RsvpException('Esta invitación no tiene trivia.', 404);
        }
        if (($closed = $this->closedReason($invitation)) !== null) {
            throw new RsvpException($closed, 409);
        }
        if (! InvitationService::isDemo($invitation) && $this->store->find($invitation->slug, $invitation->record['id']) !== null) {
            throw new RsvpException('Ya respondiste la trivia. ¡Gracias por participar!', 409);
        }

        return $total;
    }

    /** @return list<array{text: string, options: list<string>, correct: int}> */
    private function questions(Invitation $invitation): array
    {
        return TriviaQuiz::questions($this->section($invitation));
    }

    private function section(Invitation $invitation): ?DesignSection
    {
        $section = $this->events->design($invitation->slug)?->first('trivia');

        return $section !== null && $section->visible() ? $section : null;
    }

    private function now(Invitation $invitation): CarbonImmutable
    {
        return CarbonImmutable::now($invitation->event['timezone']);
    }
}
