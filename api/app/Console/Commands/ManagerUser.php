<?php

namespace App\Console\Commands;

use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Las cuentas del gestor desde la terminal: verlas, crear una, darle una clave temporal
 * nueva y quitar o devolver el acceso. Sirve para entrar si nadie recuerda su clave (en
 * producción: fly ssh console -C "php /var/www/api/artisan gestor:usuario ana --clave-nueva").
 */
class ManagerUser extends Command
{
    protected $signature = 'gestor:usuario
        {usuario? : Usuario de la persona; sin él, lista las cuentas}
        {--nombre= : Nombre de la persona (obligatorio al crearla)}
        {--rol= : admin (administra) o editor (solo edita); al crear, editor (la primera cuenta, admin)}
        {--clave-nueva : Le da una clave temporal nueva (la cambia al entrar)}
        {--quitar-acceso : Ya no puede entrar (se conserva en el historial)}
        {--dar-acceso : Puede volver a entrar}';

    protected $description = 'Lista, crea o cambia las cuentas del gestor (y da claves temporales)';

    public function handle(ManagerUsers $users): int
    {
        $username = ManagerUsers::normalize((string) $this->argument('usuario'));
        if ($username === '') {
            return $this->list($users);
        }
        $now = CarbonImmutable::now();
        $role = $this->option('rol');
        if ($this->option('quitar-acceso') && $this->option('dar-acceso')) {
            $this->error('Usa --quitar-acceso o --dar-acceso, no los dos.');

            return self::FAILURE;
        }

        try {
            if ($users->find($username) === null) {
                $name = trim((string) $this->option('nombre'));
                if ($name === '') {
                    $this->error("No existe {$username}. Para crearla: gestor:usuario {$username} --nombre=\"Su nombre\" [--rol=admin]");

                    return self::FAILURE;
                }
                // La primera cuenta administra (si no, nadie podría agregar a las demás).
                $role ??= $users->any() ? 'editor' : 'admin';
                $password = ManagerUsers::temporaryPassword();
                $users->create($username, $name, $role, $password, true, $now);
                $this->info("Listo: {$username} (".($role === 'admin' ? 'administra' : 'edita').').');
                $this->line("Clave temporal: {$password}  (la cambia al entrar)");

                return self::SUCCESS;
            }

            $changes = array_filter([
                'name' => $this->option('nombre') !== null ? (string) $this->option('nombre') : null,
                'role' => $role,
                'active' => $this->option('quitar-acceso') ? false : ($this->option('dar-acceso') ? true : null),
            ], fn ($v) => $v !== null);
            $password = $this->option('clave-nueva') ? ManagerUsers::temporaryPassword() : null;
            if ($password !== null) {
                $changes += ['password' => $password, 'temporary' => true];
            }
            if ($changes === []) {
                $this->line('Nada que cambiar. Opciones: --nombre, --rol, --clave-nueva, --quitar-acceso, --dar-acceso.');

                return self::SUCCESS;
            }
            $user = ManagerUsers::present($users->update($username, $changes, $now));
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Listo: {$user['username']} ({$user['name']}, ".($user['role'] === 'admin' ? 'administra' : 'edita').', '.($user['active'] ? 'con acceso' : 'sin acceso').').');
        if ($password !== null) {
            $this->line("Clave temporal: {$password}  (la cambia al entrar; sus sesiones abiertas se cerraron)");
        }

        return self::SUCCESS;
    }

    private function list(ManagerUsers $users): int
    {
        $rows = array_map(function (array $row) {
            $user = ManagerUsers::present($row);

            return [
                $user['username'],
                $user['name'],
                $user['role'] === 'admin' ? 'administra' : 'edita',
                $user['active'] ? 'sí' : 'no',
                $user['last_login_at'] ? CarbonImmutable::parse($user['last_login_at'])->format('Y-m-d H:i') : '—',
            ];
        }, $users->all());
        if ($rows === []) {
            $this->line('Todavía no hay cuentas: la primera se crea en /gestor con la clave maestra, o aquí con --nombre y --rol=admin.');

            return self::SUCCESS;
        }
        $this->table(['Usuario', 'Nombre', 'Rol', 'Acceso', 'Último acceso'], $rows);

        return self::SUCCESS;
    }
}
