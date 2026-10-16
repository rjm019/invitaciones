<?php

namespace App\Console\Commands;

use App\Services\Design\DesignStore;
use App\Services\Design\InvitationConfigBuilder;
use App\Services\Layout\EventRepository;
use Illuminate\Console\Command;

/**
 * Revisa la invitación de un evento (el borrador si hay, si no la publicada) y dice qué
 * corregir, igual que el editor del gestor antes de publicar.
 */
class ValidateInvitation extends Command
{
    protected $signature = 'invitacion:validar {slug : Carpeta del evento en eventos/}';

    protected $description = 'Revisa la invitación de un evento (borrador o publicada) y lista lo que hay que corregir';

    public function handle(EventRepository $events, DesignStore $store, InvitationConfigBuilder $builder): int
    {
        $slug = (string) $this->argument('slug');
        if ($events->path($slug) === null) {
            $this->error("No existe eventos/{$slug}.");

            return self::FAILURE;
        }

        $current = $store->current($slug);
        $label = ['draft' => 'el borrador', 'live' => 'la invitación publicada', 'legacy' => 'el layout anterior (convertido)'][$current['source']];
        $settings = array_merge($current['settings'], array_filter($events->settings($slug), fn ($v) => $v !== ''));
        $result = $builder->build($slug, $current['design'], $events->media($slug), $settings);

        foreach ([...$current['warnings'], ...$result->warnings()] as $warning) {
            $this->warn("  aviso: {$warning}");
        }
        if ($result->hasErrors()) {
            $this->error("{$slug}: {$label} tiene errores:");
            foreach ($result->errors() as $error) {
                $this->line("  · {$error}");
            }

            return self::FAILURE;
        }

        $ready = $current['source'] === 'live' ? 'lista' : 'listo';
        $this->info("{$slug}: {$label} está {$ready} (".count($result->config['sections']).' secciones visibles).');

        return self::SUCCESS;
    }
}
