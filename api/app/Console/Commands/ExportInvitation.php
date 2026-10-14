<?php

namespace App\Console\Commands;

use App\Services\Design\DesignTransfer;
use App\Services\Layout\EventRepository;
use Illuminate\Console\Command;

/**
 * Desarma una invitación: la deja en un archivo (csv, xlsx o zip con su media). Es lo
 * mismo que "Descargar" en el gestor. Nunca lleva la clave del panel ni datos de invitados.
 */
class ExportInvitation extends Command
{
    protected $signature = 'invitacion:exportar
        {slug : Carpeta del evento en eventos/}
        {--formato=zip : csv, xlsx o zip (invitación + media)}
        {--salida= : Ruta del archivo (por defecto, invitacion-<slug>.<formato> en la carpeta actual)}';

    protected $description = 'Exporta la invitación de un evento a csv, xlsx o zip (con su media)';

    public function handle(EventRepository $events, DesignTransfer $transfer): int
    {
        $slug = (string) $this->argument('slug');
        $format = (string) $this->option('formato');
        if ($events->path($slug) === null) {
            $this->error("No existe eventos/{$slug}.");

            return self::FAILURE;
        }
        if (! in_array($format, ['csv', 'xlsx', 'zip'], true)) {
            $this->error('El formato es csv, xlsx o zip.');

            return self::FAILURE;
        }

        $file = $transfer->export($slug, $format);
        $target = (string) ($this->option('salida') ?: getcwd().'/'.$file['name']);
        rename($file['path'], $target);
        $this->info("Listo: {$target}");

        return self::SUCCESS;
    }
}
