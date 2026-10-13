<?php

namespace App\Services\Weather;

use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use UnexpectedValueException;

/**
 * Clima del día del evento, lo más actual posible:
 *
 * - **Pronóstico** cuando el día ya entra en los 16 días que cubre Open-Meteo. Se pide de
 *   nuevo cada 30 minutos (el modelo se actualiza cada hora).
 * - **Clima típico** mientras falta más: promedio de esa misma fecha (±3 días) en los
 *   últimos 10 años. Se guarda 30 días.
 *
 * Además del día completo trae la temperatura en las horas de la fiesta (inicio y cada 2 h,
 * hasta 6 h después). Si el servicio falla, responde lo último que obtuvo para esa fecha.
 */
class WeatherService
{
    /** Horas que dura la fiesta (igual que "Agregar a mi calendario"). */
    public const EVENT_HOURS = 6;

    public const TYPICAL_YEARS = 10;

    public const WINDOW_DAYS = 3;

    /** Un día cuenta como lluvioso desde 1 mm. */
    public const RAINY_MM = 1.0;

    private const FORECAST_MINUTES = 30;

    private const TYPICAL_DAYS = 30;

    private const LAST_GOOD_DAYS = 3;

    public function __construct(
        private readonly OpenMeteo $api,
        private readonly VenueLocator $locator,
        private readonly EventRepository $events,
    ) {}

    /**
     * @param  array<string, mixed>  $event  config público del evento
     * @return array<string, mixed>|null null si el evento ya pasó, no se sabe dónde es o el
     *                                   servicio falló sin una copia guardada
     */
    public function forEvent(string $slug, array $event, CarbonImmutable $now): ?array
    {
        if (empty($event['starts_at'])) {
            return null;
        }
        $timezone = $event['timezone'];
        $start = CarbonImmutable::parse($event['starts_at'])->setTimezone($timezone);
        $day = $start->startOfDay();
        $today = $now->setTimezone($timezone)->startOfDay();
        if ($day->lt($today)) {
            return null;
        }

        $date = $day->toDateString();
        $daysAhead = (int) $today->diffInDays($day);
        $isForecast = $daysAhead < OpenMeteo::FORECAST_DAYS;
        $hours = $this->eventHours($start);
        $lastGood = "clima:{$slug}:{$date}:ultimo";

        try {
            $point = $this->locator->locate(
                $this->events->eventValue($slug, 'clima_coordenadas') ?? '',
                (string) ($event['venue']['maps_url'] ?? ''),
                (string) ($event['venue']['city'] ?? ''),
            );
            if ($point === null) {
                return null;
            }

            $key = sprintf('clima:%s:%s:%s:%.4f,%.4f:%s', $slug, $isForecast ? 'pronostico' : 'tipico', $date, $point['lat'], $point['lon'], implode('-', $hours));
            $weather = Cache::remember(
                $key,
                $isForecast ? now()->addMinutes(self::FORECAST_MINUTES) : now()->addDays(self::TYPICAL_DAYS),
                function () use ($point, $timezone, $date, $day, $hours, $now, $lastGood, $isForecast) {
                    $fresh = $isForecast
                        ? $this->forecast($point, $timezone, $date, $hours, $now)
                        : $this->typical($point, $timezone, $day, $hours, $now);
                    Cache::put($lastGood, $fresh, now()->addDays(self::LAST_GOOD_DAYS));

                    return $fresh;
                },
            );
        } catch (ConnectionException|RequestException|UnexpectedValueException $e) {
            Log::warning("Clima de {$slug}: {$e->getMessage()}");
            $weather = Cache::get($lastGood);
        }

        if (! is_array($weather)) {
            return null;
        }

        return [
            ...$weather,
            'place' => ($event['venue']['city'] ?? '') ?: ($event['venue']['display_name'] ?? ''),
            'forecast_from' => $day->subDays(OpenMeteo::FORECAST_DAYS - 1)->toDateString(),
        ];
    }

