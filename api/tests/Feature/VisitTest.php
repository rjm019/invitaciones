<?php

namespace Tests\Feature;

use App\Services\Csv\CsvFile;
use App\Services\Quotes\QuoteStore;
use App\Services\Visits\VisitLog;
use Carbon\CarbonImmutable;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class VisitTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    private const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

    private const INSTAGRAM = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0';

    private const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-17 12:30:00 America/Mexico_City');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /**
     * Como lo manda navigator.sendBeacon: el cuerpo es JSON pero llega como texto.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $headers
     */
    private function visit(array $data, string $ua = self::IPHONE, string $ip = '201.141.10.20', array $headers = []): TestResponse
    {
        return $this->call('POST', '/api/public/visits', [], [], [], array_merge([
            'CONTENT_TYPE' => 'text/plain;charset=UTF-8',
            'HTTP_USER_AGENT' => $ua,
            'REMOTE_ADDR' => $ip,
        ], array_combine(array_map(fn ($h) => 'HTTP_'.strtoupper(str_replace('-', '_', $h)), array_keys($headers)), $headers)), json_encode($data));
    }

    /** @return list<array<string, string>> */
    private function today(): array
    {
        return $this->readCsv('_gestor/visitas', '2026-10-17.csv');
    }

    public function test_a_landing_visit_is_saved_with_its_ip_device_and_origin(): void
    {
        $this->visit(['pagina' => '/invitaciones-digitales-boda', 'ref' => 'https://www.google.com.mx/search?q=invitaciones'])->assertNoContent();

        $rows = $this->today();
        $this->assertCount(1, $rows);
        $this->assertSame([
            'fecha' => '2026-10-17 12:30:00',
            'pagina' => '/invitaciones-digitales-boda',
            'tipo' => 'landing',
            'evento' => '',
            'origen' => 'Google',
            'referencia' => 'google.com.mx',
            'campana' => '',
            'dispositivo' => 'Celular',
            'sistema' => 'iOS',
            'navegador' => 'Safari',
            'ip' => '201.141.10.20',
        ], array_intersect_key($rows[0], array_flip(array_diff(VisitLog::HEADERS, ['visitante', 'equipo']))));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{16}$/', $rows[0]['visitante']);
        $this->assertSame('', $rows[0]['equipo']);
    }

    public function test_links_with_utm_tags_and_in_app_browsers_say_where_people_come_from(): void
    {
        $this->visit(['pagina' => '/', 'utm_source' => 'ig', 'utm_medium' => 'bio', 'utm_campaign' => 'Lanzamiento'])->assertNoContent();
        $this->visit(['pagina' => '/'], self::INSTAGRAM)->assertNoContent();
        $this->visit(['pagina' => '/'], self::MAC)->assertNoContent();
        $this->visit(['pagina' => '/', 'ref' => 'http://localhost/invitaciones-digitales-xv-anos'], self::MAC)->assertNoContent();
        $this->visit(['pagina' => '/', 'ref' => 'https://chatgpt.com/'], self::MAC)->assertNoContent();

        $rows = $this->today();
        $this->assertSame(['Instagram', 'Instagram', 'Directo', 'Dentro del sitio', 'ChatGPT'], array_column($rows, 'origen'));
        $this->assertSame('ig / bio / Lanzamiento', $rows[0]['campana']);
        $this->assertSame(['Celular', 'Android', 'Instagram'], [$rows[1]['dispositivo'], $rows[1]['sistema'], $rows[1]['navegador']]);
        $this->assertSame(['Computadora', 'macOS', 'Chrome'], [$rows[2]['dispositivo'], $rows[2]['sistema'], $rows[2]['navegador']]);
    }

    public function test_invitations_are_counted_by_event_and_the_token_is_never_saved(): void
    {
        $this->visit(['pagina' => '/e/prueba'])->assertNoContent();
        $this->visit(['pagina' => '/i/Fam1Token001', 'evento' => 'prueba'])->assertNoContent();
        $this->visit(['pagina' => '/i/DemoToken01', 'evento' => 'prueba', 'muestra' => true])->assertNoContent();

        $rows = $this->today();
        $this->assertSame([['/e/prueba', 'invitacion', 'prueba'], ['/i', 'personal', 'prueba'], ['/i', 'muestra', 'prueba']],
            array_map(fn ($r) => [$r['pagina'], $r['tipo'], $r['evento']], $rows));
        $this->assertStringNotContainsString('Fam1Token001', (string) file_get_contents("{$this->eventos}/_gestor/visitas/2026-10-17.csv"));
    }

    public function test_robots_unknown_events_and_odd_pages_are_not_saved(): void
    {
        $this->visit(['pagina' => '/'], 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')->assertNoContent();
        $this->visit(['pagina' => '/'], 'WhatsApp/2.24.1 A')->assertNoContent();
        $this->visit(['pagina' => '/'], '')->assertNoContent();
        $this->visit(['pagina' => '/e/no-existe'])->assertNoContent();
        $this->visit(['pagina' => '/i/AbC123', 'evento' => '../_gestor'])->assertNoContent();
        $this->visit(['pagina' => '/<script>'])->assertNoContent();
        $this->call('POST', '/api/public/visits', [], [], [], ['HTTP_USER_AGENT' => self::IPHONE], 'no es json')->assertNoContent();

        $this->assertFileDoesNotExist("{$this->eventos}/_gestor/visitas/2026-10-17.csv");
    }

    public function test_do_not_track_keeps_the_visit_without_the_ip(): void
    {
        $this->visit(['pagina' => '/'], headers: ['DNT' => '1'])->assertNoContent();
        $this->visit(['pagina' => '/'], headers: ['Sec-GPC' => '1'])->assertNoContent();

        $this->assertSame(['', ''], array_column($this->today(), 'ip'));
    }

    public function test_visits_are_throttled_per_ip(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->visit(['pagina' => '/'])->assertNoContent();
        }
        $this->visit(['pagina' => '/'])->assertTooManyRequests();
        $this->visit(['pagina' => '/'], ip: '201.141.10.21')->assertNoContent();
    }

    public function test_who_administers_sees_the_traffic_of_the_site(): void
    {
        $this->visit(['pagina' => '/', 'ref' => 'https://www.google.com/'])->assertNoContent();
        $this->visit(['pagina' => '/invitaciones-digitales-boda', 'ref' => 'https://invitaciones.test/'])->assertNoContent();
        $this->visit(['pagina' => '/'], self::MAC, '187.190.1.2')->assertNoContent();
        $this->visit(['pagina' => '/', 'equipo' => true], self::MAC, '10.0.0.1')->assertNoContent();
        $this->visit(['pagina' => '/e/prueba'], self::INSTAGRAM, '189.1.1.1')->assertNoContent();
        CarbonImmutable::setTestNow('2026-10-15 09:00:00 America/Mexico_City');
        $this->visit(['pagina' => '/'], self::MAC, '187.190.1.2')->assertNoContent();
        app(QuoteStore::class)->add(['nombre' => 'Valeria', 'telefono' => '+525512345678', 'tipo' => 'boda', 'fecha_evento' => '', 'idea' => '', 'pagina' => '/'], CarbonImmutable::now());
        CarbonImmutable::setTestNow('2026-10-17 12:30:00 America/Mexico_City');

        $stats = $this->asManager()->getJson('/api/manager/visits?dias=7')->assertOk()->json();
        $this->assertSame('2026-10-11', $stats['from']);
        $this->assertSame('2026-10-17', $stats['to']);
        $this->assertSame(['visits' => 4, 'visitors' => 2, 'team' => 1, 'quotes' => 1, 'conversion' => 50], $stats['totals']);
        $this->assertCount(7, $stats['days']);
        $this->assertSame(['date' => '2026-10-15', 'visits' => 1, 'visitors' => 1], $stats['days'][4]);
        $this->assertSame(['date' => '2026-10-17', 'visits' => 3, 'visitors' => 2], $stats['days'][6]);
        $this->assertSame(['label' => '/', 'visits' => 3, 'visitors' => 2], $stats['pages'][0]);
        $this->assertSame(['Directo', 'Google', 'invitaciones.test'], array_column($stats['origins'], 'label'));
        $this->assertSame('187.190.1.2', $stats['recent'][0]['ip']);
        $this->assertSame('2026-10-17T12:30:00-06:00', $stats['recent'][0]['at']);

        $invitations = $this->getJson('/api/manager/visits?dias=30&alcance=invitaciones')->assertOk()->json();
        $this->assertSame(1, $invitations['totals']['visits']);
        $this->assertNull($invitations['totals']['conversion']);
        $this->assertSame([['slug' => 'prueba', 'demo' => false, 'visits' => 1, 'visitors' => 1, 'general' => 1, 'personal' => 0]], $invitations['events']);
        $this->assertSame('Instagram', $invitations['origins'][0]['label']);

        $this->getJson('/api/manager/visits/count')->assertOk()->assertExactJson(['today' => 3]);
        $this->getJson('/api/manager/visits?dias=3')->assertUnprocessable()->assertJsonValidationErrors('dias');

        $csv = $this->get('/api/manager/visits/export?dias=7')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF".implode(',', VisitLog::HEADERS)."\r\n", $csv);
        $this->assertSame(7, substr_count($csv, "\r\n")); // encabezados + 6 visitas (con las del equipo)
    }

    public function test_only_who_administers_sees_the_traffic(): void
    {
        $this->getJson('/api/manager/visits')->assertUnauthorized();
        $this->asManager('beto', 'editor');
        $this->getJson('/api/manager/visits')->assertForbidden();
        $this->getJson('/api/manager/visits/count')->assertForbidden();
        $this->get('/api/manager/visits/export')->assertForbidden();
    }

    public function test_ips_are_forgotten_after_a_year(): void
    {
        $csv = new CsvFile;
        $dir = "{$this->eventos}/_gestor/visitas";
        mkdir($dir, 0775, true);
        $old = ['fecha' => '2025-10-10 10:00:00', 'pagina' => '/', 'tipo' => 'landing', 'ip' => '201.1.1.1', 'visitante' => 'abc'];
        $csv->write("{$dir}/2025-10-10.csv", VisitLog::HEADERS, [$old]);
        $csv->write("{$dir}/2025-10-20.csv", VisitLog::HEADERS, [['fecha' => '2025-10-20 10:00:00', 'ip' => '201.2.2.2'] + $old]);

        // La primera visita del día revisa los días que ya cumplieron un año.
        $this->visit(['pagina' => '/'])->assertNoContent();

        $this->assertSame([''], array_column($csv->read("{$dir}/2025-10-10.csv"), 'ip'));
        $this->assertSame(['abc'], array_column($csv->read("{$dir}/2025-10-10.csv"), 'visitante'));
        $this->assertSame(['201.2.2.2'], array_column($csv->read("{$dir}/2025-10-20.csv"), 'ip'));
        $this->assertSame("2025-10-17\n", file_get_contents("{$dir}/ip-borradas-hasta.txt"));
        $this->assertSame(0, app(VisitLog::class)->forgetOldIps(CarbonImmutable::now()));
    }
}
