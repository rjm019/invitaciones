<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use App\Services\Panel\PanelAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/admin/events/{slug}/session — entrar al panel con la clave del evento.
 * 404 evento desconocido · 403 evento sin clave · 422 clave incorrecta · 429 demasiados intentos.
 */
class PanelSessionController extends Controller
{
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
