<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class PublicEventTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['invitaciones.eventos_path' => base_path('tests/Fixtures/eventos')]);
    }

    public function test_builds_the_event_config_from_the_csv_layout(): void
    {
        $response = $this->getJson('/api/public/events/prueba')->assertOk();
        $event = $response->json('event');

        $this->assertSame('jardin-azul', $event['theme']);
        $this->assertSame('2026-11-28T17:00:00-06:00', $event['starts_at']);
        $this->assertSame(['#000000', '#FFFFFF'], $event['dress_code']['colors']);

        // Paleta: los nombres en español van al token del contrato; los propios pasan tal cual.
        $this->assertSame(['primary' => '#96792C', 'lino' => '#F0EDE8'], $event['palette']);

        // Secciones ordenadas por "orden", con alias de efectos y fondo resuelto.
        $this->assertSame(['hero-envelope', 'itinerary', 'rsvp'], array_column($event['sections'], 'type'));
        $this->assertSame(['float'], $event['sections'][0]['effects']);
        $this->assertSame(['reveal', 'timeline-fill'], $event['sections'][1]['effects']);
        $this->assertSame(['image' => 'papel.webp', 'fit' => 'tile', 'overlay' => 0.2, 'attachment' => 'sticky'], $event['sections'][0]['background']);
        $this->assertFalse($event['sections'][2]['visible']);
        $this->assertSame('half', $event['sections'][1]['desktop']);
        $this->assertArrayNotHasKey('desktop', $event['sections'][0]);

        // Horas a 24 h; familia agrupada por rol.
        $this->assertSame(['17:00', '17:50'], array_column($event['itinerary'], 'time'));
        $this->assertSame([
            ['role' => 'Mis papás', 'names' => ['Persona Uno', 'Persona Dos']],
            ['role' => 'Mis padrinos', 'names' => ['Persona Tres']],
        ], $event['family']);

        // Un archivo de media/ se vuelve URL; una URL externa pasa tal cual.
        $this->assertSame(url('/media/prueba/salon.webp'), $event['venue']['photo']);
        $this->assertSame('https://ejemplo.test/retrato.webp', $event['media']['portrait']);
        $this->assertSame(['salon.webp' => url('/media/prueba/salon.webp')], $event['assets']);
    }

    public function test_never_reads_system_csv_files_as_layout_tabs(): void
    {
        $this->getJson('/api/public/events/prueba')
            ->assertOk()
            ->assertJsonMissingPath('event.respuestas');
    }

    public function test_unknown_or_unpublished_event_is_not_found(): void
    {
        $this->getJson('/api/public/events/no-existe')->assertNotFound();
        $this->getJson('/api/public/events/borrador')->assertNotFound();
        $this->getJson('/api/public/events/..%2Fprueba')->assertNotFound();
    }

    public function test_layout_errors_are_reported_in_spanish_without_breaking_the_page(): void
    {
        config(['app.debug' => true]);

        $errors = $this->getJson('/api/public/events/roto')
            ->assertStatus(503)
            ->json('errors');

        $this->assertCount(3, $errors);
        $this->assertStringContainsString('evento → inicia', $errors[0]);
        $this->assertStringContainsString('rsvp_modo', $errors[1]);
        $this->assertStringContainsString('paleta, fila 2', $errors[2]);
    }

    public function test_serves_event_media_and_blocks_anything_else(): void
    {
        $this->get('/media/prueba/salon.webp')->assertOk();
        $this->get('/media/prueba/evento.csv')->assertNotFound();
        $this->get('/media/prueba/..%2Fevento.csv')->assertNotFound();
        $this->get('/media/no-existe/salon.webp')->assertNotFound();
    }

    public function test_the_xlsx_layout_reads_the_same_as_its_csv_tabs(): void
    {
        $tmp = storage_path('framework/testing/eventos');
        File::deleteDirectory($tmp);
        File::copyDirectory(base_path('tests/Fixtures/eventos/prueba'), $tmp.'/prueba-csv');
        File::makeDirectory($tmp.'/prueba-xlsx/media', 0775, true);
        File::copy($tmp.'/prueba-csv/media/salon.webp', $tmp.'/prueba-xlsx/media/salon.webp');
        config(['invitaciones.eventos_path' => $tmp]);

        $this->artisan('layout:xlsx', ['slug' => 'prueba-xlsx', '--desde' => '../prueba-csv'])->assertSuccessful();
        $this->assertFileExists($tmp.'/prueba-xlsx/layout.xlsx');

        $fromCsv = $this->getJson('/api/public/events/prueba-csv')->json('event');
        $fromXlsx = $this->getJson('/api/public/events/prueba-xlsx')->json('event');
        unset($fromCsv['slug'], $fromXlsx['slug'], $fromCsv['assets'], $fromXlsx['assets'],
            $fromCsv['venue']['photo'], $fromXlsx['venue']['photo']);

        $this->assertSame($fromCsv, $fromXlsx);

        // Sin --forzar no se pisa el Excel que ya existe.
        $this->artisan('layout:xlsx', ['slug' => 'prueba-xlsx', '--desde' => '../prueba-csv'])->assertFailed();

        File::deleteDirectory($tmp);
    }
}
