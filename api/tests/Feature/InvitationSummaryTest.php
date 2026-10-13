<?php

namespace Tests\Feature;

use App\Console\Commands\InvitationSummary;
use App\Services\Invitations\WhatsAppLink;
use Carbon\CarbonImmutable;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class InvitationSummaryTest extends TestCase
{
    use CopiesEventFixtures;

    public function test_prints_the_totals_and_writes_one_row_per_invitation(): void
    {
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
        $this->postJson('/api/public/invitations/Fam1Token001/rsvp', [
            'attending' => true,
            'guests' => [['full_name' => 'Ana Prueba'], ['full_name' => 'Luis Prueba']],
        ])->assertOk();

        $this->artisan('invitaciones:resumen', ['slug' => 'prueba'])
            ->expectsOutputToContain('Asistirán')
            ->assertSuccessful();

        $rows = array_column($this->readCsv('prueba', InvitationSummary::FILE), null, 'invitacion');
        $this->assertSame(['3', '2', '0', '1', 'Ana Prueba; Luis Prueba'], [
            $rows['1']['invitados'], $rows['1']['asistiran'], $rows['1']['no_asistiran'], $rows['1']['sin_llenar'], $rows['1']['nombres'],
        ]);
        $this->assertSame(['1', '1'], [$rows['2']['no_asistiran'], $rows['2']['sin_llenar']]);
        CarbonImmutable::setTestNow();
    }

    public function test_whatsapp_links(): void
    {
        $this->assertSame('525512345678', WhatsAppLink::phone('55 1234 5678'));
        $this->assertSame('525512345678', WhatsAppLink::phone('+52 1 55 1234 5678'));
        $this->assertSame('', WhatsAppLink::phone(''));

        $template = WhatsAppLink::DEFAULT_MESSAGE;
        $this->assertSame('¡Hola, Familia Pérez! Te compartimos tu invitación (1 pase): u', WhatsAppLink::message($template, 'Familia Pérez', 1, 'u'));
        $this->assertSame('¡Hola! Te compartimos tu invitación (3 pases): u', WhatsAppLink::message($template, '', 3, 'u'));
    }
}
