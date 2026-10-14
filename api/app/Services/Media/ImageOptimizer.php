<?php

namespace App\Services\Media;

use GdImage;
use RuntimeException;

/**
 * Imágenes a WebP con GD: sin pasar de un ancho máximo, conservando la transparencia,
 * derechas (las fotos del celular traen la rotación en EXIF) y, si se pide, sin el aire
 * transparente que deja Canva alrededor. Lo usan media:optimizar y las subidas del gestor.
 */
final class ImageOptimizer
{
    /** Más que esto no se decodifica (un archivo así puede agotar la memoria de PHP). */
    public const MAX_PIXELS = 16_000_000;

    /**
     * @return array{width: int, height: int}
     *
     * @throws RuntimeException si no es una imagen que GD pueda leer o es demasiado grande
     */
    public function toWebp(string $source, string $target, int $maxWidth = 920, int $quality = 82, bool $trim = false, bool $noShadow = false): array
    {
        $size = @getimagesize($source);
        if ($size === false) {
            throw new RuntimeException('El archivo no es una imagen que se pueda leer.');
        }
        if ($size[0] * $size[1] > self::MAX_PIXELS) {
            throw new RuntimeException('La imagen es demasiado grande (más de 16 megapíxeles); redúcela antes de subirla.');
        }
        $this->ensureMemory();

        $image = $this->load($source, (int) $size[2]);
        if ($image === null) {
            throw new RuntimeException('El archivo no es una imagen que se pueda leer.');
        }
        if ($trim) {
            // Alfa de GD: 0 = opaco, 127 = transparente.
            $image = $this->trimTransparent($image, $noShadow ? 3 : 120);
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
        if (! imagewebp($image, $target, max(1, min(100, $quality)))) {
            throw new RuntimeException('No se pudo guardar la imagen.');
        }

        return ['width' => imagesx($image), 'height' => imagesy($image)];
    }

    /** PNG, JPEG, WebP o GIF → GdImage en color verdadero, ya derecha. */
    public function load(string $path, ?int $type = null): ?GdImage
    {
        $type ??= (int) (@getimagesize($path)[2] ?? 0);
        $image = match ($type) {
            IMAGETYPE_PNG => @imagecreatefrompng($path),
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_WEBP => @imagecreatefromwebp($path),
            IMAGETYPE_GIF => @imagecreatefromgif($path),
            default => false,
        };
        if (! $image instanceof GdImage) {
            return null;
        }
        // Los PNG de paleta (8 bits) se pasan a color verdadero para conservar la transparencia en WebP.
        imagepalettetotruecolor($image);

        return $type === IMAGETYPE_JPEG ? $this->upright($image, $path) : $image;
    }

    /**
     * Recorta los bordes totalmente transparentes. Recorre desde cada orilla y se detiene
     * en el primer pixel visible, así que en imágenes sin aire es casi instantáneo.
     */
    public function trimTransparent(GdImage $image, int $maxAlpha): GdImage
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

    /** Las fotos del celular guardan "gira 90°" en EXIF en vez de girar los pixeles. */
    private function upright(GdImage $image, string $path): GdImage
    {
        if (! function_exists('exif_read_data')) {
            return $image;
        }
        $orientation = (int) (@exif_read_data($path)['Orientation'] ?? 1);
        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };
        if ($angle === 0) {
            return $image;
        }
        $rotated = imagerotate($image, $angle, 0);

        return $rotated === false ? $image : $rotated;
    }

    /** Una foto grande necesita más de los 128 MB de producción solo mientras se procesa. */
    private function ensureMemory(): void
    {
        $limit = ini_get('memory_limit');
        $bytes = match (true) {
            $limit === false || $limit === '-1' => PHP_INT_MAX,
            str_ends_with(strtoupper($limit), 'G') => (int) $limit * 1024 ** 3,
            str_ends_with(strtoupper($limit), 'M') => (int) $limit * 1024 ** 2,
            default => (int) $limit,
        };
        if ($bytes < 256 * 1024 ** 2) {
            ini_set('memory_limit', '256M');
        }
    }
}
