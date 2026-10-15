<?php

namespace Tests\Feature\Manager;

use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/** "Cada quien las suyas": quien edita ve lo que creó o le asignaron; quien administra, todo. */
class AccessTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    public function test_an_editor_sees_only_what_was_assigned_and_the_templates(): void
    {
        $all = array_column($this->asManager()->getJson('/api/manager/events')->json('events'), 'slug');
        $this->assertContains('nueva', $all);
        $this->assertContains('prueba', $all);

        $this->postJson('/api/manager/events', ['slug' => 'plantilla-azul', 'source' => 'event', 'from' => 'nueva', 'template' => true])->assertCreated();
        $this->asManager('beto', 'editor')->getJson('/api/manager/events')
            ->assertOk()
            ->assertJsonCount(1, 'events')
            ->assertJsonPath('events.0.slug', 'plantilla-azul');

        // Una plantilla la puede usar cualquiera; un evento que no es suyo, no.
        $this->postJson('/api/manager/events', ['slug' => 'de-beto', 'source' => 'event', 'from' => 'plantilla-azul'])->assertCreated();
        $this->postJson('/api/manager/events', ['slug' => 'otra', 'source' => 'event', 'from' => 'nueva'])->assertStatus(403);
        $this->assertDirectoryDoesNotExist("{$this->eventos}/otra");

        // Lo que creó, sí lo ve.
        $mine = array_column($this->getJson('/api/manager/events')->json('events'), 'slug');
        $this->assertEqualsCanonicalizing(['plantilla-azul', 'de-beto'], $mine);
        $this->getJson('/api/manager/events/de-beto/design')->assertOk()->assertJsonPath('settings.people.0.username', 'beto');
    }

    public function test_an_unassigned_event_is_closed_until_someone_who_administers_assigns_it(): void
    {
        $this->asManager('beto', 'editor');
        $message = 'Esta invitación no está asignada a ti. Pídele a quien administra el gestor que te la asigne.';
        foreach (['design', 'history', 'media', 'export?format=csv'] as $path) {
            $this->getJson("/api/manager/events/nueva/{$path}")->assertStatus(403)->assertJsonPath('message', $message);
        }
        $this->putJson('/api/manager/events/nueva/settings', ['published' => false])->assertStatus(403);
        // Lo que no existe sigue siendo 404.
        $this->getJson('/api/manager/events/no-existe/design')->assertNotFound();
        // Quien edita no se asigna a sí mismo.
        $this->putJson('/api/manager/events/nueva/settings', ['people' => ['beto']])->assertStatus(403);

        $this->asManager()->putJson('/api/manager/events/nueva/settings', ['people' => ['nadie']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('people');
        $this->putJson('/api/manager/events/nueva/settings', ['people' => ['Beto', 'beto']])
            ->assertOk()
            ->assertJsonPath('settings.people', [['username' => 'beto', 'name' => 'Beto Prueba', 'role' => 'editor', 'active' => true]]);
        $this->assertSame('beto', array_column($this->readCsv('nueva', 'ajustes.csv'), 'valor', 'clave')['personas_gestor']);
        $log = $this->readCsv('nueva', 'ajustes-historial.csv');
        $this->assertSame(['personas_gestor', 'beto', 'ana'], [end($log)['clave'], end($log)['nuevo'], end($log)['usuario']]);

        $this->asManager('beto', 'editor')->getJson('/api/manager/events/nueva/design')->assertOk();
        $this->assertSame(['nueva'], array_column($this->getJson('/api/manager/events')->json('events'), 'slug'));

        // Quitársela la vuelve a cerrar.
        $this->asManager()->putJson('/api/manager/events/nueva/settings', ['people' => []])->assertOk()->assertJsonPath('settings.people', []);
        $this->asManager('beto', 'editor')->getJson('/api/manager/events/nueva/design')->assertStatus(403);
    }
}
