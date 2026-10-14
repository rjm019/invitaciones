<?php

namespace App\Services\Design;

use RuntimeException;

/** No se puede publicar: la invitación tiene errores (o no hay nada que publicar). */
final class PublishBlocked extends RuntimeException
{
    /**
     * @param  list<array{level: string, block: string, item: ?int, field: ?string, message: string}>  $issues
     */
    public function __construct(string $message, public readonly array $issues = [])
    {
        parent::__construct($message);
    }
}
