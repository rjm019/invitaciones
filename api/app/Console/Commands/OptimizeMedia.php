<?php

namespace App\Console\Commands;

use App\Services\Layout\EventRepository;
use GdImage;
use Illuminate\Console\Command;

/**
 * Convierte las imágenes de eventos/<slug>/media/originales/ (PNG o JPG, por ejemplo
 * exportadas de Canva) a WebP en eventos/<slug>/media/, sin pasar del ancho máximo.
 * Conserva la transparencia. Los originales no se tocan.
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

    public function handle(EventRepository $events): int
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
            $image = $this->load($source);
            if ($image === null) {
                $this->warn('No se pudo leer '.basename($source));

                continue;
            }

            if ($this->option('recortar')) {
                // Alfa de GD: 0 = opaco, 127 = transparente.
                $image = $this->trimTransparent($image, $this->option('sin-sombra') ? 3 : 120);
            }

            if (imagesx($image) > $maxWidth) {
                $height = (int) round(imagesy($image) * $maxWidth / imagesx($image));
                $scaled = imagescale($image, $maxWidth, $height, IMG_BICUBIC);
                if ($scaled !== false) {
                    $image = $scaled;
                }
            }
            imagealphablending($image, false);
            imagesavealpha($image, true);

            $target = $dir.'/media/'.pathinfo($source, PATHINFO_FILENAME).'.webp';
            imagewebp($image, $target, $quality);

            $before += filesize($source);
            $after += filesize($target);
            $rows[] = [basename($target), imagesx($image).'×'.imagesy($image), round(filesize($source) / 1024).' KB', round(filesize($target) / 1024).' KB'];
        }

        $this->table(['Archivo', 'Tamaño', 'Original', 'WebP'], $rows);
        $this->info(sprintf('Total: %d KB → %d KB', $before / 1024, $after / 1024));

        return self::SUCCESS;
    }

    /**
     * Recorta los bordes totalmente transparentes. Recorre desde cada orilla y se detiene
     * en el primer pixel visible, así que en imágenes sin aire es casi instantáneo.
     */
    private function trimTransparent(GdImage $image, int $maxAlpha): GdImage
    {
        $w = imagesx($image);
        $h = imagesy($image);
        $visible = fn (int $x, int $y) => ((imagecolorat($image, $x, $y) >> 24) & 0x7F) < $maxAlpha;
        $rowHas = function (int $y) use ($w, $visible) {
            for ($x = 0; $x < $w; $x++) {
                if ($visible($x, $y)) {
                    return true;
                }
            }

            return false;
        };
        $colHas = function (int $x, int $top, int $bottom) use ($visible) {
            for ($y = $top; $y <= $bottom; $y++) {
                if ($visible($x, $y)) {
                    return true;
                }
            }

            return false;
        };

        for ($top = 0; $top < $h && ! $rowHas($top); $top++);
        if ($top === $h) {
            return $image; // toda transparente: se deja igual
        }
        for ($bottom = $h - 1; $bottom > $top && ! $rowHas($bottom); $bottom--);
        for ($left = 0; $left < $w - 1 && ! $colHas($left, $top, $bottom); $left++);
        for ($right = $w - 1; $right > $left && ! $colHas($right, $top, $bottom); $right--);

        if ($top === 0 && $left === 0 && $bottom === $h - 1 && $right === $w - 1) {
            return $image;
        }
        $cropped = imagecrop($image, ['x' => $left, 'y' => $top, 'width' => $right - $left + 1, 'height' => $bottom - $top + 1]);

        return $cropped === false ? $image : $cropped;
    }

    private function load(string $path): ?GdImage
    {
        $image = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => @imagecreatefrompng($path),
            default => @imagecreatefromjpeg($path),
        };
        if (! $image instanceof GdImage) {
            return null;
        }
        // Los PNG de paleta (8 bits) se pasan a color verdadero para conservar la transparencia en WebP.
        imagepalettetotruecolor($image);

        return $image;
    }
}