    /**
     * @param  array{lat: float, lon: float}  $point
     * @param  list<string>  $hours
     * @return array<string, mixed>
     */
    private function forecast(array $point, string $timezone, string $date, array $hours, CarbonImmutable $now): array
    {
        $data = $this->api->forecast($point['lat'], $point['lon'], $timezone, $date);
        $daily = $data['daily'];
        $hourly = $data['hourly'];
        $index = array_flip($hourly['time']);

        $points = [];
        foreach ($hours as $hour) {
            $i = $index["{$date}T{$hour}"] ?? null;
            if ($i === null || ! is_numeric($hourly['temperature_2m'][$i] ?? null)) {
                continue;
            }
            $points[] = [
                'time' => $hour,
                'temp' => round((float) $hourly['temperature_2m'][$i], 1),
                'code' => $this->int($hourly['weather_code'][$i] ?? null),
                'rain_chance' => $this->int($hourly['precipitation_probability'][$i] ?? null),
                'is_day' => (bool) ($hourly['is_day'][$i] ?? true),
            ];
        }

        $max = $daily['temperature_2m_max'][0] ?? null;
        $min = $daily['temperature_2m_min'][0] ?? null;
        if (! is_numeric($max) || ! is_numeric($min)) {
            throw new UnexpectedValueException('Open-Meteo: el pronóstico no trae temperaturas');
        }

        return [
            'kind' => 'forecast',
            'date' => $date,
            'day' => [
                'code' => $this->int($daily['weather_code'][0] ?? null),
                'max' => round((float) $max, 1),
                'min' => round((float) $min, 1),
                'rain_chance' => $this->int($daily['precipitation_probability_max'][0] ?? null),
            ],
            'hours' => $points,
            'years' => null,
            'updated_at' => $now->setTimezone($timezone)->toIso8601String(),
        ];
    }

    /**
     * La misma fecha (±3 días) en cada uno de los últimos 10 años.
     *
     * @param  array{lat: float, lon: float}  $point
     * @param  list<string>  $hours
     * @return array<string, mixed>
     */
    private function typical(array $point, string $timezone, CarbonImmutable $day, array $hours, CarbonImmutable $now): array
    {
        $years = range($day->year - self::TYPICAL_YEARS, $day->year - 1);
        $windows = array_map(function (int $year) use ($day) {
            $center = $day->setDate($year, $day->month, $day->day);

            return [$center->subDays(self::WINDOW_DAYS)->toDateString(), $center->addDays(self::WINDOW_DAYS)->toDateString()];
        }, $years);

        $max = $min = $codes = [];
        $rainy = 0;
        $temps = array_fill_keys($hours, []);
        $nights = array_fill_keys($hours, []);
        foreach ($this->api->history($point['lat'], $point['lon'], $timezone, $windows) as $data) {
            $daily = $data['daily'];
            foreach (array_keys($daily['time']) as $i) {
                if (! is_numeric($daily['temperature_2m_max'][$i] ?? null) || ! is_numeric($daily['temperature_2m_min'][$i] ?? null)) {
                    continue;
                }
                $max[] = (float) $daily['temperature_2m_max'][$i];
                $min[] = (float) $daily['temperature_2m_min'][$i];
                $rainy += (float) ($daily['precipitation_sum'][$i] ?? 0) >= self::RAINY_MM ? 1 : 0;
                if (is_numeric($daily['weather_code'][$i] ?? null)) {
                    $codes[] = (int) $daily['weather_code'][$i];
                }
            }
            $hourly = $data['hourly'];
            foreach ($hourly['time'] as $i => $time) {
                $hour = substr((string) $time, 11, 5);
                if (isset($temps[$hour]) && is_numeric($hourly['temperature_2m'][$i] ?? null)) {
                    $temps[$hour][] = (float) $hourly['temperature_2m'][$i];
                    $nights[$hour][] = ! ($hourly['is_day'][$i] ?? 1);
                }
            }
        }
        if ($max === []) {
            throw new UnexpectedValueException('Open-Meteo: no hay histórico para esa fecha');
        }

        $points = [];
        foreach ($temps as $hour => $values) {
            if ($values !== []) {
                $points[] = [
                    'time' => $hour,
                    'temp' => $this->avg($values),
                    'code' => null,
                    'rain_chance' => null,
                    'is_day' => count(array_filter($nights[$hour])) * 2 < count($nights[$hour]),
                ];
            }
        }
        $counts = array_count_values($codes);
        arsort($counts);

        return [
            'kind' => 'typical',
            'date' => $day->toDateString(),
            'day' => [
                'code' => $counts === [] ? null : (int) array_key_first($counts),
                'max' => $this->avg($max),
                'min' => $this->avg($min),
                'rain_chance' => (int) round(100 * $rainy / count($max)),
            ],
            'hours' => $points,
            'years' => [$years[0], end($years)],
            'updated_at' => $now->setTimezone($timezone)->toIso8601String(),
        ];
    }

    /**
     * Inicio de la fiesta y cada 2 horas, sin pasar de medianoche: 17:00 → 17, 19, 21, 23.
     *
     * @return list<string>
     */
    private function eventHours(CarbonImmutable $start): array
    {
        $hours = [];
        for ($h = 0; $h <= self::EVENT_HOURS; $h += 2) {
            $at = $start->startOfHour()->addHours($h);
            if ($at->isSameDay($start)) {
                $hours[] = $at->format('H:00');
            }
        }

        return $hours;
    }

    /** @param  list<float>  $values */
    private function avg(array $values): float
    {
        return round(array_sum($values) / count($values), 1);
    }

    private function int(mixed $value): ?int
    {
        return is_numeric($value) ? (int) round((float) $value) : null;
    }
}
