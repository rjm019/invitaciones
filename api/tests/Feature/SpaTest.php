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
        $this->assertNull($this->boot($this->get('/panel/prueba')));
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
}
