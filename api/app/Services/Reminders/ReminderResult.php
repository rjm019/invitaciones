<?php

namespace App\Services\Reminders;

/**
 * Lo que respondió el canal al mandar un recordatorio. `fatal` es un error de token o de
 * permisos: seguir intentando con los demás enlaces sería inútil.
 */
final readonly class ReminderResult
{
    public function __construct(
        public bool $ok,
        public ?string $wamid = null,
        public ?string $errorCode = null,
        public bool $fatal = false,
    ) {}
}
