<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class ThumbnailsTest extends TestCase
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
        imagepng(imagecreatetruecolor($width, $height), $path);

        return new UploadedFile($path, 'Foto.png', 'image/png', null, true);
    }

    private function upload(UploadedFile $file): array
    {
        return $this->asManager()->post('/api/manager/events/nueva/media', ['file' => $file], ['Accept' => 'application/json'])->assertCreated()->json('file');
    }

    private function webp(string $name, int $width, int $height): void
    {
        @mkdir("{$this->eventos}/nueva/media");
        imagewebp(imagecreatetruecolor($width, $height), "{$this->eventos}/nueva/media/{$name}");
    }

    public function test_upload_makes_a_480_thumbnail_and_the_library_hides_it(): void
    {
        $file = $this->upload($this->png(1000, 500));
        $thumb = "{$this->eventos}/nueva/media/".str_replace('.webp', '-480.webp', $file['name']);

        $this->assertFileExists($thumb);
        $this->assertSame([480, 240], array_slice(getimagesize($thumb), 0, 2));

        $names = array_column($this->asManager()->getJson('/api/manager/events/nueva/media')->assertOk()->json('files'), 'name');
        $this->assertContains($file['name'], $names);
        $this->assertNotContains(str_replace('.webp', '-480.webp', $file['name']), $names);
    }

    public function test_a_small_photo_gets_no_thumbnail(): void
    {
        $file = $this->upload($this->png(400, 300));

        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/".str_replace('.webp', '-480.webp', $file['name']));
    }

    public function test_the_thumbnail_goes_with_its_photo(): void
    {
        $file = $this->upload($this->png(1000, 500));
        $thumb = "{$this->eventos}/nueva/media/".str_replace('.webp', '-480.webp', $file['name']);

        $this->asManager()->deleteJson("/api/manager/events/nueva/media/{$file['name']}")->assertSuccessful();

        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/{$file['name']}");
        $this->assertFileDoesNotExist($thumb);
    }

    public function test_media_miniaturas_is_idempotent_and_probar_writes_nothing(): void
    {
        $this->webp('grande.webp', 900, 600);
        $this->webp('chica.webp', 300, 200);
        $thumb = "{$this->eventos}/nueva/media/grande-480.webp";

        $this->artisan('media:miniaturas', ['slug' => 'nueva', '--probar' => true])->assertSuccessful();
        $this->assertFileDoesNotExist($thumb);

        $this->artisan('media:miniaturas', ['slug' => 'nueva'])->assertSuccessful();
        $this->assertSame([480, 320], array_slice(getimagesize($thumb), 0, 2));
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/chica-480.webp");
        $this->assertSame([900, 600], array_slice(getimagesize("{$this->eventos}/nueva/media/grande.webp"), 0, 2));

        $before = filemtime($thumb);
        $hash = md5_file($thumb);
        $this->artisan('media:miniaturas')->assertSuccessful(); // sin slug: todos los eventos
        $this->assertSame($hash, md5_file($thumb));
        $this->assertSame($before, filemtime($thumb));
        $this->assertFileDoesNotExist("{$thumb}-480.webp");
    }

    public function test_the_gallery_offers_the_thumbnail_only_when_it_exists(): void
    {
        $this->webp('grande.webp', 900, 600);
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,1,foto,grande.webp');
        $photo = fn () => collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'galeria')['photos'][0];

        $without = $photo();
        $this->assertSame(['photo', 'caption', 'width', 'height'], array_keys($without));

        $this->artisan('media:miniaturas', ['slug' => 'nueva'])->assertSuccessful();
        $with = $photo();
        $this->assertStringEndsWith('/media/nueva/grande-480.webp', $with['thumb']);
        $this->assertSame(480, $with['thumb_width']);
        $this->assertSame($without['photo'], $with['photo']);
    }
}
