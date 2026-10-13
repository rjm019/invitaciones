<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class OptimizeMediaTest extends TestCase
{
    use CopiesEventFixtures;

    public function test_converts_to_webp_and_can_trim_transparent_margins(): void
    {
        $this->copyEventFixtures();
        $dir = "{$this->eventos}/prueba/media/originales";
        mkdir($dir, 0775, true);

        // 100×80 transparente con un rectángulo visible de 40×20 en (30, 25).
        $image = imagecreatetruecolor(100, 80);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagefilledrectangle($image, 30, 25, 69, 44, imagecolorallocatealpha($image, 140, 192, 232, 0));
        imagepng($image, "{$dir}/sello.png");
        imagepng($image, "{$dir}/otro.png");

        $this->artisan('media:optimizar', ['slug' => 'prueba', 'archivos' => ['sello.png'], '--recortar' => true])
            ->assertSuccessful();

        $this->assertSame([40, 20], array_slice(getimagesize("{$this->eventos}/prueba/media/sello.webp"), 0, 2));
        $this->assertFileDoesNotExist("{$this->eventos}/prueba/media/otro.webp"); // solo el que se pidió

        // Con una sombra semitransparente alrededor: --sin-sombra deja solo lo opaco.
        imagefilledrectangle($image, 20, 15, 79, 54, imagecolorallocatealpha($image, 0, 0, 0, 100));
        imagefilledrectangle($image, 30, 25, 69, 44, imagecolorallocatealpha($image, 140, 192, 232, 0));
        imagepng($image, "{$dir}/tarjeta.png");
        $this->artisan('media:optimizar', ['slug' => 'prueba', 'archivos' => ['tarjeta.png'], '--recortar' => true, '--sin-sombra' => true])
            ->assertSuccessful();
        $this->assertSame([40, 20], array_slice(getimagesize("{$this->eventos}/prueba/media/tarjeta.webp"), 0, 2));
    }
}
