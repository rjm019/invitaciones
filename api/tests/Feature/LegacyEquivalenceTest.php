<?php

namespace Tests\Feature;

use App\Services\Csv\CsvFile;
use App\Services\Design\LegacyMigrator;
use Illuminate\Support\Facades\File;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/**
 * El formato nuevo arma exactamente la misma invitación que el Excel de antes: es la
 * garantía para migrar NAT y cualquier evento sin que nada cambie para los invitados.
 */
class LegacyEquivalenceTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    private function assertIdentical(string $slug): void
    {
        $check = app(LegacyMigrator::class)->check($slug);

        $this->assertSame([], $check['errors']);
        $this->assertSame([], $check['differences']);
        $this->assertTrue($check['identical']);
    }

    public function test_the_test_event_converts_identically(): void
    {
        $this->assertIdentical('prueba');
    }

    public function test_every_tab_and_option_of_the_old_format_converts_identically(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'spotify,https://open.spotify.com/intl-es/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc');
        $this->appendLine('prueba', 'evento.csv', 'musica_audio,cancion.mp3');
        $this->appendLine('prueba', 'evento.csv', 'musica_fuente,archivo');
        $this->appendLine('prueba', 'evento.csv', 'salon_ciudad,"Pachuca, Hidalgo"');
        $this->appendLine('prueba', 'evento.csv', 'clima_coordenadas,"20.1170, -98.7333"');
        $this->appendLine('prueba', 'evento.csv', 'rsvp_pedir_cancion,NO');
        $this->appendLine('prueba', 'evento.csv', 'publicado,SI');
        $this->appendLine('prueba', 'secciones.csv', '4,hospedaje,Hospedaje,,,,"aparecer cascada",SI,,');
        $this->appendLine('prueba', 'secciones.csv', '5,vestimenta,,,,,"aparecer, cambio-de-color",SI,,');
        $this->appendLine('prueba', 'secciones.csv', '6,sin_niños,,,,,,SI,,');
        $this->appendLine('prueba', 'secciones.csv', '7,playlist,Mi playlist,,,,,SI,mitad,');
        $this->appendLine('prueba', 'secciones.csv', '8,clima,,,,,,SI,,');
        $this->appendLine('prueba', 'secciones.csv', '9,frase,,,,,escribir,SI,,');
        $this->appendLine('prueba', 'secciones.csv', '9.5,frase,,,,,,NO,,');
        $this->appendLine('prueba', 'secciones.csv', '10,cuenta_regresiva,,,,,"destellos, cascada acercamiento",SI,,');
        (new CsvFile)->write("{$this->eventos}/prueba/hoteles.csv", ['nombre', 'nota', 'direccion', 'maps', 'telefono', 'foto'], [
            ['nombre' => 'Hotel Uno', 'nota' => 'Cerca', 'direccion' => 'Av. 1', 'maps' => 'https://maps.app.goo.gl/uno', 'telefono' => '771 123 4567', 'foto' => 'salon.webp'],
            ['nombre' => 'Hotel Dos', 'nota' => '', 'direccion' => '', 'maps' => '', 'telefono' => '', 'foto' => 'no-existe.webp'],
        ]);
        (new CsvFile)->write("{$this->eventos}/prueba/ubicaciones.csv", ['etiqueta', 'lugar', 'hora', 'direccion', 'maps', 'foto'], [
            ['etiqueta' => 'Ceremonia', 'lugar' => 'Parroquia', 'hora' => '4 pm', 'direccion' => 'Centro', 'maps' => 'https://maps.app.goo.gl/misa', 'foto' => ''],
            ['etiqueta' => 'Recepción', 'lugar' => 'Salón Prueba', 'hora' => '', 'direccion' => '', 'maps' => '', 'foto' => 'salon.webp'],
        ]);
        (new CsvFile)->write("{$this->eventos}/prueba/tipografia.csv", ['rol', 'fuente', 'uso'], [
            ['rol' => 'script', 'fuente' => 'Great Vibes', 'uso' => ''],
            ['rol' => 'script_mono', 'fuente' => 'Sacramento', 'uso' => ''],
        ]);

        $this->assertIdentical('prueba');
    }

    public function test_the_owner_deadline_from_the_panel_is_respected(): void
    {
        (new CsvFile)->write("{$this->eventos}/prueba/ajustes.csv", ['clave', 'valor'], [
            ['clave' => 'rsvp_limite', 'valor' => '2026-11-10'],
            ['clave' => 'rsvp_limite_cambios', 'valor' => '1'],
        ]);

        $this->assertIdentical('prueba');
    }

    public function test_the_xlsx_layout_converts_identically(): void
    {
        File::makeDirectory("{$this->eventos}/excel/media", 0775, true);
        File::copy("{$this->eventos}/prueba/media/salon.webp", "{$this->eventos}/excel/media/salon.webp");
        $this->artisan('layout:xlsx', ['slug' => 'excel', '--desde' => '../prueba'])->assertSuccessful();

        $this->assertIdentical('excel');
    }

    public function test_a_difference_is_reported_in_spanish(): void
    {
        // El formato nuevo ya no deja pasar un enlace que no es web: aquí sí cambiaría algo.
        $this->appendLine('prueba', 'evento.csv', 'salon_maps,javascript:alert(1)');

        $check = app(LegacyMigrator::class)->check('prueba');

        $this->assertFalse($check['identical']);
        $this->assertStringContainsString('salon_maps: debe ser un enlace', $check['errors'][0]);
    }
}
