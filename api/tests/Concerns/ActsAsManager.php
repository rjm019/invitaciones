<?php

namespace Tests\Concerns;

/**
 * Pruebas del gestor: la clave maestra de prueba y un token de sesión válido.
 */
trait ActsAsManager
{
    protected const MANAGER_PASSWORD = 'clave-maestra-de-prueba';

    protected function enableManager(): void
    {
        config(['invitaciones.gestor_clave' => self::MANAGER_PASSWORD]);
    }

    protected function managerToken(): string
    {
        $this->enableManager();

        return $this->postJson('/api/manager/session', ['password' => self::MANAGER_PASSWORD])->assertOk()->json('token');
    }

    /** Peticiones como gestor (Authorization: Bearer). */
    protected function asManager(): static
    {
        return $this->withToken($this->managerToken());
    }
}
