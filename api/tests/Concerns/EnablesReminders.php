<?php

namespace Tests\Concerns;

use App\Services\Csv\CsvFile;
use App\Services\Invitations\EventSettings;
use App\Services\Invitations\InvitationStore;
use App\Services\Layout\EventRepository;
use App\Services\Reminders\ReminderLog;
use Carbon\CarbonImmutable;

/**
 * Pruebas de los recordatorios por WhatsApp: encender la función en el evento "prueba"
 * (fecha límite 6-nov, evento 28-nov), ponerle teléfono a los enlaces y simular lo ya enviado.
 * Requiere CopiesEventFixtures.
 */
trait EnablesReminders
{
    /** @param  array<string, string|null>  $extra */
    protected function enableReminders(array $extra = [], string $slug = 'prueba'): void
    {
        app(EventSettings::class)->put("{$this->eventos}/{$slug}", [
            'whatsapp_recordatorios' => 'SI',
            'recordatorio_cada_dias' => '3',
            'recordatorio_permiso' => '2026-10-10 10:00:00',
            ...$extra,
        ], CarbonImmutable::now(), EventSettings::OWNER);
        app(EventRepository::class)->forget($slug);
    }

    protected function setPhone(string $id, string $phone = '525512345678', string $slug = 'prueba'): void
    {
        app(InvitationStore::class)->setPhone($slug, $id, $phone, CarbonImmutable::now());
    }

    protected function logReminder(string $id, string $state, string $date, string $detail = '', string $slug = 'prueba'): void
    {
        (new CsvFile)->append("{$this->eventos}/{$slug}/".ReminderLog::FILE, ReminderLog::HEADERS, [
            'fecha' => $date, 'invitacion' => $id, 'wamid' => "wamid-{$id}-{$date}", 'estado' => $state, 'detalle' => $detail,
        ]);
    }
}
