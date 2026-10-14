<?php

namespace App\Services\Design;

use App\Services\Layout\LayoutReader;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Throwable;

/**
 * Cómo se leen los valores que escribe una persona (en el CSV, en Excel o en el editor).
 * Las reglas son las mismas del Excel de siempre (EventConfigBuilder): así una invitación
 * migrada da exactamente el mismo config.
 */
final class Normalizer
{
    public const HEX = '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i';

    /** Enlace de "Compartir" de Spotify (con o sin /intl-es/) o URI de la app. */
    public const SPOTIFY_LINK = '~^(https?://open\.spotify\.com/(intl-[a-z]{2}(-[a-z]{2})?/)?(embed/)?|spotify:)(playlist|album|track|artist|episode|show)[/:][A-Za-z0-9]+~i';

    /** Familia de Google Fonts: letras, números y espacios (va dentro de CSS y de una URL). */
    public const FONT_FAMILY = '/^[A-Za-z0-9][A-Za-z0-9 ]{1,59}$/';

    /** "Zona horaria" → "zona_horaria". */
    public static function key(string $text): string
    {
        return LayoutReader::key($text);
    }

    public static function yes(string $value): bool
    {
        return in_array(self::key($value), ['si', 's', 'x', 'yes', 'true', '1'], true);
    }

    /** "reveal parallax" / "reveal, parallax" / "reveal|parallax" → lista. */
    public static function splitList(string $value): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[\s,;|]+/', $value) ?: [])));
    }

    /** "17:00", "5:00 pm", "5 pm" → "17:00"; null si no es una hora. */
    public static function time(string $value): ?string
    {
        $v = strtolower(str_replace(['.', ' '], '', trim($value)));
        if (preg_match('/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/', $v, $m)) {
            $h = (int) $m[1];
            $min = (int) ($m[2] ?? 0);
            $suffix = $m[3] ?? '';
            if ($suffix === 'pm' && $h < 12) {
                $h += 12;
            }
            if ($suffix === 'am' && $h === 12) {
                $h = 0;
            }
            if ($h < 24 && $min < 60) {
                return sprintf('%02d:%02d', $h, $min);
            }
        }

        return null;
    }

    /** AAAA-MM-DD; null si no es una fecha. */
    public static function date(string $value): ?string
    {
        try {
            return CarbonImmutable::parse($value)->format('Y-m-d');
        } catch (Throwable) {
            return null;
        }
    }

    /** Fecha y hora en la zona del evento; null si no se entiende. */
    public static function dateTime(string $value, string $timezone): ?CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($value, $timezone)->setTimezone($timezone);
        } catch (Throwable) {
            return null;
        }
    }

    public static function timezone(string $value): bool
    {
        return in_array($value, timezone_identifiers_list(), true);
    }

    public static function isHex(string $value): bool
    {
        return (bool) preg_match(self::HEX, trim($value));
    }

    /** Un hex pasa tal cual (en mayúsculas); un nombre de la paleta ("lino", "superficie") se vuelve su token. */
    public static function colorRef(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (str_starts_with($value, '#')) {
            return strtoupper($value);
        }
        $key = self::key($value);

        return Catalog::COLORS[$key]['token'] ?? str_replace('_', '-', $key);
    }

    /** Nombre de la paleta en el CSV → token CSS ("primario_fuerte" → "primary-strong"). */
    public static function colorToken(string $name): string
    {
        $key = self::key($name);

        return Catalog::COLORS[$key]['token'] ?? str_replace('_', '-', $key);
    }

    /** "aparecer" → "reveal"; "cambio-de-color" → "color-shift"; uno desconocido pasa en kebab-case. */
    public static function effect(string $value): string
    {
        $key = self::key($value);
        $key = Catalog::EFFECT_ALIASES[$key] ?? $key;

        return Catalog::EFFECTS[$key]['effect'] ?? str_replace('_', '-', $key);
    }

    /** Un enlace web (http o https); nada de javascript: ni data:. */
    public static function isWebUrl(string $value): bool
    {
        return (bool) preg_match('~^https?://[^\s<>"]+$~i', trim($value));
    }

    /**
     * Id de una sección: "Itinerario" → "itinerario"; "Frase-2" → "frase-2"; "sobre" →
     * "portada" (alias). "frase-1" es la primera, así que queda "frase".
     */
    public static function sectionId(string $text): string
    {
        $raw = Str::lower(Str::ascii(trim($text)));
        $number = null;
        if (preg_match('/^(.+?)\s*-\s*(\d+)$/', $raw, $m)) {
            $raw = $m[1];
            $number = (int) $m[2];
        }
        $kind = Catalog::canonicalKind(self::key($raw));
        if ($kind === '') {
            return '';
        }

        return $number !== null && $number > 1 ? "{$kind}-{$number}" : $kind;
    }

    /** Valor de una celda: sin espacios a los lados y con saltos de línea "\n". */
    public static function value(string $value): string
    {
        return trim(str_replace(["\r\n", "\r"], "\n", $value));
    }
}
