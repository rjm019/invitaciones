<?php

namespace Tests\Feature\Manager;

use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;
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
        $this->getJson('/api/manager/session')->assertOk()->assertJson(['enabled' => false, 'setup' => false]);
        $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => 'lo-que-sea-1234567'])->assertStatus(403);
        $this->postJson('/api/manager/setup', ['master_password' => 'x'])->assertStatus(403);
        $this->getJson('/api/manager/events')->assertStatus(403);

        // Una clave corta tampoco abre (mínimo 16).
        config(['invitaciones.gestor_clave' => 'corta-123']);
        $this->getJson('/api/manager/session')->assertJsonPath('enabled', false);
    }

    public function test_the_first_account_is_created_with_the_master_key(): void
    {
        $this->enableManager();
        $this->getJson('/api/manager/session')->assertJson(['enabled' => true, 'setup' => true]);
        $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => self::MANAGER_PASSWORD])->assertStatus(422);

        $account = ['name' => 'Ana López', 'username' => ' Ana ', 'password' => 'mi-clave-segura-1'];
        $this->postJson('/api/manager/setup', [...$account, 'master_password' => 'no-es-la-maestra-123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('master_password');
        $this->postJson('/api/manager/setup', [...$account, 'master_password' => self::MANAGER_PASSWORD, 'password' => 'corta'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $session = $this->postJson('/api/manager/setup', [...$account, 'master_password' => self::MANAGER_PASSWORD])
            ->assertCreated()
            ->assertJsonPath('user.username', 'ana')
            ->assertJsonPath('user.name', 'Ana López')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.must_change_password', false)
            ->assertJsonPath('user.last_login_at', fn ($at) => $at !== null)
            ->json();
        $this->withToken($session['token'])->getJson('/api/manager/me')->assertOk()->assertJsonPath('user.username', 'ana');

        // Ya hay cuentas: la clave maestra no vuelve a crear ni a entrar.
        $this->getJson('/api/manager/session')->assertJsonPath('setup', false);
        $this->postJson('/api/manager/setup', [...$account, 'username' => 'otra', 'master_password' => self::MANAGER_PASSWORD])->assertStatus(409);

        // El archivo guarda el hash, nunca la clave, y se abre en Excel (BOM).
        $file = (string) file_get_contents("{$this->eventos}/_gestor/usuarios.csv");
        $this->assertStringStartsWith("\xEF\xBB\xBF", $file);
        $this->assertStringNotContainsString('mi-clave-segura-1', $file);
        // "_gestor" nunca es un evento.
        $this->withToken($session['token'])->getJson('/api/manager/events')
            ->assertOk()
            ->assertJsonMissing(['slug' => '_gestor']);
    }

    public function test_each_person_enters_with_their_own_password_and_guessing_is_throttled(): void
    {
        $this->enableManager();
        $this->managerUser('ana');
        $this->getJson('/api/manager/events')->assertStatus(401);

        $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => 'no-es-la-clave-123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'El usuario o la clave no son correctos.');
        // Un usuario que no existe responde igual (no delata quién tiene cuenta).
        $this->postJson('/api/manager/session', ['username' => 'nadie', 'password' => self::USER_PASSWORD])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'El usuario o la clave no son correctos.');

        $session = $this->postJson('/api/manager/session', ['username' => 'ANA ', 'password' => self::USER_PASSWORD])
            ->assertOk()
            ->assertJsonPath('user.username', 'ana')
            ->json();
        $this->withToken($session['token'])->getJson('/api/manager/events')->assertOk();
        $this->assertNotNull(app(ManagerUsers::class)->find('ana')['ultimo_acceso'] ?: null);

        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => 'otra-equivocada-123']);
        }
        $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => self::USER_PASSWORD])->assertStatus(429);
    }

    public function test_the_session_expires_and_dies_when_the_master_key_changes(): void
    {
        $token = $this->managerToken();

        $this->travel(13)->hours();
        $this->withToken($token)->getJson('/api/manager/events')->assertStatus(401);
        $this->travelBack();

        $this->withToken($token)->getJson('/api/manager/events')->assertOk();
        config(['invitaciones.gestor_clave' => 'otra-clave-maestra-1234']);
        $this->withToken($token)->getJson('/api/manager/events')->assertStatus(401);
    }

    public function test_changing_my_password_closes_my_other_sessions(): void
    {
        $old = $this->managerToken();

        $this->withToken($old)->putJson('/api/manager/me/password', ['current_password' => 'no-es-123456', 'password' => 'una-clave-nueva-1'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');
        $this->putJson('/api/manager/me/password', ['current_password' => self::USER_PASSWORD, 'password' => self::USER_PASSWORD])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
        $this->putJson('/api/manager/me/password', ['current_password' => self::USER_PASSWORD, 'password' => 'ana'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $new = $this->putJson('/api/manager/me/password', ['current_password' => self::USER_PASSWORD, 'password' => 'una-clave-nueva-1'])
            ->assertOk()
            ->json('token');

        $this->withToken($old)->getJson('/api/manager/me')->assertStatus(401);
        $this->withToken($new)->getJson('/api/manager/me')->assertOk();
        $this->postJson('/api/manager/session', ['username' => 'ana', 'password' => 'una-clave-nueva-1'])->assertOk();
    }

    public function test_a_person_without_access_cannot_enter(): void
    {
        $this->enableManager();
        $this->managerUser('ana');
        $this->managerUser('beto', 'editor');
        $token = $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => self::USER_PASSWORD])->json('token');

        app(ManagerUsers::class)->update('beto', ['active' => false], CarbonImmutable::now());

        $this->withToken($token)->getJson('/api/manager/events')->assertStatus(401);
        // Con la clave correcta se le dice por qué; con una equivocada, lo de siempre.
        $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => self::USER_PASSWORD])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Tu acceso al gestor está desactivado. Pídele a quien lo administra que lo active.');
        $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => 'otra-equivocada-123'])->assertStatus(422);
    }

    public function test_an_owner_panel_session_is_not_a_manager_session(): void
    {
        $this->enableManager();
        $this->managerUser('ana');
        $panel = $this->postJson('/api/admin/events/prueba/session', ['password' => 'clave-de-prueba'])->assertOk()->json('token');

        $this->withToken($panel)->getJson('/api/manager/events')->assertStatus(401);
    }

    public function test_the_catalog_is_for_the_manager(): void
    {
        $this->asManager()->getJson('/api/manager/catalog')
            ->assertOk()
            ->assertJsonPath('catalog.version', 1)
            ->assertJsonCount(21, 'catalog.sections');
    }
}
