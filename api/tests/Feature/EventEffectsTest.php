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

    public function test_the_new_york_effects_have_spanish_names(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('nueva', 'invitacion.csv', 'cierre,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'cierre,,efectos,"horizonte, reflectores, luces, escarcha, reflejo, panorámica"');
        $this->appendLine('nueva', 'invitacion.csv', 'frase,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'frase,,efectos,ciudad brillitos paneo');

        $sections = collect($this->getJson('/api/public/events/nueva')->assertOk()->json('event.sections'));

        $this->assertSame(
            ['skyline', 'searchlights', 'city-lights', 'glitter', 'sheen', 'pan'],
            $sections->firstWhere('type', 'closing')['effects'],
        );
        $this->assertSame(['skyline', 'glitter', 'pan'], $sections->firstWhere('type', 'quote')['effects']);
    }

    public function test_the_page_chooses_edges_buttons_confetti_metal_and_corners(): void
    {
        $this->copyEventFixtures();
        foreach ([
            'pagina,,orilla,Festón',
            'pagina,,botones,boleto',
            'pagina,,confeti,NO',
            'pagina,,metalico,SI',
            'pagina,,esquinas,deco',
            'frase,,visible,SI',
            'frase,,orilla,hoja',
            'cierre,,visible,SI',
            'cierre,,orilla,espiral',
        ] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }

        $event = $this->getJson('/api/public/events/nueva')->assertOk()->json('event');

        $chosen = ['edge' => 'scallop', 'buttons' => 'ticket', 'confetti' => false, 'metal' => true, 'corners' => 'deco'];
        $page = array_intersect_key($event['page'], $chosen);
        ksort($chosen);
        ksort($page);
        $this->assertSame($chosen, $page);
        $sections = collect($event['sections']);
        $this->assertSame('torn', $sections->firstWhere('type', 'quote')['edge']);
        // Una que no existe se ignora (con aviso): la sección toma la de la página.
        $this->assertArrayNotHasKey('edge', $sections->firstWhere('type', 'closing'));
    }

    public function test_blend_and_disco_effects_and_a_blended_page(): void
    {
        $this->copyEventFixtures();
        $this->appendLine('nueva', 'invitacion.csv', 'cierre,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'cierre,,efectos,"difuminar, bola_disco, luces_disco"');
        $this->appendLine('nueva', 'invitacion.csv', 'frase,,visible,SI');
        $this->appendLine('nueva', 'invitacion.csv', 'frase,,efectos,sin_cortes disco reflejos_disco');

        $event = $this->getJson('/api/public/events/nueva')->assertOk()->json('event');
        $sections = collect($event['sections']);
        $this->assertSame(['blend', 'disco-ball', 'disco-lights'], $sections->firstWhere('type', 'closing')['effects']);
        $this->assertSame(['blend', 'disco-ball', 'disco-lights'], $sections->firstWhere('type', 'quote')['effects']);
        $this->assertArrayNotHasKey('blend', $event['page'] ?? []);

        // "Secciones difuminadas" en la página: todas se funden (la web les pone el efecto).
        $this->appendLine('nueva', 'invitacion.csv', 'pagina,,difuminar,SI');
        $this->assertTrue($this->getJson('/api/public/events/nueva')->assertOk()->json('event.page.blend'));
    }
}
