<?php

namespace App\Services\Media;

use RuntimeException;

/** No se puede borrar un archivo que la invitación usa. Lleva dónde se usa. */
final class MediaInUse extends RuntimeException
{
    /**
     * @param  list<array{version: string, block: string, item: ?int, field: string}>  $usedIn
     */
    public function __construct(public readonly array $usedIn)
    {
        parent::__construct('La invitación usa este archivo; primero cámbialo por otro.');
    }
}
