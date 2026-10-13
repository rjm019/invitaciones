<?php

namespace App\Services\Invitations;

/**
 * Una invitación abierta por su token: el evento ya armado y su renglón de invitaciones.csv.
 */
final readonly class Invitation
{
    /**
     * @param  array<string, mixed>  $event  config del evento (EventConfigBuilder)
     * @param  array{id: string, token: string, passes: int, label: string, created_at: string}  $record
     */
    public function __construct(
        public string $slug,
        public array $event,
        public array $record,
    ) {}
}
