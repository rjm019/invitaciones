<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Panel\PanelAuth;
use App\Services\Panel\PanelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Entrada al panel (sin sesión): cómo se ve y con qué clave se entra.
 */
class PanelSessionController extends Controller
{
    /**
     * GET /api/admin/events/{slug}/brand — título, tema, colores y fuentes de la invitación
     * para la pantalla de entrada. 404 evento desconocido · 503 layout con errores.
     */
    public function brand(string $slug, EventRepository $events, PanelService $panel): JsonResponse
    {
        if ($events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        try {
            return response()->json(['brand' => $panel->brand($slug)]);
        } catch (LayoutException) {
            return response()->json(['message' => 'El layout del evento tiene errores.'], 503);
        }
    }

    /**
     * POST /api/admin/events/{slug}/session — entrar al panel con la clave del evento.
     * 404 evento desconocido · 403 evento sin clave · 422 clave incorrecta · 429 demasiados intentos.
     */
    public function store(Request $request, string $slug, EventRepository $events, PanelAuth $auth): JsonResponse
    {
        if ($events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        if ($auth->password($slug) === null) {
            return response()->json(['message' => 'Este evento no tiene panel. Agrega clave_panel en la pestaña "evento" del layout.'], 403);
        }

        $data = $request->validate(['password' => ['required', 'string', 'max:200']], [
            'password.*' => 'Escribe la clave del panel.',
        ]);

        $session = $auth->attempt($slug, $data['password']);
        if ($session === null) {
            return response()->json([
                'message' => 'La clave no es correcta.',
                'errors' => ['password' => ['La clave no es correcta.']],
            ], 422);
        }

        return response()->json($session);
    }
}
