<?php

namespace App\Console\Commands;

use App\Services\Design\LegacyMigrator;
use App\Services\Design\PublicationLog;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Pasa eventos del formato anterior (layout.xlsx o CSV por pestaña) a invitacion.csv.
 * Primero compara: solo escribe si la invitación sale idéntica (o con --forzar).
 */
class MigrateInvitation extends Command
{
    protected $signature = 'invitacion:migrar
        {slug? : Carpeta del evento en eventos/}
        {--todos : Todos los eventos que siguen en el formato anterior}
        {--probar : Solo revisa; no escribe nada}
        {--forzar : Migra aunque haya diferencias (después de mostrarlas)}
        {--limpiar : En un evento ya migrado, quita el layout viejo de su carpeta (queda en respaldos/)}';

    protected $description = 'Pasa eventos del Excel anterior a invitacion.csv, comprobando que la invitación quede idéntica';

    public function handle(EventRepository $events, LegacyMigrator $migrator, PublicationLog $log): int
    {
        $slug = (string) $this->argument('slug');
        if ($slug === '' && ! $this->option('todos')) {
            $this->error('Indica un evento (invitacion:migrar nat) o usa --todos.');

            return self::FAILURE;
        }
        $slugs = $this->option('todos') ? $events->slugs() : [$slug];
        $now = CarbonImmutable::now();
        $ok = true;

        foreach ($slugs as $one) {
            if ($events->path($one) === null) {
                $this->error("No existe eventos/{$one}.");
                $ok = false;

                continue;
            }

            if ($this->option('limpiar')) {
                if (! $events->hasDesign($one) && $this->option('todos')) {
                    continue;
                }
                $ok = $this->cleanup($one, $migrator, $now) && $ok;

                continue;
            }

            if ($events->hasDesign($one)) {
                $this->line("<fg=gray>{$one}: ya está en el formato nuevo.</>");

                continue;
            }
            if ($migrator->legacyFiles((string) $events->path($one)) === []) {
                $this->line("<fg=gray>{$one}: no tiene layout.</>");

                continue;
            }

            $ok = $this->migrate($one, (string) $events->path($one), $migrator, $log, $now) && $ok;
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    private function migrate(string $slug, string $dir, LegacyMigrator $migrator, PublicationLog $log, CarbonImmutable $now): bool
    {
        $check = $migrator->check($slug, $now);
        foreach ($check['warnings'] as $warning) {
            $this->warn("  {$slug}: {$warning}");
        }
        if ($check['errors'] !== []) {
            $this->error("{$slug}: tiene errores; corrígelos antes de migrar:");
            foreach ($check['errors'] as $error) {
                $this->line("  · {$error}");
            }

            return false;
        }

        if (! $check['identical']) {
            $this->warn("{$slug}: la invitación NO saldría idéntica:");
            foreach ($check['differences'] as $difference) {
                $this->line("  · {$difference}");
            }
            if (! $this->option('forzar') || $this->option('probar')) {
                $this->line('  No se escribió nada.'.($this->option('probar') ? '' : ' Corrige el layout o usa --forzar.'));

                return false;
            }
        } else {
            $this->info("{$slug}: idéntica.");
        }

        if ($this->option('probar')) {
            return true;
        }

        $migrator->apply($slug, $check['design'], $check['settings'], $now, PublicationLog::TERMINAL);
        $log->add($dir, $now, 'formato anterior', count($check['design']->sections), PublicationLog::TERMINAL);
        $this->info("{$slug}: listo, ahora usa eventos/{$slug}/invitacion.csv (el layout viejo se copió a respaldos/).");

        return true;
    }

    private function cleanup(string $slug, LegacyMigrator $migrator, CarbonImmutable $now): bool
    {
        try {
            $moved = $migrator->cleanup($slug, $now);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage());

            return false;
        }
        $this->info($moved === []
            ? "{$slug}: ya no tenía layout viejo."
            : "{$slug}: se movió a respaldos/: ".implode(', ', $moved));

        return true;
    }
}
