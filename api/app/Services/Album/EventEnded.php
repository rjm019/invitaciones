<?php

namespace App\Services\Album;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * El evento ya terminó (se cerró el álbum): la invitación deja de abrir con un 410. El
 * cuerpo trae los colores del evento para que la web muestre "ya terminó" con su diseño.
 */
final class EventEnded extends RuntimeException
{
    /** @param  array{title: string, theme: string, palette: array<string, string>, fonts: array<string, string>}  $brand */
    public function __construct(public readonly array $brand)
    {
        parent::__construct(AlbumService::ENDED);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'ended' => true, 'brand' => $this->brand], 410);
    }
}
