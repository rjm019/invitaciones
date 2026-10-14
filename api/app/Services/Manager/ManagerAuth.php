<?php

namespace App\Services\Manager;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Entrada al gestor con la clave maestra (GESTOR_CLAVE). Igual que el panel del dueño, sin
 * base de datos: la sesión es un token cifrado con APP_KEY que dice que es del gestor y
 * hasta cuándo vale. Si la clave cambia, los tokens viejos dejan de servir. Un token del
 * panel de un evento nunca sirve aquí (no dice "manager").
 */
final class ManagerAuth
{
    public const TTL_HOURS = 12;

    public const MIN_PASSWORD = 16;

    private const SCOPE = 'manager';

    /** La clave maestra, o null si no está puesta o es muy corta (el gestor no abre). */
    public function password(): ?string
    {
        $password = (string) config('invitaciones.gestor_clave');

        return mb_strlen($password) >= self::MIN_PASSWORD ? $password : null;
    }

    /**
     * @return array{token: string, expires_at: string}|null null si la clave no coincide
     */
    public function attempt(string $password): ?array
    {
        $expected = $this->password();
        if ($expected === null || ! hash_equals($expected, $password)) {
            return null;
        }

        $expires = CarbonImmutable::now()->addHours(self::TTL_HOURS);
        $token = Crypt::encryptString(json_encode([
            'scope' => self::SCOPE,
            'exp' => $expires->getTimestamp(),
            'key' => $this->fingerprint($expected),
        ]));

        return ['token' => $token, 'expires_at' => $expires->toIso8601String()];
    }

    public function check(?string $token): bool
    {
        $expected = $this->password();
        if ($expected === null || ! $token) {
            return false;
        }
        try {
            $data = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return false;
        }

        return is_array($data)
            && ($data['scope'] ?? null) === self::SCOPE
            && ($data['exp'] ?? 0) > CarbonImmutable::now()->getTimestamp()
            && hash_equals($this->fingerprint($expected), (string) ($data['key'] ?? ''));
    }

    private function fingerprint(string $password): string
    {
        return substr(hash_hmac('sha256', 'manager|'.$password, (string) config('app.key')), 0, 24);
    }
}
