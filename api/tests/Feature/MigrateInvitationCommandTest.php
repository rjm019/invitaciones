<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class MigrateInvitationCommandTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    /** @return array<string, string> archivo → hash, de toda la carpeta del evento */
    private function snapshot(string $slug): array
    {
        $out = [];
        $dir = "{$this->eventos}/{$slug}";
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            $out[substr($file->getPathname(), strlen($dir) + 1)] = hash_file('xxh128', $file->getPathname());
        }
        ksort($out);

        return $out;
    }

    private function event(string $slug): array
    {
        $event = $this->getJson("/api/public/events/{$slug}")->assertOk()->json('event');
        // Lo que el formato nuevo agrega o ya no manda (secciones ocultas) no cuenta.
        $event['sections'] = array_values(array_map(
            fn ($s) => array_diff_key($s, array_flip(['key', 'colors', 'decor', 'text_styles', 'image'])),
            array_filter($event['sections'], fn ($s) => $s['visible']),
        ));

        return $event;
    }

    public function test_trying_writes_nothing(): void
    {
        $before = $this->snapshot('prueba');

        $this->artisan('invitacion:migrar', ['slug' => 'prueba', '--probar' => true])
            ->expectsOutputToContain('prueba: idéntica.')
            ->assertSuccessful();

        $this->assertSame($before, $this->snapshot('prueba'));
    }

    public function test_migrating_keeps_the_invitation_identical_and_never_touches_guest_data(): void
    {
        $before = $this->event('prueba');
        $system = array_intersect_key($this->snapshot('prueba'), array_flip(['invitaciones.csv', 'respuestas.csv']));

        $this->artisan('invitacion:migrar', ['slug' => 'prueba'])->assertSuccessful();

        $this->assertFileExists("{$this->eventos}/prueba/invitacion.csv");
        $this->assertSame($before, $this->event('prueba'));
        // Los datos de los invitados quedan igual.
        $this->assertSame($system, array_intersect_key($this->snapshot('prueba'), $system));
        // La clave pasó a ajustes.csv (el panel sigue abriendo) y el Excel quedó respaldado.
        $settings = array_column($this->readCsv('prueba', 'ajustes.csv'), 'valor', 'clave');
        $this->assertSame('clave-de-prueba', $settings['clave_panel']);
        $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])->assertOk();
        $this->assertNotEmpty(glob("{$this->eventos}/prueba/respaldos/formato-anterior-*/evento.csv"));
        // El layout viejo se queda donde estaba (el código anterior lo sigue leyendo).
        $this->assertFileExists("{$this->eventos}/prueba/evento.csv");
        // El historial de ajustes nunca guarda la clave.
        $this->assertStringNotContainsString('clave-de-prueba', (string) file_get_contents("{$this->eventos}/prueba/ajustes-historial.csv"));

        // Correrlo otra vez no hace nada.
        $this->artisan('invitacion:migrar', ['slug' => 'prueba'])->expectsOutputToContain('ya está en el formato nuevo')->assertSuccessful();
    }

    public function test_with_differences_it_stops_unless_forced(): void
    {
        $this->appendLine('prueba', 'secciones.csv', '4,ubicacion,,,,,,SI,,');
        $this->appendLine('prueba', 'evento.csv', 'salon_maps,maps.google.com/sin-https');

        $this->artisan('invitacion:migrar', ['slug' => 'prueba'])
            ->expectsOutputToContain('tiene errores')
            ->assertFailed();
        $this->assertFileDoesNotExist("{$this->eventos}/prueba/invitacion.csv");
    }

    public function test_all_events_and_cleanup(): void
    {
        $this->artisan('invitacion:migrar', ['--todos' => true, '--probar' => true])
            ->expectsOutputToContain('nueva: ya está en el formato nuevo')
            ->expectsOutputToContain('prueba: idéntica.');

        $this->artisan('invitacion:migrar', ['slug' => 'prueba'])->assertSuccessful();
        $this->artisan('invitacion:migrar', ['slug' => 'prueba', '--limpiar' => true])->assertSuccessful();

        $this->assertFileDoesNotExist("{$this->eventos}/prueba/evento.csv");
        $this->assertFileExists("{$this->eventos}/prueba/invitaciones.csv");
        $this->getJson('/api/public/events/prueba')->assertOk();
    }
}
