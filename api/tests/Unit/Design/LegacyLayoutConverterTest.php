<?php

namespace Tests\Unit\Design;

use App\Services\Design\Design;
use App\Services\Design\LegacyLayoutConverter;
use Tests\TestCase;

class LegacyLayoutConverterTest extends TestCase
{
    /** @return array{design: Design, settings: array<string, string>, warnings: list<string>} */
    private function convert(array $sheets): array
    {
        return app(LegacyLayoutConverter::class)->convert($sheets);
    }

    public function test_the_event_tab_keeps_its_keys_and_private_settings_go_apart(): void
    {
        $out = $this->convert(['evento' => [
            ['clave' => 'Tema', 'valor' => 'jardin-azul'],
            ['clave' => 'salon_ciudad', 'valor' => 'Pachuca, Hidalgo'],
            ['clave' => 'clave_panel', 'valor' => 'secreta-123'],
            ['clave' => 'publicado', 'valor' => 'x'],
            ['clave' => 'retrato', 'valor' => 'foto.webp'],
            ['clave' => 'vestimenta_colores', 'valor' => '#000'],
            ['clave' => 'vacia', 'valor' => ''],
        ]]);

        $this->assertSame(['tema' => 'jardin-azul', 'salon_ciudad' => 'Pachuca, Hidalgo'], $out['design']->event);
        $this->assertSame(['clave_panel' => 'secreta-123', 'publicado' => 'SI'], $out['settings']);
        // Sin sección "foto" ni "vestimenta", se crean ocultas para guardar sus datos.
        $this->assertSame(['visible' => 'NO', 'imagen' => 'foto.webp'], $out['design']->section('foto')->fields);
        $this->assertSame(['visible' => 'NO', 'colores' => '#000'], $out['design']->section('vestimenta')->fields);
    }

    public function test_sections_follow_their_order_with_decimals_and_repeats_get_a_number(): void
    {
        $out = $this->convert(['secciones' => [
            ['orden' => '9.55', 'seccion' => 'Frase', 'texto' => 'Segunda', 'visible' => 'SI'],
            ['orden' => '9.5', 'seccion' => 'frase', 'texto' => 'Primera', 'visible' => ''],
            ['orden' => '1', 'seccion' => 'sobre', 'boton' => 'Abre', 'visible' => 'no'],
            ['orden' => '2', 'seccion' => 'hero_envelope', 'visible' => 'SI'],
            ['orden' => '3', 'seccion' => 'sin_niños', 'visible' => 'SI'],
        ]]);

        $this->assertSame(['portada', 'portada-2', 'sin_ninos', 'frase', 'frase-2'], array_map(fn ($s) => $s->id, $out['design']->sections));
        $this->assertSame(['visible' => 'NO', 'boton' => 'Abre'], $out['design']->section('portada')->fields);
        $this->assertSame('Primera', $out['design']->section('frase')->field('texto'));
        $this->assertTrue($out['design']->section('frase')->visible());
    }

    public function test_family_is_grouped_by_role_and_lists_go_into_their_section(): void
    {
        $out = $this->convert([
            'secciones' => [['orden' => '1', 'seccion' => 'bendicion', 'visible' => 'SI']],
            'familia' => [
                ['rol' => 'Mis papás', 'nombre' => 'Uno'],
                ['rol' => 'Mis padrinos', 'nombre' => 'Tres'],
                ['rol' => 'Mis papás', 'nombre' => 'Dos'],
                ['rol' => '', 'nombre' => 'Sin rol'],
            ],
            'itinerario' => [['hora' => '5 pm', 'actividad' => 'Recepción', 'icono' => '']],
            'hoteles' => [['nombre' => 'Hotel', 'maps' => 'https://x.test', 'otra' => 'columna']],
        ]);

        $this->assertSame([
            ['rol' => 'Mis papás', 'nombres' => "Uno\nDos"],
            ['rol' => 'Mis padrinos', 'nombres' => 'Tres'],
        ], $out['design']->section('bendicion')->items);
        $this->assertSame([['hora' => '5 pm', 'actividad' => 'Recepción']], $out['design']->section('itinerario')->items);
        $this->assertSame([['nombre' => 'Hotel', 'maps' => 'https://x.test']], $out['design']->section('hospedaje')->items);
        $this->assertFalse($out['design']->section('hospedaje')->visible());
        $this->assertStringContainsString('hoteles: las columnas otra no se usan', $out['warnings'][0]);
    }

    public function test_the_old_families_tab_and_unknown_tabs_are_reported(): void
    {
        $out = $this->convert([
            'familias' => [['id' => '1', 'familia' => 'Pérez', 'pases' => '4']],
            'notas' => [['algo' => 'x']],
        ]);

        $this->assertCount(2, $out['warnings']);
        $this->assertStringContainsString('familias: esta pestaña ya no se usa', $out['warnings'][0]);
        $this->assertStringContainsString('notas: esta pestaña no es parte del layout', $out['warnings'][1]);
    }
}
