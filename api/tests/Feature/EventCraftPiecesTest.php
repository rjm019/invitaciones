<?php

namespace Tests\Feature;

use App\Services\Csv\CsvFile;
use App\Services\Design\Catalog;
use App\Services\Invitations\DedicationStore;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/** Piezas reutilizables de papelería: monograma, silueta, relieve, hospedaje, vestimenta, historia, información y muro. */
class EventCraftPiecesTest extends TestCase
{
    use CopiesEventFixtures;

    /** @param  list<string>  $lines */
    private function addLines(array $lines): void
    {
        foreach ($lines as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }
    }

    /** @return array<string, mixed> */
    private function event(): array
    {
        return $this->getJson('/api/public/events/nueva')->assertOk()->json('event');
    }

    public function test_without_the_new_fields_the_config_has_none_of_the_new_keys(): void
    {
        $this->copyEventFixtures();
        $event = $this->event();

        $this->assertArrayNotHasKey('monogram', $event['celebrant']);
        $this->assertSame(['decor' => false], $event['page']);
        foreach ($event['sections'] as $section) {
            foreach (['silhouette', 'fillet', 'wall', 'restrictions', 'references', 'moments', 'items'] as $key) {
                $this->assertArrayNotHasKey($key, $section);
            }
        }
    }

    public function test_the_monogram_and_the_page_options_reach_the_config(): void
    {
        $this->copyEventFixtures();
        $this->addLines([
            'evento,,monograma,I M',
            'pagina,,silueta,muesca',
            'pagina,,filete,borgoña',
            'pagina,,relieve,SI',
            'pagina,,textura,piedra',
            'bendicion,,silueta,ninguna',
            'bendicion,,filete,oro',
        ]);
        $event = $this->event();

        $this->assertSame('I M', $event['celebrant']['monogram']);
        $this->assertSame('notch', $event['page']['silhouette']);
        $this->assertSame('burgundy', $event['page']['fillet']);
        $this->assertTrue($event['page']['relief']);
        $this->assertSame('stone', $event['page']['texture']);
        $blessing = collect($event['sections'])->firstWhere('key', 'bendicion');
        $this->assertSame('none', $blessing['silhouette']);
        $this->assertSame('gold', $blessing['fillet']);

        $this->addLines(['pagina,,textura,algodon']);
        $this->assertSame('cotton', $this->event()['page']['texture']);
    }

    public function test_a_hotel_gets_distance_price_and_booking_only_when_filled(): void
    {
        $this->copyEventFixtures();
        $this->addLines([
            'hospedaje,,visible,SI',
            'hospedaje,1,nombre,Hotel Uno',
            'hospedaje,1,distancia,A 10 min del salón',
            'hospedaje,1,precio,Desde $1800',
            'hospedaje,1,reserva,https://hotel.test/reservar',
            'hospedaje,2,nombre,Hotel Dos',
        ]);
        $hotels = $this->event()['hotels'];

        $this->assertSame('A 10 min del salón', $hotels[0]['distance']);
        $this->assertSame('Desde $1800', $hotels[0]['price']);
        $this->assertSame('https://hotel.test/reservar', $hotels[0]['booking_url']);
        $this->assertSame(['name', 'note', 'address', 'maps_url', 'phone', 'photo'], array_keys($hotels[1]));
    }

    public function test_a_booking_link_that_is_not_https_is_reported(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['hospedaje,,visible,SI', 'hospedaje,1,nombre,Hotel Uno', 'hospedaje,1,reserva,javascript:alert(1)']);

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');

