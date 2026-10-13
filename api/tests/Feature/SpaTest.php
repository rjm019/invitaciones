<?php

namespace Tests\Feature;

use Tests\TestCase;

class SpaTest extends TestCase
{
    private string $spa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->spa = storage_path('framework/testing/app-'.bin2hex(random_bytes(4)).'.html');
        @mkdir(dirname($this->spa), 0775, true);
        file_put_contents($this->spa, '<!DOCTYPE html><title>Invitación</title><div id="app"></div>');
        config(['invitaciones.spa_path' => $this->spa]);
        $this->beforeApplicationDestroyed(fn () => @unlink($this->spa));
    }

    public function test_every_page_of_the_invitation_returns_the_spa(): void
    {
        foreach (['/', '/e/natasha', '/i/Abc123Def456', '/panel/natasha'] as $path) {
            $response = $this->get($path)->assertOk()->assertHeader('Cache-Control', 'no-cache, public');
            $this->assertSame($this->spa, $response->baseResponse->getFile()->getPathname());
        }
    }

    public function test_unknown_api_routes_stay_a_json_404(): void
    {
        $this->getJson('/api/no-existe')->assertNotFound()->assertJsonStructure(['message']);
        $this->get('/api')->assertNotFound();
    }

    public function test_without_a_compiled_spa_pages_are_not_found(): void
    {
        config(['invitaciones.spa_path' => storage_path('framework/testing/no-existe.html')]);
        $this->get('/e/natasha')->assertNotFound();
    }

    public function test_health_check_answers(): void
    {
        $this->get('/up')->assertOk();
    }
}
