<?php

namespace App\Console\Commands;

use App\Services\Layout\EventRepository;
use App\Services\Media\ImageOptimizer;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Convierte las imágenes de eventos/<slug>/media/originales/ (PNG o JPG, por ejemplo
 * exportadas de Canva) a WebP en eventos/<slug>/media/, sin pasar del ancho máximo.
 * Conserva la transparencia. Los originales no se tocan. (El gestor hace lo mismo al subir.)
 */
class OptimizeMedia extends Command
{
    protected $signature = 'media:optimizar
        {slug : Carpeta del evento en eventos/}
        {archivos?* : Solo estos originales (papel.png …); sin nombres, todos}
        {--ancho=920 : Ancho máximo en px (2× la columna de 460 px)}
        {--calidad=82 : Calidad WebP de 1 a 100}
        {--recortar : Quita los márgenes transparentes (Canva suele exportar con aire alrededor)}
        {--sin-sombra : Con --recortar, quita también sombras y bordes semitransparentes (deja solo lo opaco)}';

    protected $description = 'Convierte media/originales/* del evento a WebP optimizado';

    public function handle(EventRepository $events, ImageOptimizer $optimizer): int
    {
        $dir = $events->path((string) $this->argument('slug'));
        if ($dir === null || ! is_dir($dir.'/media/originales')) {
            $this->error('No existe eventos/'.$this->argument('slug').'/media/originales/');

            return self::FAILURE;
        }

        $maxWidth = max(1, (int) $this->option('ancho'));
        $quality = min(100, max(1, (int) $this->option('calidad')));
        $before = $after = 0;
        $rows = [];

        // Sin GLOB_BRACE: no existe en Alpine (musl).
        $sources = array_filter(
            glob($dir.'/media/originales/*') ?: [],
            fn ($f) => in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), ['png', 'jpg', 'jpeg'], true),
        );

        $only = (array) $this->argument('archivos');
        if ($only !== []) {
            $sources = array_filter($sources, fn ($f) => in_array(basename($f), $only, true));
            foreach (array_diff($only, array_map('basename', $sources)) as $missing) {
                $this->warn("No está en originales/: {$missing}");
            }
        }

        foreach ($sources as $source) {
            $target = $dir.'/media/'.pathinfo($source, PATHINFO_FILENAME).'.webp';
            try {
                $size = $optimizer->toWebp($source, $target, $maxWidth, $quality, (bool) $this->option('recortar'), (bool) $this->option('sin-sombra'));
            } catch (RuntimeException $e) {
                $this->warn('No se pudo leer '.basename($source).': '.$e->getMessage());

                continue;
            }

            $before += filesize($source);
            $after += filesize($target);
            $rows[] = [basename($target), $size['width'].'×'.$size['height'], round(filesize($source) / 1024).' KB', round(filesize($target) / 1024).' KB'];
        }

        $this->table(['Archivo', 'Tamaño', 'Original', 'WebP'], $rows);
        $this->info(sprintf('Total: %d KB → %d KB', $before / 1024, $after / 1024));

        return self::SUCCESS;
    }
}
