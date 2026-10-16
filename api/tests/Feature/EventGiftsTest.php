<?php

namespace Tests\Feature;

use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventGiftsTest extends TestCase
{
    use CopiesEventFixtures;

    private const CLABE = '012180001234567891';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        foreach ([
            'mesa_regalos,,visible,SI',
            'mesa_regalos,,titulo,Mesa de regalos',
            'mesa_regalos,1,tienda,liverpool',
            'mesa_regalos,1,numero_evento,51234567',
            'mesa_regalos,1,enlace,https://mesaderegalos.liverpool.com.mx/milistaderegalos/51234567',
            'mesa_regalos,2,tienda,Amazon',
            'mesa_regalos,2,nota,Ver lista de deseos',
            'mesa_regalos,2,enlace,https://www.amazon.com.mx/wedding/share/ana',
            'mesa_regalos,3,tienda,otra',
            'mesa_regalos,3,nombre,Tienda del barrio',
            'mesa_regalos,4,tienda,,',
            'mesa_regalos,,sobres_texto,Si prefieres darnos un sobre:',
            'mesa_regalos,,banco,BBVA',
            'mesa_regalos,,cuenta,0121 8000 1234 5678 91',
            'mesa_regalos,,titular,Ana Pérez',
            'mesa_regalos,,sobre_fisico,SI',
        ] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }
    }

    public function test_the_stores_and_the_envelope_shower_reach_the_invitation(): void
    {
        $event = $this->getJson('/api/public/invitations/NuevaToken01')->assertOk()->json('event');

        $this->assertContains('gifts', array_column($event['sections'], 'type'));
        $this->assertSame([
            ['store' => 'liverpool', 'name' => 'Liverpool', 'note' => '', 'url' => 'https://mesaderegalos.liverpool.com.mx/milistaderegalos/51234567', 'event_number' => '51234567'],
            ['store' => 'amazon', 'name' => 'Amazon', 'note' => 'Ver lista de deseos', 'url' => 'https://www.amazon.com.mx/wedding/share/ana', 'event_number' => ''],
            ['store' => 'other', 'name' => 'Tienda del barrio', 'note' => '', 'url' => '', 'event_number' => ''],
        ], $event['gifts']['stores']);
        // Con su enlace personal, los datos completos (la cuenta, sin espacios).
        $this->assertSame([
            'title' => '',
            'text' => 'Si prefieres darnos un sobre:',
            'bank' => 'BBVA',
            'account' => self::CLABE,
            'holder' => 'Ana Pérez',
            'box' => true,
            'hidden' => false,
            'private' => true,
        ], $event['gifts']['envelope']);
    }

    public function test_the_general_link_never_carries_the_bank_details(): void
    {
        $response = $this->getJson('/api/public/events/nueva')->assertOk();

        $envelope = $response->json('event.gifts.envelope');
        $this->assertSame(['bank' => '', 'account' => '', 'holder' => '', 'hidden' => true], [
            'bank' => $envelope['bank'],
            'account' => $envelope['account'],
            'holder' => $envelope['holder'],
            'hidden' => $envelope['hidden'],
        ]);
        // El resto de la lluvia de sobres sí se ve.
        $this->assertSame('Si prefieres darnos un sobre:', $envelope['text']);
        $this->assertTrue($envelope['box']);
        $this->assertStringNotContainsString(self::CLABE, $response->getContent());
        $this->assertStringNotContainsString('Ana Pérez', $response->getContent());
    }

    public function test_nor_does_the_event_page_that_already_carries_the_event(): void
    {
        $spa = storage_path('framework/testing/app-'.bin2hex(random_bytes(4)).'.html');
        @mkdir(dirname($spa), 0775, true);
        file_put_contents($spa, '<!DOCTYPE html><html><head><title>Invitación</title></head><body><div id="app"></div></body></html>');
        config(['invitaciones.spa_path' => $spa]);
        $this->beforeApplicationDestroyed(fn () => @unlink($spa));

        $page = $this->get('/e/nueva')->assertOk();
        $this->assertStringNotContainsString(self::CLABE, (string) $page->getContent());
        $this->assertTrue($this->boot($page)['data']['event']['gifts']['envelope']['hidden']);

        // La invitación personal ya precargada sí los trae.
        $this->assertStringContainsString(self::CLABE, (string) $this->get('/i/NuevaToken01')->getContent());
    }

    public function test_with_solo_con_enlace_off_the_general_link_shows_them(): void
    {
        $this->appendLine('nueva', 'invitacion.csv', 'mesa_regalos,,solo_con_enlace,NO');

        $this->getJson('/api/public/events/nueva')
            ->assertOk()
            ->assertJsonPath('event.gifts.envelope.account', self::CLABE)
            ->assertJsonPath('event.gifts.envelope.hidden', false);
    }

    public function test_a_store_link_that_is_not_a_web_address_is_reported(): void
    {
        $this->appendLine('nueva', 'invitacion.csv', 'mesa_regalos,5,tienda,sears');
        $this->appendLine('nueva', 'invitacion.csv', 'mesa_regalos,5,enlace,javascript:alert(1)');

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');
        $this->assertStringContainsString('enlace', json_encode($errors, JSON_UNESCAPED_UNICODE));
    }

    public function test_without_the_section_there_are_no_gifts(): void
    {
        $this->copyEventFixtures();

        $this->assertNull($this->getJson('/api/public/events/nueva')->assertOk()->json('event.gifts'));
    }

    /** @return array<string, mixed>|null */
    private function boot(TestResponse $response): ?array
    {
        if (! preg_match('#<script>window\.__BOOT__=(.*?)</script></head>#s', (string) $response->getContent(), $m)) {
            return null;
        }

        return json_decode($m[1], true, flags: JSON_THROW_ON_ERROR);
    }
}
