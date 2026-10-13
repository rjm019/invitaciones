<?php

namespace App\Services\Invitations;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Algo que el servidor rechaza por una regla del evento: 409 si las confirmaciones ya
 * cerraron o si la dedicatoria ya se envió, 422 si no quedan lugares. El mensaje está en
 * español y se muestra tal cual.
 */
final class RsvpException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status, public readonly ?string $field = null)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(array_filter([
            'message' => $this->getMessage(),
            'errors' => $this->field ? [$this->field => [$this->getMessage()]] : null,
        ]), $this->status);
    }
}