        $this->assertCount(1, $errors);
        $this->assertStringContainsString('reserva: debe ser un enlace', $errors[0]);
    }

    public function test_the_dress_code_takes_restrictions_and_up_to_four_references(): void
    {
        $this->copyEventFixtures();
        $this->addLines([
            "vestimenta,,restricciones,\"Blanco o marfil\nTacones de aguja\"",
            'vestimenta,1,foto,https://ejemplo.test/a.webp',
            'vestimenta,1,pie,Vestido largo',
            'vestimenta,2,foto,https://ejemplo.test/b.webp',
        ]);
        $dress = collect($this->event()['sections'])->firstWhere('key', 'vestimenta');

        $this->assertSame(['Blanco o marfil', 'Tacones de aguja'], $dress['restrictions']);
        $this->assertSame([
            ['photo' => 'https://ejemplo.test/a.webp', 'caption' => 'Vestido largo'],
            ['photo' => 'https://ejemplo.test/b.webp', 'caption' => ''],
        ], $dress['references']);
    }

    public function test_more_than_six_restrictions_or_four_references_are_reported(): void
    {
        $this->copyEventFixtures();
        $this->addLines(["vestimenta,,restricciones,\"1\n2\n3\n4\n5\n6\n7\""]);
        foreach (range(1, 5) as $n) {
            $this->addLines(["vestimenta,{$n},foto,https://ejemplo.test/{$n}.webp"]);
        }

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');

        $this->assertCount(2, $errors);
    }

    public function test_the_story_and_the_faq_sections_build_their_lists(): void
    {
        $this->copyEventFixtures();
        $this->addLines([
            'historia,,visible,SI',
            'historia,,texto,Bienvenidos',
            'historia,1,anio,2019',
            'historia,1,titulo,Nos conocimos',
            'historia,1,texto,En una boda',
            'historia,1,foto,https://ejemplo.test/n.webp',
            'informacion,,visible,SI',
            'informacion,1,pregunta,¿Hay estacionamiento?',
            'informacion,1,respuesta,"Sí, gratuito."',
        ]);
        $sections = collect($this->event()['sections']);

        $story = $sections->firstWhere('type', 'story');
        $this->assertSame('historia', $story['key']);
        $this->assertSame([['year' => '2019', 'title' => 'Nos conocimos', 'text' => 'En una boda', 'photo' => 'https://ejemplo.test/n.webp']], $story['moments']);
        $this->assertSame([['question' => '¿Hay estacionamiento?', 'answer' => 'Sí, gratuito.']], $sections->firstWhere('type', 'faq')['items']);
    }

    public function test_a_faq_row_without_answer_is_reported(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['informacion,,visible,SI', 'informacion,1,pregunta,¿Hay estacionamiento?']);

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');

        $this->assertStringContainsString('respuesta', $errors[0]);
    }

    public function test_the_catalog_lists_the_new_pieces(): void
    {
        $this->assertSame('story', Catalog::type('historia'));
        $this->assertSame('faq', Catalog::type('informacion'));
        $this->assertTrue(Catalog::repeatable('historia'));
        $this->assertContains('monograma', Catalog::eventOrder());
        $this->assertContains('silueta', Catalog::pageOrder());
        $this->assertContains('filete', Catalog::pageOrder());
        $this->assertContains('relieve', Catalog::pageOrder());
        $this->assertContains('silueta', Catalog::fieldOrder('portada'));
        $this->assertContains('muro', Catalog::fieldOrder('dedicatoria'));
        $this->assertContains('reserva', Catalog::itemFieldOrder('hospedaje'));
        $this->assertContains('referencias', [Catalog::section('vestimenta')['list']['key']]);
        $this->assertArrayHasKey('piedra', Catalog::TEXTURES);
        $this->assertArrayHasKey('algodon', Catalog::TEXTURES);
    }

    private function writeDedications(): void
    {
        (new CsvFile)->write("{$this->eventos}/nueva/".DedicationStore::FILE, DedicationStore::HEADERS, [
            ['invitacion' => '1', 'para' => 'Familia Nueva', 'nombre' => 'Ana', 'dedicatoria' => 'Primera', 'fecha' => '2026-10-13 10:00:00'],
            ['invitacion' => '2', 'para' => 'Otra familia', 'nombre' => 'Luis', 'dedicatoria' => 'Segunda', 'fecha' => '2026-10-14 10:00:00'],
        ]);
    }

    public function test_the_wall_is_off_by_default(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['dedicatoria,,visible,SI']);
        $this->writeDedications();

        $this->assertArrayNotHasKey('wall', collect($this->event()['sections'])->firstWhere('type', 'dedications'));
        $this->getJson('/api/public/events/nueva/dedications')->assertNotFound();
        $this->getJson('/api/public/invitations/NuevaToken01/dedications')->assertNotFound();
    }

    public function test_the_wall_lists_newest_first_without_private_data(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['dedicatoria,,visible,SI', 'dedicatoria,,muro,SI']);
        $this->writeDedications();

        $this->assertTrue(collect($this->event()['sections'])->firstWhere('type', 'dedications')['wall']);
        $response = $this->getJson('/api/public/events/nueva/dedications')->assertOk();
        $this->assertSame([
            ['name' => 'Luis', 'message' => 'Segunda'],
            ['name' => 'Ana', 'message' => 'Primera'],
        ], $response->json('dedications'));
        $this->assertSame(['dedications'], array_keys($response->json()));
        $this->assertStringNotContainsString('NuevaToken01', $response->getContent());
        $this->assertStringNotContainsString('Familia Nueva', $response->getContent());
        $this->assertStringNotContainsString('2026-10', $response->getContent());

        $this->getJson('/api/public/invitations/NuevaToken01/dedications')->assertOk()->assertJsonCount(2, 'dedications');
        $this->getJson('/api/public/invitations/TokenQueNoExiste/dedications')->assertNotFound();
    }

    public function test_the_wall_skips_removed_dedications_and_shows_a_new_one(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['dedicatoria,,visible,SI', 'dedicatoria,,muro,SI']);
        $this->writeDedications();
        app(DedicationStore::class)->removeInvitation('nueva', '2', now()->toImmutable());

        $this->getJson('/api/public/events/nueva/dedications')->assertOk()->assertJsonCount(1, 'dedications')
            ->assertJsonPath('dedications.0.name', 'Ana');

        $this->postJson('/api/public/invitations/NuevaToken01/dedication', ['name' => 'Nueva', 'message' => 'Hola'])->assertStatus(409);
    }

    public function test_the_wall_is_empty_in_a_demo(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['dedicatoria,,visible,SI', 'dedicatoria,,muro,SI']);
        $this->appendLine('nueva', 'ajustes.csv', 'demo,SI');
        $this->writeDedications();

        $this->getJson('/api/public/events/nueva/dedications')->assertOk()->assertExactJson(['dedications' => []]);
    }

    public function test_the_wall_is_throttled(): void
    {
        $this->copyEventFixtures();
        $this->addLines(['dedicatoria,,visible,SI', 'dedicatoria,,muro,SI']);
        RateLimiter::clear('wall');

        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/public/events/nueva/dedications')->assertOk();
        }
        $this->getJson('/api/public/events/nueva/dedications')->assertStatus(429);
    }
}
