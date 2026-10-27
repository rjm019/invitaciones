<?php

namespace App\Console\Commands;

use App\Services\Reminders\ReminderRunner;
use Illuminate\Console\Command;

/**
 * Manda los recordatorios del RSVP por WhatsApp que tocan hoy (lo mismo que el endpoint
 * interno). Con --probar solo dice a quién le toca: no manda ni escribe nada.
 */
class SendReminders extends Command
{
    protected $signature = 'recordatorios:enviar {--slug= : Solo este evento} {--probar : Solo listar a quién le toca}';

    protected $description = 'Manda los recordatorios del RSVP por WhatsApp que tocan hoy';

    public function handle(ReminderRunner $runner): int
    {
        $slug = $this->option('slug') ?: null;
        $summary = $runner->run($slug, (bool) $this->option('probar'));

        if ($this->option('probar')) {
            foreach ($summary['due'] as $due) {
                $this->line("{$due['event']}: invitación #{$due['invitation']}");
            }
            $this->info(count($summary['due']).' recordatorios tocan hoy (no se mandó nada).');

            return self::SUCCESS;
        }

        $this->info("Enviados {$summary['sent']}, fallidos {$summary['failed']}, pendientes {$summary['skipped']}, eventos {$summary['events']}.");
        if ($summary['stopped'] !== null) {
            $this->error("La corrida se detuvo: Meta rechazó el token o los permisos (código {$summary['stopped']}).");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
