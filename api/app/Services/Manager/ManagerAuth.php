<?php

namespace App\Services\Manager;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Entrada al gestor: cada persona con su usuario y su clave (ManagerUsers). La clave
 * maestra (GESTOR_CLAVE) enciende el gestor y sirve para crear la primera cuenta; después
 * ya no entra.
 *
 * Igual que el panel del dueño, sin base de datos: la sesión es un token cifrado con
 * APP_KEY que dice de quién es y hasta cuándo vale. Deja de servir si esa persona cambia
 * su clave o pierde el acceso, y si cambia la clave maestra (así se cierran todas). Un
 * token del panel de un evento nunca sirve aquí (no dice "manager").
 */
final class ManagerAuth
{
    public const TTL_HOURS = 12;

    public const MIN_PASSWORD = 16;

    /** Dónde deja el middleware a la persona de la petición. */
    public const ATTRIBUTE = 'manager_user';

    private const SCOPE = 'manager';

    private static ?string $decoy = null;

    public function __construct(private readonly ManagerUsers $users) {}

    /** La clave maestra, o null si no está puesta o es muy corta (el gestor no abre). */
    public function password(): ?string
    {
        $password = (string) config('invitaciones.gestor_clave');

        return mb_strlen($password) >= self::MIN_PASSWORD ? $password : null;
    }

    public function enabled(): bool
    {
        return $this->password() !== null;
    }

    /** ¿Falta crear la primera cuenta? */
    public function needsSetup(): bool
    {
        return $this->enabled() && ! $this->users->any();
    }

    /**
     * @return array{token: string, expires_at: string, user: array<string, mixed>}|null null si
     *                                                                                   el usuario o la clave no coinciden
     *
     * @throws RuntimeException si la clave es correcta pero la cuenta ya no tiene acceso
     */
    public function attempt(string $username, string $password, ?CarbonImmutable $now = null): ?array
    {
        if (! $this->enabled()) {
            return null;
        }
        $user = $this->users->find($username);
        // Sin la persona también se compara contra un hash: tarda lo mismo y no delata quién existe.
        $matches = Hash::check($password, $user['clave'] ?? self::decoy());
        if ($user === null || ! $matches) {
            return null;
        }
        if (! ManagerUsers::active($user)) {
            throw new RuntimeException('Tu acceso al gestor está desactivado. Pídele a quien lo administra que lo active.');
        }

        return $this->issue($this->users->touch($user['usuario'], $now ?? CarbonImmutable::now()));
    }

    /**
     * La primera cuenta (administra), con la clave maestra. Solo mientras no haya ninguna.
     *
     * @return array{token: string, expires_at: string, user: array<string, mixed>}|null null si
     *                                                                                   la clave maestra no coincide
     *
     * @throws RuntimeException si ya hay cuentas o los datos no sirven
     */
    public function setup(string $master, string $username, string $name, string $password, ?CarbonImmutable $now = null): ?array
    {
        $expected = $this->password();
        if ($expected === null || ! hash_equals($expected, $master)) {
            return null;
        }
        if ($this->users->any()) {
            throw new RuntimeException('Ya hay cuentas en el gestor: entra con la tuya.');
        }
        $now ??= CarbonImmutable::now();
        $user = $this->users->create($username, $name, 'admin', $password, false, $now);

        return $this->issue($this->users->touch($user['usuario'], $now));
    }

    /**
     * Un token nuevo para esta persona (al entrar y al cambiar su clave).
     *
     * @param  array<string, string>  $user
     * @return array{token: string, expires_at: string, user: array<string, mixed>}
     */
    public function issue(array $user): array
    {
        $expires = CarbonImmutable::now()->addHours(self::TTL_HOURS);
        $token = Crypt::encryptString(json_encode([
            'scope' => self::SCOPE,
            'user' => $user['usuario'],
            'exp' => $expires->getTimestamp(),
            'key' => $this->fingerprint($user),
        ]));

        return ['token' => $token, 'expires_at' => $expires->toIso8601String(), 'user' => ManagerUsers::present($user)];
    }

    /**
     * La persona de este token, o null si ya no sirve.
     *
     * @return array<string, string>|null
     */
    public function user(?string $token): ?array
    {
        if (! $this->enabled() || ! $token) {
            return null;
        }
        try {
            $data = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return null;
        }
        if (! is_array($data)
            || ($data['scope'] ?? null) !== self::SCOPE
            || ($data['exp'] ?? 0) <= CarbonImmutable::now()->getTimestamp()
            || ! is_string($data['user'] ?? null)) {
            return null;
        }
        $user = $this->users->find($data['user']);
        if ($user === null || ! ManagerUsers::active($user)) {
            return null;
        }

        return hash_equals($this->fingerprint($user), (string) ($data['key'] ?? '')) ? $user : null;
    }

    /**
     * Quién hace esta petición, para las bitácoras.
     *
     * @return array{usuario: string, nombre: string}
     */
    public static function actor(Request $request): array
    {
        $user = $request->attributes->get(self::ATTRIBUTE);

        return ['usuario' => (string) ($user['usuario'] ?? ''), 'nombre' => (string) ($user['nombre'] ?? '')];
    }

    /** @param  array<string, string>  $user */
    private function fingerprint(array $user): string
    {
        $material = 'manager|'.$this->password().'|'.$user['usuario'].'|'.($user['clave'] ?? '');

        return substr(hash_hmac('sha256', $material, (string) config('app.key')), 0, 24);
    }

    private static function decoy(): string
    {
        return self::$decoy ??= Hash::make(bin2hex(random_bytes(16)));
    }
}
