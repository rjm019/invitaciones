<?php

namespace Tests\Feature\Manager;

use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    public function test_only_who_administers_sees_and_changes_the_accounts(): void
    {
        $this->asManager('beto', 'editor');
        $this->getJson('/api/manager/users')->assertStatus(403);
        $this->postJson('/api/manager/users', ['name' => 'Carla', 'username' => 'carla', 'role' => 'editor'])->assertStatus(403);
        $this->putJson('/api/manager/users/beto', ['role' => 'admin'])->assertStatus(403);
        // Lo demás del gestor sí lo usa.
        $this->getJson('/api/manager/events')->assertOk();
    }

    public function test_a_new_person_gets_a_temporary_password_shown_once(): void
    {
        $created = $this->asManager()->postJson('/api/manager/users', ['name' => 'Carla Ruiz', 'username' => 'Carla@Correo.com', 'role' => 'editor'])
            ->assertCreated()
            ->assertJsonPath('user.username', 'carla@correo.com')
            ->assertJsonPath('user.role', 'editor')
            ->assertJsonPath('user.must_change_password', true)
            ->json();
        $this->assertMatchesRegularExpression('/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/', $created['password']);
        $this->assertStringNotContainsString($created['password'], (string) file_get_contents("{$this->eventos}/_gestor/usuarios.csv"));

        $this->postJson('/api/manager/users', ['name' => 'Otra', 'username' => 'carla@correo.com', 'role' => 'editor'])
            ->assertStatus(409)
            ->assertJsonValidationErrors('username');
        $this->postJson('/api/manager/users', ['name' => 'Otra', 'username' => 'con espacio', 'role' => 'editor'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('username');

        // Entra con la temporal y elige la suya.
        $session = $this->postJson('/api/manager/session', ['username' => 'carla@correo.com', 'password' => $created['password']])
            ->assertOk()
            ->assertJsonPath('user.must_change_password', true)
            ->json();
        $this->withToken($session['token'])
            ->putJson('/api/manager/me/password', ['current_password' => $created['password'], 'password' => 'la-de-carla-2026'])
            ->assertOk()
            ->assertJsonPath('user.must_change_password', false);

        $users = $this->asManager()->getJson('/api/manager/users')->assertOk()->json('users');
        $this->assertSame(['ana', 'carla@correo.com'], array_column($users, 'username'));
        $this->assertArrayNotHasKey('clave', $users[0]);
        $this->assertArrayNotHasKey('password', $users[0]);
    }

    public function test_access_can_be_removed_and_a_new_temporary_password_given(): void
    {
        $this->enableManager();
        $this->managerUser('beto', 'editor');
        $beto = $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => self::USER_PASSWORD])->json('token');

        $this->asManager()->putJson('/api/manager/users/beto', ['active' => false])
            ->assertOk()
            ->assertJsonPath('user.active', false)
            ->assertJsonMissingPath('password');
        $this->withToken($beto)->getJson('/api/manager/events')->assertStatus(401);

        $this->asManager()->putJson('/api/manager/users/beto', ['active' => true, 'name' => 'Beto Gómez', 'role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Beto Gómez')
            ->assertJsonPath('user.role', 'admin');

        $temporary = $this->asManager()->putJson('/api/manager/users/beto', ['reset_password' => true])
            ->assertOk()
            ->assertJsonPath('user.must_change_password', true)
            ->json('password');
        $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => self::USER_PASSWORD])->assertStatus(422);
        $this->postJson('/api/manager/session', ['username' => 'beto', 'password' => $temporary])->assertOk();

        $this->asManager()->putJson('/api/manager/users/nadie', ['active' => false])->assertNotFound();
    }

    public function test_nobody_locks_themselves_out_and_someone_always_administers(): void
    {
        $this->asManager();
        $this->putJson('/api/manager/users/ana', ['active' => false])->assertStatus(422);
        $this->putJson('/api/manager/users/ana', ['role' => 'editor'])->assertStatus(422);
        $this->putJson('/api/manager/users/ana', ['reset_password' => true])->assertStatus(422);
        $this->putJson('/api/manager/users/ana', ['name' => 'Ana López'])->assertOk()->assertJsonPath('user.name', 'Ana López');

        // Con otra persona que administra, Ana sí puede dejar de hacerlo… desde la cuenta de la otra.
        $this->managerUser('carla', 'admin');
        $this->asManager('carla')->putJson('/api/manager/users/ana', ['role' => 'editor'])->assertOk();
        // …pero no la última que queda.
        $this->managerUser('dani', 'editor');
        $this->assertSame(422, $this->asManager('carla')->putJson('/api/manager/users/carla', ['role' => 'editor'])->status());
    }

    public function test_the_terminal_can_create_and_rescue_accounts(): void
    {
        $this->artisan('gestor:usuario')->expectsOutputToContain('Todavía no hay cuentas')->assertSuccessful();
        $this->artisan('gestor:usuario', ['usuario' => 'ana'])->expectsOutputToContain('--nombre')->assertFailed();

        // La primera administra aunque no se diga.
        $this->artisan('gestor:usuario', ['usuario' => 'ana', '--nombre' => 'Ana López'])
            ->expectsOutputToContain('administra')
            ->expectsOutputToContain('Clave temporal:')
            ->assertSuccessful();
        $this->artisan('gestor:usuario', ['usuario' => 'beto', '--nombre' => 'Beto'])->expectsOutputToContain('edita')->assertSuccessful();
        $this->artisan('gestor:usuario', ['usuario' => 'beto', '--rol' => 'jefe'])->assertFailed();
        $this->artisan('gestor:usuario', ['usuario' => 'ana', '--quitar-acceso' => true])
            ->expectsOutputToContain('al menos una persona activa que administre')
            ->assertFailed();
        $this->artisan('gestor:usuario', ['usuario' => 'beto', '--quitar-acceso' => true])->expectsOutputToContain('sin acceso')->assertSuccessful();
        $this->artisan('gestor:usuario', ['usuario' => 'ana', '--clave-nueva' => true])->expectsOutputToContain('Clave temporal:')->assertSuccessful();
        $this->artisan('gestor:usuario')->expectsOutputToContain('Ana López')->assertSuccessful();
    }
}
