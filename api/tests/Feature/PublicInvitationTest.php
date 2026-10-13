<?php

namespace Tests\Feature;

use App\Services\Invitations\ResponseStore;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class PublicInvitationTest extends TestCase
{
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->writeInvitations('borrador', ['1' => ['Borrador0001', 2]]);
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_shows_the_event_and_one_input_per_guest(): void
    {
        $response = $this->getJson('/api/public/invitations/Fam1Token001')->assertOk();

        $this->assertSame('prueba', $response->json('event.slug'));
        $this->assertSame([
            'label' => 'Familia Prueba',
            'passes' => 3,
            'guests' => [],
            'remaining' => 3,
            'open' => true,
            'closed_message' => null,
            'deadline' => '2026-11-06',
            'dedication' => null,
        ], $response->json('invitation'));

        $response->assertJsonMissingPath('invitation.token')->assertJsonMissingPath('invitation.id');
    }

    public function test_names_already_sent_come_back_fixed_with_the_free_inputs(): void
    {
        $this->getJson('/api/public/invitations/Fam2Token002')
            ->assertOk()
            ->assertJsonPath('invitation.label', null)
            ->assertJsonPath('invitation.remaining', 1)
            ->assertJsonPath('invitation.guests', [[
                'slot' => 1,
                'full_name' => 'Persona Previa',
                'attending' => false,
                'responded_at' => '2026-10-01T10:00:00-06:00',
            ]]);
    }

    public function test_records_each_opening(): void
    {
        $this->getJson('/api/public/invitations/Fam1Token001')->assertOk();
        $this->getJson('/api/public/invitations/Fam1Token001')->assertOk();

        $opens = $this->readCsv('prueba', ResponseStore::OPENS);
        $this->assertCount(2, $opens);
        $this->assertSame(['fecha' => '2026-10-13 12:00:00', 'invitacion' => '1'], $opens[0]);
    }

    public function test_unknown_malformed_or_unpublished_tokens_are_not_found(): void
    {
        $this->getJson('/api/public/invitations/ZZZZZZZZZZZZ')->assertNotFound();
        $this->getJson('/api/public/invitations/abc')->assertNotFound();
        $this->getJson('/api/public/invitations/..%2Finvitaciones.csv')->assertNotFound();
        $this->getJson('/api/public/invitations/Borrador0001')->assertNotFound(); // evento sin publicar
    }
}
