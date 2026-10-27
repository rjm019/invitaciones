<?php

namespace App\Services\Reminders;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/** Canal de local y pruebas: no manda nada, solo lo anota en el log. */
final class LogChannel implements ReminderChannel
{
    public function send(string $phone, array $vars): ReminderResult
    {
        Log::info('Recordatorio de WhatsApp (canal log)', ['phone' => $phone, 'event' => $vars['event'] ?? '']);

        return new ReminderResult(true, 'log-'.Str::uuid());
    }
}
