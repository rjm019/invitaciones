<?php

namespace Tests\Feature;

use App\Services\Csv\CsvFile;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventHotelsTest extends TestCase
{
    use CopiesEventFixtures;

    private const HEADERS = ['nombre', 'nota', 'direccion', 'maps', 'telefono', 'foto'];

    public function test_the_hotels_sheet_becomes_the_lodging_list(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('prueba', 'secciones.csv', '4,hospedaje,Hospedaje,,,,"aparecer cascada",SI,,');
        (new CsvFile)->write("{$this->eventos}/prueba/hoteles.csv", self::HEADERS, [
            ['nombre' => 'Hotel Uno', 'nota' => 'A 10 min del salón', 'direccion' => 'Av. Uno 1', 'maps' => 'https://maps.app.goo.gl/uno', 'telefono' => '771 123 4567', 'foto' => ''],
            ['nombre' => '', 'nota' => 'renglón vacío', 'direccion' => '', 'maps' => '', 'telefono' => '', 'foto' => ''],
            ['nombre' => 'Hotel Dos', 'nota' => '', 'direccion' => '', 'maps' => '', 'telefono' => '', 'foto' => 'no-existe.webp'],
        ]);

        $this->getJson('/api/public/events/prueba')
            ->assertOk()
            ->assertJsonPath('event.sections.3.type', 'hotels')
            ->assertJsonPath('event.sections.3.effects', ['reveal', 'cascade'])
            ->assertJsonPath('event.hotels', [
                ['name' => 'Hotel Uno', 'note' => 'A 10 min del salón', 'address' => 'Av. Uno 1', 'maps_url' => 'https://maps.app.goo.gl/uno', 'phone' => '771 123 4567', 'photo' => null],
                ['name' => 'Hotel Dos', 'note' => '', 'address' => '', 'maps_url' => '', 'phone' => '', 'photo' => 'no-existe.webp'],
            ]);
    }

    public function test_without_the_sheet_the_list_is_empty(): void
    {
        $this->copyEventFixtures();

        $this->getJson('/api/public/events/prueba')->assertOk()->assertJsonPath('event.hotels', []);
    }

    public function test_a_maps_link_that_is_not_a_web_address_is_reported(): void
    {
        $this->copyEventFixtures();
        (new CsvFile)->write("{$this->eventos}/prueba/hoteles.csv", self::HEADERS, [
            ['nombre' => 'Hotel Uno', 'nota' => '', 'direccion' => '', 'maps' => 'javascript:alert(1)', 'telefono' => '', 'foto' => ''],
        ]);

        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');

        $this->assertCount(1, $errors);
        $this->assertStringContainsString('hoteles, fila 2: maps debe ser un enlace', $errors[0]);
    }
}
