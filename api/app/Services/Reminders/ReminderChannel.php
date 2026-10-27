<?php

namespace App\Services\Reminders;

/** Por dónde sale un recordatorio (WhatsApp de Meta, o el log en local y pruebas). */
interface ReminderChannel
{
    /**
     * @param  string  $phone  solo dígitos con lada de país (525512345678)
     * @param  array{name: string, event: string, deadline: string, token: string}  $vars  nombre, evento, fecha límite ("6 de noviembre") y token de la invitación
     */
    public function send(string $phone, array $vars): ReminderResult;
}
