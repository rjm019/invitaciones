<?php

namespace Tests\Feature\Manager;

use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class DraftTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    /** @return array<string, mixed> */
    private function editor(string $slug = 'nueva'): array
    {
        return $this->asManager()->getJson("/api/manager/events/{$slug}/design")->assertOk()->json();
    }

    public function test_the_editor_gets_the_invitation_its_preview_and_its_settings(): void
    {
        $editor = $this->editor();

        $this->assertSame('live', $editor['source']);
        $this->assertFalse($editor['has_draft']);
        $this->assertFalse($editor['pending']);
        $this->assertSame('Festejada Nueva', $editor['design']['event']['festejada']);
        $this->assertSame('itinerario', $editor['design']['sections'][3]['id']);
        $this->assertSame(['portada', 'bendicion', 'foto', 'itinerario', 'vestimenta'], array_column($editor['config']['sections'], 'key'));
        $this->assertSame('XV de Nue', $editor['brand']['title']);
        $this->assertSame(['published' => true, 'template' => false, 'panel_password' => 'clave-de-prueba-nueva', 'owner_deadline' => null, 'deadline_changes' => 0], $editor['settings']);
        $this->assertNull($editor['conversion']);
        $this->assertStringStartsWith('p-', $editor['version']);
    }

    public function test_saving_writes_the_draft_and_answers_the_preview(): void
    {
        $editor = $this->editor();
        $design = $editor['design'];
        $design['event']['festejada'] = 'Otra Festejada';
        $design['sections'][3]['fields']['titulo'] = 'Programa';
        $design['sections'][3]['fields']['titulo_color'] = '#C2185B';

        $saved = $this->putJson('/api/manager/events/nueva/draft', ['design' => $design, 'version' => $editor['version']])->assertOk()->json();

        $this->assertTrue($saved['has_draft']);
        $this->assertTrue($saved['pending']);
        $this->assertSame([
            ['type' => 'block', 'key' => 'evento', 'change' => 'changed'],
            ['type' => 'section', 'key' => 'itinerario', 'change' => 'changed'],
        ], $saved['changes']);
        $this->assertStringStartsWith('b-', $saved['version']);
        $this->assertSame('Programa', $saved['config']['sections'][3]['title']);
        $this->assertSame(['color' => '#C2185B'], array_intersect_key($saved['config']['sections'][3]['text_styles']['title'], ['color' => 1]));
        $this->assertFileExists("{$this->eventos}/nueva/borrador/invitacion.csv");
        // Los invitados siguen viendo lo publicado.
        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.sections.3.title', 'Itinerario');
    }

    public function test_the_draft_can_have_mistakes_but_they_are_listed(): void
    {
        $editor = $this->editor();
        $design = $editor['design'];
        unset($design['event']['inicia']);
        $design['sections'][3]['items'][0]['hora'] = 'a las cinco';

        $saved = $this->putJson('/api/manager/events/nueva/draft', ['design' => $design, 'version' => $editor['version']])->assertOk()->json();

        $fields = array_column($saved['issues'], 'field');
        $this->assertContains('inicia', $fields);
        $this->assertContains('hora', $fields);
        $this->assertNull($saved['config']['starts_at']);
    }

    public function test_two_windows_do_not_overwrite_each_other(): void
    {
        $editor = $this->editor();
        $first = $editor['design'];
        $first['event']['festejada'] = 'Primera ventana';
        $this->putJson('/api/manager/events/nueva/draft', ['design' => $first, 'version' => $editor['version']])->assertOk();

        $second = $editor['design'];
        $second['event']['festejada'] = 'Segunda ventana';
        $this->putJson('/api/manager/events/nueva/draft', ['design' => $second, 'version' => $editor['version']])
            ->assertStatus(409)
            ->assertJsonPath('design.event.festejada', 'Primera ventana');
    }

    public function test_discarding_goes_back_to_what_is_published(): void
    {
        $editor = $this->editor();
        $design = $editor['design'];
        $design['event']['festejada'] = 'Cambio';
        $this->putJson('/api/manager/events/nueva/draft', ['design' => $design, 'version' => $editor['version']])->assertOk();

        $this->deleteJson('/api/manager/events/nueva/draft')
            ->assertOk()
            ->assertJsonPath('source', 'live')
            ->assertJsonPath('design.event.festejada', 'Festejada Nueva');
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/borrador/invitacion.csv");
    }

    public function test_a_badly_shaped_design_is_rejected(): void
    {
        $editor = $this->editor();
        $bad = fn (array $design) => $this->putJson('/api/manager/events/nueva/draft', ['design' => $design, 'version' => $editor['version']]);

        $bad([...$editor['design'], 'sections' => [['id' => 'evento']]])->assertStatus(422);
        $bad([...$editor['design'], 'sections' => [['id' => 'frase'], ['id' => 'frase']]])->assertStatus(422);
        $bad([...$editor['design'], 'event' => ['mal campo' => 'x']])->assertStatus(422);
        $bad([...$editor['design'], 'event' => ['tema' => ['no', 'texto']]])->assertStatus(422);
        $bad([...$editor['design'], 'event' => ['tema' => str_repeat('x', 5000)]])->assertStatus(422);
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/borrador/invitacion.csv");
    }

    public function test_an_event_in_the_old_format_opens_converted_and_says_if_it_is_identical(): void
    {
        $editor = $this->editor('prueba');

        $this->assertSame('legacy', $editor['source']);
        $this->assertTrue($editor['pending']);
        $this->assertSame(['identical' => true, 'differences' => [], 'errors' => []], $editor['conversion']);
        $this->assertSame('clave-de-prueba', $editor['settings']['panel_password']);
        $this->assertStringStartsWith('a-', $editor['version']);
        // Abrirlo no cambia nada en su carpeta.
        $this->assertFileDoesNotExist("{$this->eventos}/prueba/invitacion.csv");
    }

    public function test_unknown_events_are_not_found(): void
    {
        $this->asManager()->getJson('/api/manager/events/no-existe/design')->assertNotFound();
        $this->putJson('/api/manager/events/no-existe/draft', ['design' => [], 'version' => 'x'])->assertNotFound();
    }

    public function test_added_removed_and_moved_sections_are_listed_as_changes(): void
    {
        $editor = $this->editor();
        $design = $editor['design'];
        $sections = $design['sections'];
        // Quita la foto, agrega un cierre y sube el itinerario.
        $design['sections'] = [$sections[3], $sections[0], $sections[1], $sections[4], $sections[5], ['id' => 'cierre', 'fields' => [], 'items' => []]];

        $changes = $this->putJson('/api/manager/events/nueva/draft', ['design' => $design, 'version' => $editor['version']])->assertOk()->json('changes');

        $this->assertContains(['type' => 'section', 'key' => 'cierre', 'change' => 'added'], $changes);
        $this->assertContains(['type' => 'section', 'key' => 'foto', 'change' => 'removed'], $changes);
        $this->assertContains(['type' => 'order', 'key' => null, 'change' => 'changed'], $changes);
    }
}
