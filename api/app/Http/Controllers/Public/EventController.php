<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Album\AlbumService;
use App\Services\Design\GiftPrivacy;
use App\Services\Layout\EventRepository;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/public/events/{slug}: el evento armado desde su layout (xlsx o CSV).
 * Solo expone lo que necesita la invitación; nunca familias ni respuestas, ni los datos
 * bancarios de la mesa de regalos que la invitación guarda para los enlaces personales.
 * Si el layout tiene errores, LayoutException responde 503; si el evento ya terminó, 410.
 */
class EventController extends Controller
{
    public function show(string $slug, EventRepository $events, AlbumService $album): JsonResponse
    {
        $config = $events->find($slug);

        if ($config === null || ! $config['published']) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        // Terminó el evento (se cerró el álbum): 410 con los colores del evento.
        $album->guard($slug, $config);

        return response()->json(['event' => GiftPrivacy::forGeneralLink($config)]);
    }
}
