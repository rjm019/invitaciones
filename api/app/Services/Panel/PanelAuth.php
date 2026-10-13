<?php

namespace App\Services\Panel;

use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Acceso al panel de un evento con la clave de su layout (pestaña evento → clave_panel).
 * Sin base de datos: la sesión es un token cifrado y firmado con APP_KEY que dice de qué
 * evento es y hasta cuándo vale. Si la clave cambia en el Excel, los tokens viejos dejan
 * de servir.
 */
final class PanelAuth
{
    public const TTL_HOURS = 12;

    public function __construct(private readonly EventRepository $events) {}

    /** Clave del panel del evento, o null si el evento no tiene (panel desactivado). */
    public function password(string $slug): ?string
    {
        return $this->events->eventValue($slug, 'clave_panel');
    }

    /**
     * @return array{token: string, expires_at: string}|null null si la clave no coincide
     */
    public function attempt(string $slug, string $password): ?array
    {
        $expected = $this->password($slug);
        if ($expected === null || ! hash_equals($expected, $password)) {
            return null;
        }

        $expires = CarbonImmutable::now()->addHours(self::TTL_HOURS);
        $token = Crypt::encryptString(json_encode([
            'slug' => $slug,
            'exp' => $expires->getTimestamp(),
            'key' => $this->fingerprint($expected),
        ]));

        return ['token' => $token, 'expires_at' => $expires->toIso8601String()];
    }

    public function check(string $slug, ?string $token): bool
    {
        $expected = $this->password($slug);
        if ($expected === null || ! $token) {
            return false;
        }
        try {
            $data = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return false;
        }

        return is_array($data)
            && ($data['slug'] ?? null) === $slug
            && ($data['exp'] ?? 0) > CarbonImmutable::now()->getTimestamp()
            && hash_equals($this->fingerprint($expected), (string) ($data['key'] ?? ''));
    }

    private function fingerprint(string $password): string
    {
        return substr(hash_hmac('sha256', $password, (string) config('app.key')), 0, 24);
    }
}
