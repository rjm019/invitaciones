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

        $gallery = collect($event['sections'])->firstWhere('key', 'galeria');
        $this->assertSame('gallery', $gallery['type']);
        $this->assertSame('marcos', $gallery['variant']);
        $this->assertSame([
            ['photo' => 'uno.webp', 'caption' => 'En el parque'],
            ['photo' => 'tres.webp', 'caption' => ''],
        ], $gallery['photos']);
        $this->assertArrayNotHasKey('gallery', $event);
    }

    public function test_several_galleries_each_bring_their_own_photos_and_presentation(): void
    {
        $this->copyEventFixtures();
        foreach ([
            'galeria,,visible,SI', 'galeria,1,foto,uno.webp',
            'galeria-2,,visible,SI', 'galeria-2,,variante,diapositivas', 'galeria-2,1,foto,dos.webp', 'galeria-2,2,foto,tres.webp',
        ] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $sections = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'));

        $this->assertSame(['uno.webp'], array_column($sections->firstWhere('key', 'galeria')['photos'], 'photo'));
        $second = $sections->firstWhere('key', 'galeria-2');
        $this->assertSame('gallery', $second['type']);
        $this->assertSame('diapositivas', $second['variant']);
        $this->assertSame(['dos.webp', 'tres.webp'], array_column($second['photos'], 'photo'));
    }

    public function test_photos_in_media_bring_their_size_for_the_layout(): void
    {
        $this->copyEventFixtures();
        @mkdir("{$this->eventos}/nueva/media");
        $image = imagecreatetruecolor(30, 20);
        imagepng($image, "{$this->eventos}/nueva/media/horizontal.png");
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,1,foto,horizontal.png');

        $sections = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'));
        $photo = $sections->firstWhere('key', 'galeria')['photos'][0];

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

    public function test_a_gallery_without_photos_has_an_empty_list(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('nueva', 'invitacion.csv', 'galeria,,visible,SI');

        $gallery = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'galeria');

        $this->assertSame([], $gallery['photos']);
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

    public function test_the_image_layer_stacks_its_first_photo_and_the_rest_as_layers(): void
    {
        $this->copyEventFixtures();
        foreach (['capa,,visible,SI', 'capa,,imagen,ciudad.webp', 'capa,,variante,alta', 'capa,1,foto,puente.webp', 'capa,2,foto,', 'capa,3,foto,taxi.webp'] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $layer = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'capa');

        $this->assertSame('layer', $layer['type']);
        $this->assertSame('alta', $layer['variant']);
        $this->assertSame(['ciudad.webp', 'puente.webp', 'taxi.webp'], $layer['layers']);
        $this->assertArrayNotHasKey('background', $layer);
    }

    public function test_an_image_layer_without_photos_has_no_layers(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('nueva', 'invitacion.csv', 'capa,,visible,SI');

        $layer = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'))->firstWhere('key', 'capa');

        $this->assertArrayNotHasKey('layers', $layer);
    }
}
