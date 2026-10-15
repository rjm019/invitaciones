<?php

namespace App\Console\Commands;

use App\Services\Design\DesignConflict;
use App\Services\Design\DesignPublisher;
use App\Services\Design\DesignStore;
use App\Services\Design\DesignTransfer;
use App\Services\Design\PublicationLog;
use App\Services\Design\PublishBlocked;
use App\Services\Layout\EventRepository;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Vuelve a armar una invitación desde un archivo (csv, xlsx —también del formato
 * anterior— o zip con su media). Queda en el borrador; con --publicar se publica de una vez.
 */
class ImportInvitation extends Command
{
    protected $signature = 'invitacion:importar
        {slug : Carpeta del evento en eventos/ (debe existir)}
        {archivo : invitacion.csv, .xlsx o .zip}
        {--publicar : Publica el borrador después de importarlo}';

    protected $description = 'Importa una invitación (csv, xlsx o zip) al borrador de un evento';

    public function handle(EventRepository $events, DesignTransfer $transfer, DesignStore $store, DesignPublisher $publisher): int
    {
        $slug = (string) $this->argument('slug');
        $path = (string) $this->argument('archivo');
        if ($events->path($slug) === null) {
            $this->error("No existe eventos/{$slug}.");

            return self::FAILURE;
        }
        if (! is_file($path)) {
            $this->error("No existe el archivo {$path}.");

            return self::FAILURE;
        }

        try {
            $result = $transfer->import($slug, $path, basename($path));
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        foreach ($result['warnings'] as $warning) {
            $this->warn("  aviso: {$warning}");
        }
        $this->info("{$slug}: quedó en el borrador".($result['media'] === [] ? '.' : ' ('.count($result['media']).' archivos de media).'));

        if (! $this->option('publicar')) {
            return self::SUCCESS;
        }
        try {
            $publisher->publish($slug, $store->version($slug), by: PublicationLog::TERMINAL);
        } catch (PublishBlocked $e) {
            $this->error($e->getMessage());
            foreach ($e->issues as $issue) {
                $this->line("  · {$issue['message']}");
            }

            return self::FAILURE;
        } catch (DesignConflict) {
            $this->error('La invitación cambió mientras se importaba; intenta de nuevo.');

            return self::FAILURE;
        }
        $this->info("{$slug}: publicada.");

        return self::SUCCESS;
    }
}
