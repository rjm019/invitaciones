<?php

namespace App\Services\Manager;

use App\Services\Csv\CsvFile;
use App\Services\Design\DesignFactory;
use App\Services\Design\Normalizer;
use App\Services\Design\PublicationLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Las personas que entran al gestor: eventos/_gestor/usuarios.csv (en el disco de los
 * eventos y fuera de git; "_gestor" nunca puede ser la dirección de un evento). Cada una
 * con su usuario, nombre, rol y el hash de su clave (nunca la clave).
 *
 * Quien administra agrega personas con una clave temporal (se cambia al entrar) y les
 * quita o devuelve el acceso. Nadie se borra: el historial dice quién publicó qué.
 */
final class ManagerUsers
{
    public const DIR = '_gestor';

    public const FILE = 'usuarios.csv';

    public const HEADERS = ['usuario', 'nombre', 'rol', 'activo', 'clave', 'cambiar_clave', 'creado', 'ultimo_acceso'];

    public const ROLES = ['admin', 'editor'];

    /** Minúsculas, números y . _ @ - (un correo sirve de usuario). */
    public const USERNAME = '/^[a-z0-9][a-z0-9._@-]{2,59}$/';

    public const MIN_PASSWORD = 10;

    public function __construct(private readonly CsvFile $csv) {}

    public function path(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/').'/'.self::DIR.'/'.self::FILE;
    }

    public static function normalize(string $username): string
    {
        return mb_strtolower(trim($username));
    }

    /** @return list<array<string, string>> los renglones del archivo, con la clave en hash */
    public function all(): array
    {
        return array_map(function (array $row) {
            $row['nombre'] = CsvFile::unsafe($row['nombre'] ?? '');

            return $row;
        }, array_values(array_filter($this->csv->read($this->path()), fn ($row) => ($row['usuario'] ?? '') !== '')));
    }

    public function any(): bool
    {
        return $this->all() !== [];
    }

    /** @return array<string, string>|null */
    public function find(string $username): ?array
    {
        $username = self::normalize($username);
        foreach ($this->all() as $row) {
            if ($row['usuario'] === $username) {
                return $row;
            }
        }

        return null;
    }

    /** @param  array<string, string>  $row */
    public static function active(array $row): bool
    {
        return Normalizer::yes($row['activo'] ?? '');
    }

    /**
     * Lo que se puede mostrar de una persona (nunca el hash).
     *
     * @param  array<string, string>  $row
     * @return array{username: string, name: string, role: string, active: bool, must_change_password: bool, created_at: ?string, last_login_at: ?string}
     */
    public static function present(array $row): array
    {
        return [
            'username' => $row['usuario'],
            'name' => $row['nombre'] ?? '',
            'role' => in_array($row['rol'] ?? '', self::ROLES, true) ? $row['rol'] : 'editor',
            'active' => self::active($row),
            'must_change_password' => Normalizer::yes($row['cambiar_clave'] ?? ''),
            'created_at' => self::iso($row['creado'] ?? ''),
            'last_login_at' => self::iso($row['ultimo_acceso'] ?? ''),
        ];
    }

    /**
     * @return array<string, string> la persona nueva
     *
     * @throws RuntimeException si el usuario ya existe o algún dato no sirve
     */
    public function create(string $username, string $name, string $role, string $password, bool $temporary, CarbonImmutable $now): array
    {
        $username = self::normalize($username);
        self::checkUsername($username);
        self::checkName($name);
        self::checkRole($role);
        self::checkPassword($password, $username);

        return $this->change(function (array $rows) use ($username, $name, $role, $password, $temporary, $now) {
            foreach ($rows as $row) {
                if ($row['usuario'] === $username) {
                    throw new RuntimeException('Ya hay una persona con ese usuario.');
                }
            }
            $rows[] = [
                'usuario' => $username,
                'nombre' => trim($name),
                'rol' => $role,
                'activo' => 'SI',
                'clave' => Hash::make($password),
                'cambiar_clave' => $temporary ? 'SI' : 'NO',
                'creado' => $now->format('Y-m-d H:i:s'),
                'ultimo_acceso' => '',
            ];

            return [$rows, $username];
        }, $now);
    }

