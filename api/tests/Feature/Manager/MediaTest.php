<?php

namespace Tests\Feature\Manager;

use Illuminate\Http\UploadedFile;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    private function png(int $width, int $height): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'img');
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagefilledrectangle($image, 10, 10, $width - 11, $height - 11, imagecolorallocatealpha($image, 140, 192, 232, 0));
        imagepng($image, $path);

        return new UploadedFile($path, 'Sobre Rosa (1).PNG', 'image/png', null, true);
    }

    private function upload(UploadedFile $file, array $extra = [])
    {
        return $this->asManager()->post('/api/manager/events/nueva/media', ['file' => $file, ...$extra], ['Accept' => 'application/json']);
    }

    public function test_an_image_becomes_webp_with_a_new_name(): void
    {
        $file = $this->upload($this->png(2000, 1000))->assertCreated()->json('file');

        $this->assertMatchesRegularExpression('/^sobre-rosa-1-[0-9a-f]{4}\.webp$/', $file['name']);
        $this->assertSame([1200, 600], [$file['width'], $file['height']]);
        $this->assertSame('image', $file['kind']);
        $this->assertFileExists("{$this->eventos}/nueva/media/{$file['name']}");
        $this->get("/media/nueva/{$file['name']}")->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');

        // Un fondo cubre toda la sección: va más ancho. Y nunca pisa el anterior.
        $background = $this->upload($this->png(2000, 1000), ['purpose' => 'fondo'])->json('file');
        $this->assertSame(1600, $background['width']);
        $this->assertNotSame($file['name'], $background['name']);
    }

    public function test_canva_transparent_margins_can_be_trimmed(): void
    {
        $file = $this->upload($this->png(300, 200), ['purpose' => 'adorno', 'trim' => 1])->json('file');

        $this->assertSame([280, 180], [$file['width'], $file['height']]);
    }

    public function test_a_song_is_kept_as_it_is(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'mp3');
        file_put_contents($path, "ID3\x03\x00\x00\x00\x00\x00\x00".str_repeat("\xFF\xFB\x90\x64".str_repeat("\x00", 413), 4));

        $file = $this->upload(new UploadedFile($path, 'Mi Canción.mp3', 'audio/mpeg', null, true))->assertCreated()->json('file');

        $this->assertMatchesRegularExpression('/^mi-cancion-[0-9a-f]{4}\.mp3$/', $file['name']);
        $this->assertSame('audio', $file['kind']);
    }

    public function test_svg_html_and_disguised_files_are_rejected(): void
    {
        foreach ([
            ['dibujo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
            ['foto.png', '<html><body><script>alert(1)</script></body></html>'],
            ['notas.txt', 'hola'],
        ] as [$name, $content]) {
            $path = tempnam(sys_get_temp_dir(), 'bad');
            file_put_contents($path, $content);
            $this->upload(new UploadedFile($path, $name, null, null, true))
                ->assertStatus(422)
                ->assertJsonPath('message', 'Ese tipo de archivo no se puede usar. Sube una imagen (JPG, PNG, WebP o GIF) o una canción (MP3 o M4A).');
        }
        $this->assertSame(['salon.webp'], array_values(array_diff(scandir("{$this->eventos}/nueva/media"), ['.', '..'])));
    }

    public function test_the_library_says_where_each_file_is_used_and_protects_it(): void
    {
        $library = $this->asManager()->getJson('/api/manager/events/nueva/media')->assertOk()->json();

        $this->assertSame('salon.webp', $library['files'][0]['name']);
        $this->assertSame([['version' => 'publicada', 'block' => 'evento', 'item' => null, 'field' => 'salon_foto']], $library['files'][0]['used_in']);
        $this->assertGreaterThan(0, $library['total_bytes']);

        $this->deleteJson('/api/manager/events/nueva/media/salon.webp')
            ->assertStatus(409)
            ->assertJsonPath('used_in.0.field', 'salon_foto');

        $unused = $this->upload($this->png(100, 100))->json('file.name');
        $this->deleteJson("/api/manager/events/nueva/media/{$unused}")->assertNoContent();
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/{$unused}");
        $this->deleteJson('/api/manager/events/nueva/media/no-existe.webp')->assertNotFound();
    }
}
