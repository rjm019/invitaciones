<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventGalleryTest extends TestCase
{
    use CopiesEventFixtures;

    public function test_the_gallery_photos_come_in_order_and_rows_without_a_photo_are_skipped(): void
    {
        $this->copyEventFixtures();
        foreach ([
            'galeria,,visible,SI',
            'galeria,,variante,marcos',
            'galeria,1,foto,uno.webp',
            'galeria,1,pie,En el parque',
            'galeria,2,pie,Sin foto',
            'galeria,3,foto,tres.webp',
        ] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $event = $this->getJson('/api/public/events/nueva')->assertOk()->json('event');

        $this->assertSame([
            ['photo' => 'uno.webp', 'caption' => 'En el parque'],
            ['photo' => 'tres.webp', 'caption' => ''],
        ], $event['gallery']);
        $gallery = collect($event['sections'])->firstWhere('key', 'galeria');
        $this->assertSame('gallery', $gallery['type']);
        $this->assertSame('marcos', $gallery['variant']);
    }

    public function test_photos_in_media_bring_their_size_for_the_layout(): void
    {
        $this->copyEventFixtures();
        @mkdir("{$this->eventos}/nueva/media");
        $image = imagecreatetruecolor(30, 20);
        imagepng($image, "{$this->eventos}/nueva/media/horizontal.png");
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,1,foto,horizontal.png');

        $photo = $this->getJson('/api/public/events/nueva')->assertOk()->json('event.gallery.0');

        $this->assertStringEndsWith('/media/nueva/horizontal.png', $photo['photo']);
        $this->assertSame([30, 20], [$photo['width'], $photo['height']]);
    }

    public function test_the_cover_photo_goes_into_the_hero_section(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('nueva', 'invitacion.csv', 'portada,,imagen,portada.webp');
        $this->appendLine('nueva', 'invitacion.csv', 'portada,,variante,estatua');

        $cover = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'portada');

        $this->assertSame('portada.webp', $cover['image']);
        $this->assertSame('estatua', $cover['variant']);
    }

    public function test_without_a_gallery_the_key_is_left_out(): void
    {
        $this->copyEventFixtures();

        $this->assertArrayNotHasKey('gallery', $this->getJson('/api/public/events/nueva')->assertOk()->json('event'));
    }

    public function test_the_envelope_rain_is_its_own_section_and_hides_the_account_from_the_general_link(): void
    {
        $this->copyEventFixtures();
        foreach (['lluvia_sobres,,visible,SI', 'lluvia_sobres,,texto,Si prefieres un sobre', 'lluvia_sobres,,banco,BBVA', 'lluvia_sobres,,cuenta,012180001234567891'] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $event = $this->getJson('/api/public/events/nueva')->assertOk()->json('event');

        $this->assertSame('envelope-rain', collect($event['sections'])->firstWhere('key', 'lluvia_sobres')['type']);
        $this->assertSame('Si prefieres un sobre', $event['envelope']['text']);
        $this->assertSame('', $event['envelope']['account']);
        $this->assertTrue($event['envelope']['hidden']);
        $this->assertArrayNotHasKey('gifts', $event);
    }

    public function test_the_image_layer_uses_its_image_as_a_fixed_background(): void
    {
        $this->copyEventFixtures();
        foreach (['capa,,visible,SI', 'capa,,imagen,ciudad.webp', 'capa,,variante,alta'] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $layer = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'capa');

        $this->assertSame('layer', $layer['type']);
        $this->assertSame('alta', $layer['variant']);
        $this->assertSame('ciudad.webp', $layer['background']['image']);
        $this->assertSame('sticky', $layer['background']['attachment']);
    }
}
