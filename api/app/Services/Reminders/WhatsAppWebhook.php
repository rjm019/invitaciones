<?php

namespace App\Services\Reminders;

use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Lo que Meta avisa por el webhook: el estado de cada mensaje (entregado, leído, fallido)
 * y las respuestas de la gente (el botón «Ya no recibir» o escribir BAJA).
 */
final class WhatsAppWebhook
{
    private const STATUSES = ['delivered' => 'entregado', 'read' => 'leido', 'failed' => 'fallido'];

    public function __construct(
        private readonly ReminderLog $log,
        private readonly EventRepository $events,
    ) {}

    /** ¿La firma X-Hub-Signature-256 corresponde al cuerpo crudo? */
    public static function validSignature(string $body, ?string $header, string $secret): bool
    {
        return $secret !== '' && $header !== null
            && hash_equals('sha256='.hash_hmac('sha256', $body, $secret), $header);
    }

    /** @param  array<string, mixed>  $payload */
    public function handle(array $payload): void
    {
        foreach ((array) ($payload['entry'] ?? []) as $entry) {
            foreach ((array) ($entry['changes'] ?? []) as $change) {
                $value = (array) ($change['value'] ?? []);
                foreach ((array) ($value['statuses'] ?? []) as $status) {
                    $this->status((array) $status);
                }
                foreach ((array) ($value['messages'] ?? []) as $message) {
                    $this->message((array) $message);
                }
            }
        }
    }

    /** @param  array<string, mixed>  $status */
    private function status(array $status): void
    {
        $state = self::STATUSES[$status['status'] ?? ''] ?? null; // "sent" ya está como "enviado"
        $wamid = (string) ($status['id'] ?? '');
        $found = $state === null ? null : $this->log->locate($wamid);
        if ($found === null) {
            return;
        }
        $detail = $state === 'fallido' ? (string) ($status['errors'][0]['code'] ?? '') : '';
        $this->log->add($found['slug'], $found['id'], $wamid, $state, $detail, $this->now($found['slug']));
    }

    /** @param  array<string, mixed>  $message */
    private function message(array $message): void
    {
        $text = match ($message['type'] ?? '') {
            'button' => (string) ($message['button']['payload'] ?? $message['button']['text'] ?? ''),
            'text' => (string) ($message['text']['body'] ?? ''),
            default => '',
        };
        $normalized = mb_strtoupper((string) preg_replace('/\s+/u', '', $text));
        $optOut = $normalized === 'BAJA' || ($message['type'] ?? '') === 'button'
            && in_array($normalized, ['BAJA', 'YANORECIBIR'], true);
        $from = (string) ($message['from'] ?? '');
        if (! $optOut || $from === '') {
            return;
        }

        $found = $this->log->locate((string) ($message['context']['id'] ?? ''));
        $this->log->optOut($from, $found['slug'] ?? '', $found['id'] ?? '', $this->now($found['slug'] ?? ''));
        if ($found !== null) {
            $this->log->add($found['slug'], $found['id'], (string) ($message['context']['id'] ?? ''), 'baja', '', $this->now($found['slug']));
        }
    }

    private function now(string $slug): CarbonImmutable
    {
        try {
            $tz = $slug !== '' ? ($this->events->find($slug)['timezone'] ?? null) : null;
        } catch (Throwable) {
            $tz = null;
        }

        return CarbonImmutable::now($tz);
    }
}
