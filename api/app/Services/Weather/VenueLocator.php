<?php

namespace App\Services\Weather;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Dónde pedir el clima: las coordenadas que el layout trae a mano (`clima_coordenadas`),
 * las que vengan dentro del enlace de Maps del salón o, si no hay, la ciudad del salón
 * (`salon_ciudad`, "Pachuca, Hidalgo") buscada en Open-Meteo. A nivel ciudad basta para
 * el pronóstico.
 */
class VenueLocator
{
    private const CACHE_DAYS = 30;

    public function __construct(private readonly OpenMeteo $api) {}

    /** @return array{lat: float, lon: float}|null */
    public function locate(string $coordinates, string $mapsUrl, string $city): ?array
    {
        return self::parse($coordinates) ?? self::fromMapsUrl($mapsUrl) ?? $this->geocode($city);
    }

    /** "20.1170, -98.7333" → coordenadas; cualquier otra cosa → null. */
    public static function parse(string $value): ?array
    {
        if (! preg_match('/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/', $value, $m)) {
            return null;
        }

        return self::point((float) $m[1], (float) $m[2]);
    }

    /** Coordenadas escritas dentro de un enlace de Google Maps (@lat,lon · q=lat,lon · !3dlat!4dlon). */
    public static function fromMapsUrl(string $url): ?array
    {
        $url = urldecode($url);
        $patterns = [
            '/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/',
            '/@(-?\d+\.\d+),(-?\d+\.\d+)/',
            '/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $m)) {
                return self::point((float) $m[1], (float) $m[2]);
            }
        }

        return null;
    }

    /**
     * "Pachuca, Hidalgo": busca "Pachuca" y prefiere el resultado cuyo estado o país
     * coincide con lo que va después de la coma.
     *
     * @return array{lat: float, lon: float}|null
     */
    private function geocode(string $city): ?array
    {
        $parts = array_values(array_filter(array_map('trim', explode(',', $city))));
        if ($parts === []) {
            return null;
        }

        $key = 'clima:lugar:'.md5(Str::lower(implode(',', $parts)));
        $found = Cache::get($key);
        if (is_array($found)) {
            return $found;
        }

        $hints = array_map(fn ($p) => Str::lower(Str::ascii($p)), array_slice($parts, 1));
        $results = $this->api->searchPlace($parts[0]);
        $match = null;
        foreach ($results as $place) {
            $where = Str::lower(Str::ascii(implode(' ', [$place['admin1'] ?? '', $place['admin2'] ?? '', $place['country'] ?? ''])));
            if ($hints === [] || array_filter($hints, fn ($h) => str_contains($where, $h)) !== []) {
                $match = $place;
                break;
            }
        }
        $match ??= $results[0] ?? null;

        $point = isset($match['latitude'], $match['longitude'])
            ? self::point((float) $match['latitude'], (float) $match['longitude'])
            : null;
        if ($point !== null) {
            Cache::put($key, $point, now()->addDays(self::CACHE_DAYS));
        }

        return $point;
    }

    /** @return array{lat: float, lon: float}|null */
    private static function point(float $lat, float $lon): ?array
    {
        return abs($lat) <= 90 && abs($lon) <= 180 ? ['lat' => $lat, 'lon' => $lon] : null;
    }
}
