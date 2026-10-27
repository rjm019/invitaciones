<?php

namespace App\Console\Commands;

use App\Services\Layout\EventRepository;
use App\Services\Media\ImageOptimizer;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Genera la miniatura (<nombre>-480.webp) de las fotos que ya están en eventos/<slug>/media/.
 * No toca las originales; si la miniatura ya existe, la deja (se puede correr las veces que sea).
 */
class ThumbnailMedia extends Command
{
    protected $signature = 'media:miniaturas
        {slug? : Carpeta del evento en eventos/; sin ella, todos los eventos}
        {--probar : Solo lista las miniaturas que faltan, sin escribir nada}';

    protected $description = 'Genera las miniaturas de 480 px de las fotos existentes (las originales no se tocan)';

    public function handle(EventRepository $events, ImageOptimizer $optimizer): int
    {
        $slug = $this->argument('slug');
        $slugs = $slug === null ? $events->slugs() : [(string) $slug];
        $dry = (bool) $this->option('probar');
        $rows = [];

        foreach ($slugs as $one) {
            $dir = $events->path($one);
            if ($dir === null || ! is_dir($dir.'/media')) {
                if ($slug !== null) {
                    $this->error("No existe eventos/{$one}/media/");

                    return self::FAILURE;
                }

                continue;
            }
            foreach (scandir($dir.'/media') ?: [] as $name) {
                $path = "{$dir}/media/{$name}";
                if (! preg_match('/\.webp$/i', $name) || ImageOptimizer::isThumbName($name) || ! is_file($path)) {
                    continue;
                }
                $thumb = "{$dir}/media/".ImageOptimizer::thumbName($name);
                if (is_file($thumb)) {
                    continue;
                }
                try {
                    if ($dry) {
                        $size = @getimagesize($path);
                        if ($size !== false && max($size[0], $size[1]) > ImageOptimizer::THUMB_SIDE) {
                            $rows[] = [$one, $name, 'falta'];
                        }

                        continue;
                    }
                    $made = $optimizer->makeThumbnail($path, $thumb);
                } catch (RuntimeException $e) {
                    $this->warn("{$one}/{$name}: ".$e->getMessage());

                    continue;
                }
                if ($made !== null) {
                    $rows[] = [$one, $name, $made['width'].'×'.$made['height']];
                }
            }
        }

        $this->table(['Evento', 'Foto', $dry ? 'Miniatura' : 'Creada'], $rows);
        $this->info(sprintf($dry ? '%d miniaturas por generar (no se escribió nada).' : '%d miniaturas generadas.', count($rows)));

        return self::SUCCESS;
    }
}
