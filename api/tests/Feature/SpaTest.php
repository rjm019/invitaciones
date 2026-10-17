<?php

namespace Tests\Feature;

use App\Services\Invitations\ResponseStore;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class SpaTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $spa = storage_path('framework/testing/app-'.bin2hex(random_bytes(4)).'.html');
        @mkdir(dirname($spa), 0775, true);
        file_put_contents($spa, '<!DOCTYPE html><html><head><title>Invitación</title></head><body><div id="app"></div></body></html>');
        config(['invitaciones.spa_path' => $spa]);
        $this->beforeApplicationDestroyed(fn () => @unlink($spa));
    }

    /** @return array<string, mixed>|null lo que la página trae en window.__BOOT__ */
    private function boot(TestResponse $response): ?array
    {
        if (! preg_match('#<script>window\.__BOOT__=(.*?)</script></head>#s', (string) $response->getContent(), $m)) {
            return null;
        }

        return json_decode($m[1], true, flags: JSON_THROW_ON_ERROR);
    }

    public function test_every_page_of_the_invitation_returns_the_spa(): void
    {
        foreach (['/', '/e/prueba', '/i/Fam1Token001', '/panel/prueba', '/e/no-existe'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertHeader('Cache-Control', 'no-cache, private')
                ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
                ->assertSee('<div id="app"></div>', false);
        }
    }

    public function test_an_address_outside_the_site_is_a_real_404(): void
    {
        foreach (['/no-existe', '/og/inicio.png', '/e/prueba/otra', '/i/', '/wp-login.php'] as $path) {
            $this->get($path)
                ->assertNotFound()
                ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
                ->assertSee('<div id="app"></div>', false);
        }
    }

    public function test_the_event_page_already_carries_the_event(): void
    {
        $boot = $this->boot($this->get('/e/prueba'));

        $this->assertSame('event', $boot['kind']);
        $this->assertSame('prueba', $boot['key']);
        $this->assertSame($this->getJson('/api/public/events/prueba')->json('event'), $boot['data']['event']);
    }

    public function test_a_personal_link_carries_its_invitation_and_counts_one_opening(): void
    {
        $boot = $this->boot($this->get('/i/Fam1Token001'));

        $this->assertSame('invitation', $boot['kind']);
        $this->assertSame('Familia Prueba', $boot['data']['invitation']['label']);
        $this->assertSame(3, $boot['data']['invitation']['passes']);
        $this->assertSame('prueba', $boot['data']['event']['slug']);
        $this->assertCount(1, $this->readCsv('prueba', ResponseStore::OPENS));
    }

    public function test_unknown_or_unpublished_pages_carry_nothing(): void
    {
        $this->assertNull($this->boot($this->get('/e/no-existe')));
        $this->assertNull($this->boot($this->get('/i/NoExiste0000')));
        $this->assertNull($this->boot($this->get('/panel/no-existe'))); // el de un evento real trae sus colores (PanelBrandTest)
    }

    public function test_layout_text_cannot_break_out_of_the_script(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'titulo,"</script><script>alert(1)</script>"');

        $response = $this->get('/e/prueba');

        $this->assertStringNotContainsString('<script>alert(1)', (string) $response->getContent());
        $this->assertSame('</script><script>alert(1)</script>', $this->boot($response)['data']['event']['title']);
    }

    public function test_unknown_api_routes_stay_a_json_404(): void
    {
        $this->getJson('/api/no-existe')->assertNotFound()->assertJsonStructure(['message']);
        $this->get('/api')->assertNotFound();
    }

    public function test_without_a_compiled_spa_pages_are_not_found(): void
    {
        config(['invitaciones.spa_path' => storage_path('framework/testing/no-existe.html')]);
        $this->get('/e/prueba')->assertNotFound();
    }

    public function test_health_check_answers(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_the_manager_pages_are_never_indexed_nor_framed_by_others(): void
    {
        foreach (['/gestor', '/gestor/vista-previa', '/gestor/nueva'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
                ->assertHeader('Content-Security-Policy', "frame-ancestors 'self'")
                ->assertSee('<div id="app"></div>', false);
        }
        $this->get('/e/prueba')->assertHeaderMissing('Content-Security-Policy');
    }

    public function test_pages_and_media_never_open_a_session_nor_set_cookies(): void
    {
        // Nada las usa: cada visita no escribe un archivo de sesión ni cifra cookies.
        foreach (['/e/prueba', '/gestor', '/panel/prueba', '/media/prueba/no-existe.webp'] as $path) {
            $response = $this->get($path);
            $this->assertSame([], $response->headers->getCookies(), $path);
        }
    }
}
