<?php

namespace App\Services\Weather;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use UnexpectedValueException;

/**
 * Cliente mínimo de Open-Meteo (open-meteo.com): pronóstico de hasta 16 días, histórico
 * diario/por hora y búsqueda de ciudades. Lanza una excepción si el servicio falla o
 * responde algo inesperado; quien lo usa decide qué mostrar entonces.
 */
class OpenMeteo
{
    /** Días que cubre el pronóstico (hoy incluido). */
    public const FORECAST_DAYS = 16;

    private const TIMEOUT = 8;

    /**
     * Un solo día: resumen diario + cada hora.
     *
     * @return array{daily: array<string, list<mixed>>, hourly: array<string, list<mixed>>}
     */
    public function forecast(float $lat, float $lon, string $timezone, string $date): array
    {
        $json = $this->get('forecast_url', [
            'latitude' => $lat,
            'longitude' => $lon,
            'timezone' => $timezone,
            'start_date' => $date,
            'end_date' => $date,
            'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            'hourly' => 'temperature_2m,weather_code,precipitation_probability,is_day',
        ]);

        return ['daily' => $this->series($json, 'daily'), 'hourly' => $this->series($json, 'hourly')];
    }

    /**
     * Histórico de varias ventanas cortas (una por año), pedidas al mismo tiempo.
     *
     * @param  list<array{0: string, 1: string}>  $windows  [inicio, fin] en AAAA-MM-DD
     * @return list<array{daily: array<string, list<mixed>>, hourly: array<string, list<mixed>>}>
     */
    public function history(float $lat, float $lon, string $timezone, array $windows): array
    {
        $url = config('services.open_meteo.archive_url');
        $responses = Http::pool(fn (Pool $pool) => array_map(
            fn (array $w) => $pool->timeout(self::TIMEOUT * 2)->acceptJson()->get($url, $this->withKey([
                'latitude' => $lat,
                'longitude' => $lon,
                'timezone' => $timezone,
                'start_date' => $w[0],
                'end_date' => $w[1],
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
                'hourly' => 'temperature_2m,is_day',
            ])),
            $windows,
        ));

        return array_map(function ($response) {
            $json = $this->json($response);

            return ['daily' => $this->series($json, 'daily'), 'hourly' => $this->series($json, 'hourly')];
        }, $responses);
    }

    /** @return list<array<string, mixed>> resultados de la búsqueda, el más relevante primero */
    public function searchPlace(string $name): array
    {
        $json = $this->get('geocoding_url', ['name' => $name, 'count' => 10, 'language' => 'es', 'format' => 'json']);

        return array_values(array_filter($json['results'] ?? [], 'is_array'));
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private function get(string $endpoint, array $query): array
    {
        return $this->json(
            Http::timeout(self::TIMEOUT)->acceptJson()->get(config("services.open_meteo.{$endpoint}"), $this->withKey($query))
        );
    }

    /** @return array<string, mixed> */
    private function json(mixed $response): array
    {
        if (! $response instanceof Response) {
            // En un pool, una conexión caída llega como excepción en lugar de respuesta.
            throw new UnexpectedValueException('Open-Meteo no respondió');
        }
        $json = $response->throw()->json();
        if (! is_array($json) || ($json['error'] ?? false)) {
            throw new UnexpectedValueException('Open-Meteo: '.($json['reason'] ?? 'respuesta inesperada'));
        }

        return $json;
    }

    /**
     * @param  array<string, mixed>  $json
     * @return array<string, list<mixed>>
     */
    private function series(array $json, string $key): array
    {
        $series = $json[$key] ?? null;
        if (! is_array($series) || ! is_array($series['time'] ?? null)) {
            throw new UnexpectedValueException("Open-Meteo: falta '{$key}'");
        }

        return $series;
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private function withKey(array $query): array
    {
        $key = config('services.open_meteo.api_key');

        return $key ? [...$query, 'apikey' => $key] : $query;
    }
}
