<?php

namespace App\Services\Layout;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * El layout de un evento tiene un error que la persona que lo edita debe corregir.
 * El mensaje está en español y dice qué pestaña y qué dato revisar.
 */
final class LayoutException extends RuntimeException
{
    /**
     * @param  list<string>  $errors
     */
    public function __construct(public readonly string $slug, public readonly array $errors)
    {
        parent::__construct("El layout de '{$slug}' tiene errores: ".implode(' · ', $errors));
    }

    /** Laravel la reporta al log y responde esto: 503, con la lista de errores solo en desarrollo. */
    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'La invitación no está disponible por ahora.',
            'errors' => config('app.debug') ? $this->errors : [],
        ], 503);
    }
}
