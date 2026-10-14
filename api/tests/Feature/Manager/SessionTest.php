<?php

namespace Tests\Feature\Manager;

use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    public function test_without_a_master_key_the_manager_is_closed(): void
    {
        config(['invitaciones.gestor_clave' => '']);
        $this->postJson('/api/manager/session', ['password' => 'lo-que-sea-1234567'])->assertStatus(403);
        $this->getJson('/api/manager/events')->assertStatus(403);

        // Una clave corta tampoco abre (mínimo 16).
        config(['invitaciones.gestor_clave' => 'corta-123']);
        $this->postJson('/api/manager/session', ['password' => 'corta-123'])->assertStatus(403);
    }

    public function test_enters_only_with_the_master_key_and_guessing_is_throttled(): void
    {
        $this->enableManager();
        $this->getJson('/api/manager/events')->assertStatus(401);

        $this->postJson('/api/manager/session', ['password' => 'no-es-la-clave-123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'La clave no es correcta.');

        $token = $this->postJson('/api/manager/session', ['password' => self::MANAGER_PASSWORD])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/manager/events')->assertOk();

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/manager/session', ['password' => 'otra-equivocada-123']);
        }
        $this->postJson('/api/manager/session', ['password' => self::MANAGER_PASSWORD])->assertStatus(429);
    }

    public function test_the_session_expires_and_dies_when_the_key_changes(): void
    {
        $token = $this->managerToken();

        $this->travel(13)->hours();
        $this->withToken($token)->getJson('/api/manager/events')->assertStatus(401);
        $this->travelBack();

        $this->withToken($token)->getJson('/api/manager/events')->assertOk();
        config(['invitaciones.gestor_clave' => 'otra-clave-maestra-1234']);
        $this->withToken($token)->getJson('/api/manager/events')->assertStatus(401);
    }

    public function test_an_owner_panel_session_is_not_a_manager_session(): void
    {
        $this->enableManager();
        $panel = $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])->assertOk()->json('token');

        $this->withToken($panel)->getJson('/api/manager/events')->assertStatus(401);
    }

    public function test_the_catalog_is_for_the_manager(): void
    {
        $this->asManager()->getJson('/api/manager/catalog')
            ->assertOk()
            ->assertJsonPath('catalog.version', 1)
            ->assertJsonCount(17, 'catalog.sections');
    }
}