    /**
     * Cambia nombre, rol, acceso o clave. Siempre queda al menos una persona activa que
     * administre (si no, nadie podría agregar ni devolver accesos).
     *
     * @param  array{name?: string, role?: string, active?: bool, password?: string, temporary?: bool}  $changes
     * @return array<string, string> la persona ya cambiada
     *
     * @throws RuntimeException
     */
    public function update(string $username, array $changes, CarbonImmutable $now): array
    {
        $username = self::normalize($username);

        return $this->change(function (array $rows) use ($username, $changes) {
            $found = false;
            foreach ($rows as &$row) {
                if ($row['usuario'] !== $username) {
                    continue;
                }
                $found = true;
                if (array_key_exists('name', $changes)) {
                    self::checkName($changes['name']);
                    $row['nombre'] = trim($changes['name']);
                }
                if (array_key_exists('role', $changes)) {
                    self::checkRole($changes['role']);
                    $row['rol'] = $changes['role'];
                }
                if (array_key_exists('active', $changes)) {
                    $row['activo'] = $changes['active'] ? 'SI' : 'NO';
                }
                if (array_key_exists('password', $changes)) {
                    self::checkPassword($changes['password'], $username);
                    $row['clave'] = Hash::make($changes['password']);
                    $row['cambiar_clave'] = ($changes['temporary'] ?? false) ? 'SI' : 'NO';
                }
            }
            unset($row);
            if (! $found) {
                throw new RuntimeException('No existe esa persona.');
            }
            $admins = array_filter($rows, fn ($r) => self::active($r) && ($r['rol'] ?? '') === 'admin');
            if ($admins === []) {
                throw new RuntimeException('Debe quedar al menos una persona activa que administre el gestor.');
            }

            return [$rows, $username];
        }, $now);
    }

    /**
     * Anota cuándo entró (no respalda: es solo informativo).
     *
     * @return array<string, string> la persona ya con su último acceso
     */
    public function touch(string $username, CarbonImmutable $now): array
    {
        $username = self::normalize($username);

        return $this->change(function (array $rows) use ($username, $now) {
            foreach ($rows as &$row) {
                if ($row['usuario'] === $username) {
                    $row['ultimo_acceso'] = $now->format('Y-m-d H:i:s');
                }
            }
            unset($row);

            return [$rows, $username];
        }, $now, backup: false);
    }

    /** Una clave temporal fácil de dictar ("k7m2-p9qa-x4tb"); la persona la cambia al entrar. */
    public static function temporaryPassword(): string
    {
        return DesignFactory::password();
    }

    /** @throws RuntimeException */
    public static function checkPassword(string $password, string $username = ''): void
    {
        $length = mb_strlen($password);
        if ($length < self::MIN_PASSWORD || $length > 128) {
            throw new RuntimeException('La clave lleva de '.self::MIN_PASSWORD.' a 128 caracteres.');
        }
        // Como la del panel: ninguna clave lleva espacios (las de antes siguen entrando).
        if (preg_match('/[\s\p{Z}]/u', $password)) {
            throw new RuntimeException('La clave no lleva espacios.');
        }
        if ($username !== '' && self::normalize($password) === $username) {
            throw new RuntimeException('La clave no puede ser igual al usuario.');
        }
    }

    /** @throws RuntimeException */
    public static function checkUsername(string $username): void
    {
        if (! preg_match(self::USERNAME, $username)) {
            throw new RuntimeException('El usuario lleva de 3 a 60 minúsculas, números o . _ @ - (por ejemplo ana o ana@correo.com).');
        }
    }

    /** @throws RuntimeException */
    private static function checkName(string $name): void
    {
        $name = trim($name);
        if ($name === '' || mb_strlen($name) > 60) {
            throw new RuntimeException('Escribe el nombre de la persona (hasta 60 caracteres).');
        }
    }

    /** @throws RuntimeException */
    private static function checkRole(string $role): void
    {
        if (! in_array($role, self::ROLES, true)) {
            throw new RuntimeException('Elige si administra o solo edita.');
        }
    }

    /**
     * Lee, cambia y escribe el archivo bajo su candado.
     *
     * @param  \Closure(list<array<string, string>>): array{0: list<array<string, string>>, 1: string}  $fn
     * @return array<string, string> la persona que cambió
     */
    private function change(\Closure $fn, CarbonImmutable $now, bool $backup = true): array
    {
        $path = $this->path();
        $dir = dirname($path);
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException('No se pudo crear la carpeta del gestor.');
        }

        return $this->csv->locked($path, function () use ($fn, $path, $now, $backup) {
            [$rows, $username] = $fn($this->all());
            if ($backup) {
                $this->csv->backupDaily($path, $now);
            }
            $this->csv->write($path, self::HEADERS, array_map(function (array $row) {
                $row['nombre'] = CsvFile::safe($row['nombre']);

                return $row;
            }, $rows));

            foreach ($rows as $row) {
                if ($row['usuario'] === $username) {
                    return $row;
                }
            }
            throw new RuntimeException('No existe esa persona.');
        });
    }

    private static function iso(string $value): ?string
    {
        return PublicationLog::date($value)?->toIso8601String();
    }
}
