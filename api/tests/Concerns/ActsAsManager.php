<?php

namespace Tests\Concerns;

use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;

/**
 * Pruebas del gestor: la clave maestra de prueba, una cuenta (Ana, administra) y su token.
 * Las cuentas viven en la copia de los eventos de cada prueba (CopiesEventFixtures).
 */
trait ActsAsManager
{
    protected const MANAGER_PASSWORD = 'clave-maestra-de-prueba';

    protected const USER_PASSWORD = 'clave-de-prueba-2026';

    /** @var array<string, string> un token por persona en cada prueba (entrar tiene límite de intentos) */
    private array $managerTokens = [];

    protected function enableManager(): void
    {
        config(['invitaciones.gestor_clave' => self::MANAGER_PASSWORD]);
    }

    /** Crea la cuenta si no existe (la clave es USER_PASSWORD, ya elegida por la persona). */
    protected function managerUser(string $username = 'ana', string $role = 'admin', string $name = ''): void
    {
        $users = app(ManagerUsers::class);
        if ($users->find($username) === null) {
            $users->create($username, $name ?: ucfirst($username).' Prueba', $role, self::USER_PASSWORD, false, CarbonImmutable::now());
        }
    }

    protected function managerToken(string $username = 'ana', string $role = 'admin'): string
    {
        $this->enableManager();
        $this->managerUser($username, $role);

        return $this->managerTokens[$username] ??= $this->postJson('/api/manager/session', ['username' => $username, 'password' => self::USER_PASSWORD])
            ->assertOk()
            ->json('token');
    }

    /** Peticiones como una persona del gestor (Authorization: Bearer). */
    protected function asManager(string $username = 'ana', string $role = 'admin'): static
    {
        return $this->withToken($this->managerToken($username, $role));
    }
}
