<?php

namespace Tests\Feature;

use App\Services\Weather\VenueLocator;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class WeatherTest extends TestCase
{
    use CopiesEventFixtures;

    /** Open-Meteo deja de responder (500) cuando se prende. */
    private bool $down = false;

    /** Cuántas veces responde 429 ("demasiadas a la vez") el histórico antes de contestar. */
    private int $throttled = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->appendLine('prueba', 'evento.csv', 'salon_ciudad,"Pachuca, Hidalgo"');
        $this->fakeOpenMeteo();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_while_the_forecast_does_not_reach_the_date_it_shows_the_typical_weather(): void
    {
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');

        $weather = $this->getJson('/api/public/events/prueba/weather')->assertOk()->json('weather');

        $this->assertSame('typical', $weather['kind']);
        $this->assertSame('2026-11-28', $weather['date']);
        $this->assertSame('Pachuca, Hidalgo', $weather['place']);
        $this->assertSame('2026-11-13', $weather['forecast_from']);
        $this->assertSame([2016, 2025], $weather['years']);
        // Máxima promedio de 10 años (20.0 … 21.8), mínima fija, 1 de cada 7 días con lluvia.
        $this->assertEquals(['code' => 3, 'max' => 20.9, 'min' => 6.0, 'rain_chance' => 14], $weather['day']);
        $this->assertSame(['17:00', '19:00', '21:00', '23:00'], array_column($weather['hours'], 'time'));
        $this->assertEquals([8.0, 6.0, 4.0, 2.0], array_column($weather['hours'], 'temp'));
        $this->assertSame([true, false, false, false], array_column($weather['hours'], 'is_day'));

        // Una ventana de ±3 días por año, en la ciudad que coincide con "Hidalgo".
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'archive') && $this->queryOf($r)['start_date'] === '2016-11-25' && $this->queryOf($r)['end_date'] === '2016-12-01');
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'archive') && $this->queryOf($r)['latitude'] === '20.117');
        Http::assertSentCount(1 + 10);

        // La segunda visita sale de la caché.
        $this->getJson('/api/public/events/prueba/weather')->assertOk();
        Http::assertSentCount(1 + 10);
    }

    public function test_the_history_is_asked_one_year_at_a_time_and_retried_when_open_meteo_is_busy(): void
    {
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
        Sleep::fake();
        $this->throttled = 2;

        $this->getJson('/api/public/events/prueba/weather')->assertOk()->assertJsonPath('weather.kind', 'typical');

        Http::assertSentCount(1 + 10 + 2); // lugar + 10 años + 2 reintentos
        Sleep::assertSleptTimes(2);
    }

    public function test_from_16_days_before_it_shows_the_forecast_and_refreshes_it_every_half_hour(): void
    {
        CarbonImmutable::setTestNow('2026-11-12 23:00:00 America/Mexico_City');
        $this->getJson('/api/public/events/prueba/weather')->assertJsonPath('weather.kind', 'typical');

        CarbonImmutable::setTestNow('2026-11-13 10:00:00 America/Mexico_City');
        $weather = $this->getJson('/api/public/events/prueba/weather')->assertOk()->json('weather');

        $this->assertSame('forecast', $weather['kind']);
        $this->assertNull($weather['years']);
        $this->assertSame('2026-11-13T10:00:00-06:00', $weather['updated_at']);
        $this->assertEquals(['code' => 3, 'max' => 21.4, 'min' => 7.6, 'rain_chance' => 35], $weather['day']);
        $this->assertEquals([
            ['time' => '17:00', 'temp' => 13.0, 'code' => 2, 'rain_chance' => 17, 'is_day' => true],
            ['time' => '19:00', 'temp' => 11.0, 'code' => 2, 'rain_chance' => 19, 'is_day' => false],
            ['time' => '21:00', 'temp' => 9.0, 'code' => 2, 'rain_chance' => 21, 'is_day' => false],
            ['time' => '23:00', 'temp' => 7.0, 'code' => 2, 'rain_chance' => 23, 'is_day' => false],
        ], $weather['hours']);
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'forecast') && $this->queryOf($r)['start_date'] === '2026-11-28' && $this->queryOf($r)['timezone'] === 'America/Mexico_City');

        $forecasts = fn () => count(array_filter(Http::recorded()->all(), fn ($pair) => str_contains($pair[0]->url(), 'forecast')));
        CarbonImmutable::setTestNow('2026-11-13 10:20:00 America/Mexico_City');
        $this->getJson('/api/public/events/prueba/weather')->assertJsonPath('weather.updated_at', '2026-11-13T10:00:00-06:00');
        $this->assertSame(1, $forecasts());

        CarbonImmutable::setTestNow('2026-11-13 10:31:00 America/Mexico_City');
        $this->getJson('/api/public/events/prueba/weather')->assertJsonPath('weather.updated_at', '2026-11-13T10:31:00-06:00');
        $this->assertSame(2, $forecasts());
    }

    public function test_coordinates_in_the_layout_win_over_the_city(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'clima_coordenadas,"19.4326, -99.1332"');
        CarbonImmutable::setTestNow('2026-11-20 12:00:00 America/Mexico_City');

        $this->getJson('/api/public/events/prueba/weather')->assertJsonPath('weather.kind', 'forecast');

        Http::assertSent(fn (Request $r) => $this->queryOf($r)['latitude'] === '19.4326' && $this->queryOf($r)['longitude'] === '-99.1332');
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), 'geocoding'));
    }

    public function test_if_open_meteo_fails_it_keeps_the_last_answer(): void
    {
        CarbonImmutable::setTestNow('2026-11-13 10:00:00 America/Mexico_City');
        $this->getJson('/api/public/events/prueba/weather')->assertJsonPath('weather.kind', 'forecast');

        $this->down = true;
        CarbonImmutable::setTestNow('2026-11-13 11:00:00 America/Mexico_City');
        $this->getJson('/api/public/events/prueba/weather')
            ->assertOk()
            ->assertJsonPath('weather.kind', 'forecast')
            ->assertJsonPath('weather.updated_at', '2026-11-13T10:00:00-06:00');
    }

    public function test_without_a_saved_answer_a_failure_hides_the_weather(): void
    {
        $this->down = true;
        CarbonImmutable::setTestNow('2026-11-13 10:00:00 America/Mexico_City');

        $this->getJson('/api/public/events/prueba/weather')->assertOk()->assertJsonPath('weather', null);
    }

    public function test_after_the_event_there_is_no_weather(): void
    {
        CarbonImmutable::setTestNow('2026-11-29 09:00:00 America/Mexico_City');

        $this->getJson('/api/public/events/prueba/weather')->assertOk()->assertJsonPath('weather', null);
        Http::assertNothingSent();
    }

    public function test_unknown_or_unpublished_event_is_not_found(): void
    {
        $this->getJson('/api/public/events/no-existe/weather')->assertNotFound();
        $this->getJson('/api/public/events/borrador/weather')->assertNotFound();
    }

    public function test_reads_coordinates_from_the_layout_or_a_maps_link(): void
    {
        $this->assertSame(['lat' => 20.117, 'lon' => -98.7333], VenueLocator::parse('20.117, -98.7333'));
        $this->assertSame(['lat' => 20.117, 'lon' => -98.7333], VenueLocator::parse('20.117 -98.7333'));
        $this->assertNull(VenueLocator::parse('Pachuca'));
        $this->assertNull(VenueLocator::parse('120, 10'));

        $this->assertSame(['lat' => 20.0703, 'lon' => -98.7387], VenueLocator::fromMapsUrl('https://www.google.com/maps/place/Salon/@20.0703,-98.7387,17z'));
        $this->assertSame(['lat' => 20.0711, 'lon' => -98.7391], VenueLocator::fromMapsUrl('https://www.google.com/maps/place/Salon/@20.07,-98.73,17z/data=!3m1!4b1!4m6!3m5!3d20.0711!4d-98.7391'));
        $this->assertSame(['lat' => 20.0703, 'lon' => -98.7387], VenueLocator::fromMapsUrl('https://maps.google.com/?q=20.0703,-98.7387'));
        $this->assertNull(VenueLocator::fromMapsUrl('https://maps.app.goo.gl/AbCdEf123'));
    }

    public function test_the_layout_says_what_is_wrong_with_the_weather_settings(): void
    {
        config(['app.debug' => true]);
        $this->appendLine('prueba', 'evento.csv', 'clima_coordenadas,Pachuca');

        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');
        $this->assertStringContainsString('evento → clima_coordenadas', $errors[0]);
    }

    public function test_the_weather_section_needs_to_know_where_the_venue_is(): void
    {
        config(['app.debug' => true]);
        $this->appendLine('prueba', 'secciones.csv', '4,clima,El clima,,,,,SI,mitad,');

        $this->getJson('/api/public/events/prueba')->assertOk()->assertJsonPath('event.sections.3.type', 'weather');

        // Sin ciudad, coordenadas ni enlace de Maps con coordenadas, el layout lo avisa.
        $evento = "{$this->eventos}/prueba/evento.csv";
        file_put_contents($evento, str_replace('salon_ciudad,"Pachuca, Hidalgo"', '', (string) file_get_contents($evento)));
        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');
        $this->assertStringContainsString('secciones → clima', $errors[0]);
    }

    /** @return array<string, string> */
    private function queryOf(Request $request): array
    {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return $query;
    }

    /**
     * Respuestas con la forma real de Open-Meteo:
     * - Búsqueda: primero un "Pachuca" de Veracruz y luego el de Hidalgo.
     * - Pronóstico: a las h horas hace 30 - h grados, código 2 y h % de lluvia.
     * - Histórico: máxima 20 + 0.2 por año desde 2016, mínima 6, lluvia solo en el día central,
     *   y a las h horas 25 - h grados.
     */
    private function fakeOpenMeteo(): void
    {
        Http::fake(function (Request $request) {
            if ($this->down) {
                return Http::response(['error' => true, 'reason' => 'caído'], 500);
            }
            $q = $this->queryOf($request);

            if (str_contains($request->url(), 'geocoding')) {
                return Http::response(['results' => [
                    ['name' => 'Pachuca', 'latitude' => 18.41306, 'longitude' => -95.84889, 'admin1' => 'Estado de Veracruz-Llave', 'country' => 'México'],
                    ['name' => 'Pachuca', 'latitude' => 20.117, 'longitude' => -98.7333, 'admin1' => 'Estado de Hidalgo', 'country' => 'México'],
                ]]);
            }

            if (str_contains($request->url(), 'forecast')) {
                $date = $q['start_date'];
                $hours = range(0, 23);

                return Http::response([
                    'daily' => [
                        'time' => [$date],
                        'weather_code' => [3],
                        'temperature_2m_max' => [21.4],
                        'temperature_2m_min' => [7.6],
                        'precipitation_probability_max' => [35],
                    ],
                    'hourly' => [
                        'time' => array_map(fn ($h) => sprintf('%sT%02d:00', $date, $h), $hours),
                        'temperature_2m' => array_map(fn ($h) => 30 - $h, $hours),
                        'weather_code' => array_fill(0, 24, 2),
                        'precipitation_probability' => $hours,
                        'is_day' => array_map(fn ($h) => $h >= 7 && $h < 18 ? 1 : 0, $hours),
                    ],
                ]);
            }

            if ($this->throttled > 0) {
                $this->throttled--;

                return Http::response(['error' => true, 'reason' => 'Too many concurrent requests'], 429);
            }

            // Histórico: 7 días.
            $start = CarbonImmutable::parse($q['start_date']);
            $days = array_map(fn ($i) => $start->addDays($i), range(0, 6));
            $times = $temps = $isDay = [];
            foreach ($days as $day) {
                foreach (range(0, 23) as $h) {
                    $times[] = sprintf('%sT%02d:00', $day->toDateString(), $h);
                    $temps[] = 25 - $h;
                    $isDay[] = $h >= 7 && $h < 18 ? 1 : 0;
                }
            }

            return Http::response([
                'daily' => [
                    'time' => array_map(fn ($d) => $d->toDateString(), $days),
                    'weather_code' => [3, 3, 3, 61, 3, 3, 3],
                    'temperature_2m_max' => array_fill(0, 7, 20 + 0.2 * ($start->year - 2016)),
                    'temperature_2m_min' => array_fill(0, 7, 6.0),
                    'precipitation_sum' => [0, 0, 0, 5.0, 0, 0.4, 0],
                ],
                'hourly' => ['time' => $times, 'temperature_2m' => $temps, 'is_day' => $isDay],
            ]);
        });
    }
}
