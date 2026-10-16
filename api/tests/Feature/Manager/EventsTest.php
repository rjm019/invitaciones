<?php

namespace Tests\Feature\Manager;

use App\Services\Invitations\EventSettings;
use Carbon\CarbonImmutable;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventsTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    public function test_lists_every_event_with_its_card(): void
    {
        $list = $this->asManager()->getJson('/api/manager/events')->assertOk();
        // Con la lista llegan los datos al día de quien entra (el inicio no pide /me aparte).
        $list->assertJsonPath('user.username', 'ana')->assertJsonPath('user.role', 'admin')->assertJsonMissingPath('user.clave');
        $events = collect($list->json('events'))->keyBy('slug');

        $this->assertSame(['borrador', 'nueva', 'prueba', 'roto'], $events->keys()->sort()->values()->all());
        $this->assertSame('design', $events['nueva']['format']);
        $this->assertSame('legacy', $events['prueba']['format']);
        $this->assertSame('XV de Nue', $events['nueva']['title']);
        $this->assertTrue($events['nueva']['published']);
        $this->assertFalse($events['borrador']['published']);
        $this->assertSame(['invitations' => 3, 'guests' => 1, 'attending' => 0], $events['prueba']['counts']);
        $this->assertSame(['primary' => '#96792c', 'accent' => '#2F4A7A'], $events['nueva']['cover']['colors']);
    }

    public function test_creates_a_blank_invitation_hidden_and_with_its_own_panel_key(): void
    {
        $created = $this->asManager()->postJson('/api/manager/events', [
            'slug' => 'xv-ana',
            'source' => 'blank',
            'event' => ['tipo' => 'xv', 'festejada' => 'Ana Sofía', 'inicia' => '2027-03-20 19:00'],
        ])->assertCreated()->json();

        $this->assertSame('xv-ana', $created['slug']);
        $this->assertMatchesRegularExpression('/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/', $created['panel_password']);
        $this->assertFileExists("{$this->eventos}/xv-ana/invitacion.csv");
        $settings = array_column($this->readCsv('xv-ana', 'ajustes.csv'), 'valor', 'clave');
        // Quien la crea la ve en el gestor.
        $this->assertSame(['publicado' => 'NO', 'clave_panel' => $created['panel_password'], 'personas_gestor' => 'ana'], $settings);
        // Oculta hasta que el gestor la haga visible; el panel del cliente ya abre.
        $this->getJson('/api/public/events/xv-ana')->assertNotFound();
        $this->postJson('/api/admin/events/xv-ana/session', ['password' => $created['panel_password']])->assertOk();

        $design = $this->getJson('/api/manager/events/xv-ana/design')->assertOk();
        $design->assertJsonPath('design.event.festejada', 'Ana Sofía')
            ->assertJsonPath('config.starts_at', '2027-03-20T19:00:00-06:00');
    }

    public function test_copying_an_event_takes_only_the_invitation_and_its_media(): void
    {
        mkdir("{$this->eventos}/nueva/borrador");
        file_put_contents("{$this->eventos}/nueva/borrador/invitacion.csv", "seccion,elemento,campo,valor\r\nevento,,tema,jardin-azul\r\nevento,,inicia,2026-11-28 17:00\r\nevento,,festejada,Del Borrador\r\n");
        mkdir("{$this->eventos}/nueva/respaldos");
        file_put_contents("{$this->eventos}/nueva/respaldos/invitacion-20261001-120000.csv", 'x');

        $this->asManager()->postJson('/api/manager/events', ['slug' => 'copia', 'source' => 'event', 'from' => 'nueva'])->assertCreated();

        $files = array_values(array_diff(scandir("{$this->eventos}/copia"), ['.', '..']));
        sort($files);
        $this->assertSame(['.ajustes-historial.csv.lock', '.ajustes.csv.lock', 'ajustes-historial.csv', 'ajustes.csv', 'invitacion.csv', 'media', 'respaldos'], $files);
        $this->assertFileExists("{$this->eventos}/copia/media/salon.webp");
        // Sus respaldos empiezan de cero: solo la bitácora, que dice quién la creó.
        $this->assertSame(['.publicaciones.csv.lock', 'publicaciones.csv'], array_values(array_diff(scandir("{$this->eventos}/copia/respaldos"), ['.', '..'])));
        $log = $this->readCsv('copia', 'respaldos/publicaciones.csv');
        $this->assertSame(['copia de nueva', 'ana', 'Ana Prueba'], [$log[0]['origen'], $log[0]['usuario'], $log[0]['nombre']]);
        $this->assertSame('ana', $this->readCsv('copia', 'ajustes-historial.csv')[0]['usuario']);
        // Copia lo que el gestor tenía enfrente (el borrador), nunca los enlaces del otro evento.
        $this->getJson('/api/manager/events/copia/design')->assertJsonPath('design.event.festejada', 'Del Borrador');
        $this->getJson('/api/public/invitations/NuevaToken01')->assertJsonPath('event.slug', 'nueva');
    }

    public function test_a_template_never_goes_public_and_has_no_panel(): void
    {
        $this->asManager()->postJson('/api/manager/events', ['slug' => 'plantilla-azul', 'source' => 'event', 'from' => 'nueva', 'template' => true])
            ->assertCreated()
            ->assertJsonPath('panel_password', null);

        $this->getJson('/api/manager/events/plantilla-azul/design')
            ->assertJsonPath('settings.template', true)
            ->assertJsonPath('settings.panel_password', null);
        $this->putJson('/api/manager/events/plantilla-azul/settings', ['published' => true])->assertStatus(422);
        $this->getJson('/api/public/events/plantilla-azul')->assertNotFound();
        // En la lista, sin invitados que contar.
        $card = collect($this->getJson('/api/manager/events')->json('events'))->firstWhere('slug', 'plantilla-azul');
        $this->assertTrue($card['template']);
        $this->assertSame(['invitations' => 0, 'guests' => 0, 'attending' => 0], $card['counts']);
    }

    public function test_deleting_a_template_moves_it_to_the_trash_with_who_did_it(): void
    {
        $this->asManager()->postJson('/api/manager/events', ['slug' => 'plantilla-azul', 'source' => 'event', 'from' => 'nueva', 'template' => true])->assertCreated();

        $this->deleteJson('/api/manager/events/plantilla-azul')->assertOk()->assertJsonPath('deleted', 'plantilla-azul');

        // Ya no está en la lista ni abre en el editor…
        $this->assertDirectoryDoesNotExist("{$this->eventos}/plantilla-azul");
        $this->assertNotContains('plantilla-azul', collect($this->getJson('/api/manager/events')->json('events'))->pluck('slug'));
        $this->getJson('/api/manager/events/plantilla-azul/design')->assertNotFound();
        // …pero no se borró: está completa en la papelera del gestor, con quién la quitó.
        $moved = glob("{$this->eventos}/_gestor/papelera/plantilla-azul-*", GLOB_ONLYDIR);
        $this->assertCount(1, $moved);
        $this->assertFileExists("{$moved[0]}/invitacion.csv");
        $this->assertFileExists("{$moved[0]}/media/salon.webp");
        $log = array_map('str_getcsv', array_slice(file("{$this->eventos}/_gestor/papelera/papelera.csv", FILE_IGNORE_NEW_LINES), 1));
        $this->assertSame(['plantilla-azul', '_gestor/papelera/'.basename($moved[0]), 'ana', 'Ana Prueba'], array_slice($log[0], 1));
        // La papelera nunca aparece como evento.
        $this->assertNotContains('_gestor', collect($this->getJson('/api/manager/events')->json('events'))->pluck('slug'));
        $this->deleteJson('/api/manager/events/plantilla-azul')->assertNotFound();
    }

    public function test_only_templates_are_deleted_and_only_by_who_administers(): void
    {
        // Una invitación guarda sus enlaces y confirmaciones: no se elimina desde aquí.
        $this->asManager()->deleteJson('/api/manager/events/nueva')->assertStatus(422);
        $this->assertDirectoryExists("{$this->eventos}/nueva");
        $this->postJson('/api/manager/events', ['slug' => 'plantilla-azul', 'source' => 'event', 'from' => 'nueva', 'template' => true])->assertCreated();

        // Quien edita ve las plantillas, pero no las elimina.
        $this->asManager('beto', 'editor')->deleteJson('/api/manager/events/plantilla-azul')->assertForbidden();
        $this->assertDirectoryExists("{$this->eventos}/plantilla-azul");
    }

    public function test_the_landing_samples_are_marked_for_their_own_tab(): void
    {
        app(EventSettings::class)->put("{$this->eventos}/nueva", ['demo' => 'SI'], CarbonImmutable::now());

        $events = collect($this->asManager()->getJson('/api/manager/events')->json('events'))->keyBy('slug');
        $this->assertTrue($events['nueva']['demo']);
        $this->assertFalse($events['nueva']['template']);
        $this->assertFalse($events['prueba']['demo']);
    }

    public function test_the_address_is_checked(): void
    {
        $this->asManager()->postJson('/api/manager/events', ['slug' => 'nueva', 'source' => 'blank'])->assertStatus(409);
        $this->postJson('/api/manager/events', ['slug' => 'vista-previa', 'source' => 'blank'])->assertStatus(422)->assertJsonValidationErrors('slug');
        $this->postJson('/api/manager/events', ['slug' => 'Con Espacios', 'source' => 'blank'])->assertStatus(422);
        $this->postJson('/api/manager/events', ['slug' => 'otra', 'source' => 'event'])->assertStatus(422)->assertJsonValidationErrors('from');
        $this->postJson('/api/manager/events', ['slug' => 'otra', 'source' => 'event', 'from' => 'no-existe'])->assertStatus(422);
        $this->assertDirectoryDoesNotExist("{$this->eventos}/otra");
    }

    public function test_the_panel_key_and_visibility_change_at_once(): void
    {
        $this->asManager()->putJson('/api/manager/events/nueva/settings', ['panel_password' => 'clave-nueva-2026'])
            ->assertOk()
            ->assertJsonPath('settings.panel_password', 'clave-nueva-2026');
        $this->postJson('/api/admin/events/nueva/session', ['password' => 'clave-nueva-2026'])->assertOk();
        $this->postJson('/api/admin/events/nueva/session', ['password' => 'clave-de-prueba-nueva'])->assertStatus(422);
        // El historial dice que cambió, nunca cuál es.
        $history = (string) file_get_contents("{$this->eventos}/nueva/ajustes-historial.csv");
        $this->assertStringContainsString('(cambiada)', $history);
        $this->assertStringNotContainsString('clave-nueva-2026', $history);

        $this->putJson('/api/manager/events/nueva/settings', ['published' => false])->assertJsonPath('settings.published', false);
        $this->getJson('/api/public/events/nueva')->assertNotFound();
        $this->putJson('/api/manager/events/nueva/settings', ['published' => true]);
        $this->getJson('/api/public/events/nueva')->assertOk();

        $this->putJson('/api/manager/events/nueva/settings', ['panel_password' => 'corta'])->assertStatus(422);
    }
}
