<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventEffectsTest extends TestCase
{
    use CopiesEventFixtures;

    public function test_the_new_effects_have_spanish_names_in_the_layout(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('prueba', 'secciones.csv', '4,cuenta_regresiva,,,,,"destellos, cascada acercamiento",SI,,');

        $this->getJson('/api/public/events/prueba')
            ->assertOk()
            ->assertJsonPath('event.sections.3.effects', ['sparkle', 'cascade', 'ken-burns']);
    }

    public function test_new_sections_and_the_color_change_have_spanish_names(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('prueba', 'secciones.csv', '4,vestimenta,,,,,"aparecer, cambio-de-color",SI,,');
        $this->appendLine('prueba', 'secciones.csv', '5,sin_niños,,,,,,SI,,');
        $this->appendLine('prueba', 'secciones.csv', '6,dedicatoria,,,,,colores,SI,,');

        $this->getJson('/api/public/events/prueba')
            ->assertOk()
            ->assertJsonPath('event.sections.3.type', 'dress-code')
            ->assertJsonPath('event.sections.3.effects', ['reveal', 'color-shift'])
            ->assertJsonPath('event.sections.4.type', 'no-kids')
            ->assertJsonPath('event.sections.5.type', 'dedications')
            ->assertJsonPath('event.sections.5.effects', ['color-shift']);
    }
}
