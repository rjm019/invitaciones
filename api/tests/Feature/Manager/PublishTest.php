<?php

namespace Tests\Feature\Manager;

use App\Services\Csv\CsvFile;
use App\Services\Panel\PanelService;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class PublishTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    /** Guarda un cambio en el borrador y devuelve su versión. */
    private function draft(string $slug, callable $change): string
    {
        $editor = $this->asManager()->getJson("/api/manager/events/{$slug}/design")->assertOk()->json();
        $design = $change($editor['design']);

        return $this->putJson("/api/manager/events/{$slug}/draft", ['design' => $design, 'version' => $editor['version']])->assertOk()->json('version');
    }

    public function test_publishing_replaces_the_invitation_and_keeps_the_previous_one(): void
    {
        $panelVersion = app(PanelService::class)->version('nueva');
        $version = $this->draft('nueva', function ($design) {
            $design['sections'][3]['fields']['titulo'] = 'Programa';

            return $design;
        });

        $published = $this->postJson('/api/manager/events/nueva/publish', ['version' => $version])->assertOk()->json();

        $this->assertFalse($published['migrated']);
        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.sections.3.title', 'Programa');
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/borrador/invitacion.csv");
        $this->assertCount(1, glob("{$this->eventos}/nueva/respaldos/invitacion-*.csv"));
        $this->assertSame('borrador', $this->readCsv('nueva', 'respaldos/publicaciones.csv')[0]['origen']);
        // El panel del dueño sí se entera de lo publicado.
        $this->assertNotSame($panelVersion, app(PanelService::class)->version('nueva'));

        $history = $this->getJson('/api/manager/events/nueva/history')->assertOk()->json('versions');
        $this->assertCount(1, $history);
        $this->postJson("/api/manager/events/nueva/history/{$history[0]['id']}/restore")
            ->assertOk()
            ->assertJsonPath('source', 'draft')
            ->assertJsonPath('design.sections.3.fields.titulo', 'Itinerario');
    }

    public function test_nothing_to_publish_and_mistakes_block_publishing(): void
    {
        $editor = $this->asManager()->getJson('/api/manager/events/nueva/design')->json();
        $this->postJson('/api/manager/events/nueva/publish', ['version' => $editor['version']])
            ->assertStatus(422)
            ->assertJsonPath('message', 'No hay cambios por publicar.');

        $version = $this->draft('nueva', function ($design) {
            $design['sections'][3]['items'][0]['hora'] = 'temprano';

            return $design;
        });
        $blocked = $this->postJson('/api/manager/events/nueva/publish', ['version' => $version])->assertStatus(422)->json();

        $this->assertSame('hora', $blocked['issues'][0]['field']);
        $this->assertSame(1, $blocked['issues'][0]['item']);
        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.itinerary.0.time', '17:00');
    }

    public function test_publishing_with_an_old_version_is_a_conflict(): void
    {
        $this->draft('nueva', fn ($design) => [...$design, 'event' => [...$design['event'], 'festejada' => 'Una']]);

        $this->postJson('/api/manager/events/nueva/publish', ['version' => 'b-vieja'])->assertStatus(409);
    }

    public function test_publishing_an_event_in_the_old_format_migrates_it(): void
    {
        $before = $this->getJson('/api/public/events/prueba')->json('event');
        $editor = $this->asManager()->getJson('/api/manager/events/prueba/design')->json();

        $this->postJson('/api/manager/events/prueba/publish', ['version' => $editor['version']])
            ->assertOk()
            ->assertJsonPath('migrated', true);

        $this->assertFileExists("{$this->eventos}/prueba/invitacion.csv");
        $after = $this->getJson('/api/public/events/prueba')->json('event');
        $this->assertSame($before['itinerary'], $after['itinerary']);
        $this->assertSame($before['palette'], $after['palette']);
        $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])->assertOk();
        $this->assertSame('formato anterior', $this->readCsv('prueba', 'respaldos/publicaciones.csv')[0]['origen']);
    }

    public function test_the_owner_deadline_wins_unless_the_manager_replaces_it(): void
    {
        (new CsvFile)->write("{$this->eventos}/nueva/ajustes.csv", ['clave', 'valor'], [
            ['clave' => 'clave_panel', 'valor' => 'clave-de-prueba-nueva'],
            ['clave' => 'rsvp_limite', 'valor' => '2026-11-10'],
            ['clave' => 'rsvp_limite_cambios', 'valor' => '1'],
        ]);
        $change = fn ($design) => [...$design, 'event' => [...$design['event'], 'rsvp_limite' => '2026-11-15']];

        $this->postJson('/api/manager/events/nueva/publish', ['version' => $this->draft('nueva', $change)])->assertOk();
        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.rsvp.deadline', '2026-11-10');

        $version = $this->draft('nueva', fn ($design) => [...$design, 'event' => [...$design['event'], 'rsvp_limite' => '2026-11-16']]);
        $this->postJson('/api/manager/events/nueva/publish', ['version' => $version, 'replace_owner_deadline' => true])->assertOk();

        $this->getJson('/api/public/events/nueva')->assertJsonPath('event.rsvp.deadline', '2026-11-16');
        $settings = array_column($this->readCsv('nueva', 'ajustes.csv'), 'valor', 'clave');
        $this->assertArrayNotHasKey('rsvp_limite', $settings);
        $this->assertSame('1', $settings['rsvp_limite_cambios']);
    }
}
