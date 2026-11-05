<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Recepcion\RecepcionStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Buscador de invitados compartido. Leer y marcar llegadas lo puede hacer cualquiera con el
 * enlace; cargar o reemplazar la lista pide la clave de administración (RECEPCION_CLAVE) en
 * X-Recepcion-Key. 503 sin clave configurada · 401 clave incorrecta.
 */
class RecepcionController extends Controller
{
    public function show(Request $request, RecepcionStore $store): JsonResponse
    {
        $state = $store->read();
        // Con ?rev=N y sin cambios solo contesta que sigue igual: así se puede preguntar cada segundo.
        if ($request->query('rev') !== null && (int) $request->query('rev') === $state['rev']) {
            return response()->json(['rev' => $state['rev'], 'igual' => true]);
        }

        return response()->json($state);
    }

    public function changes(Request $request, RecepcionStore $store): JsonResponse
    {
        $request->validate([
            'invitados' => ['required', 'array', 'max:500'],
            'invitados.*.id' => ['required', 'integer', 'min:1'],
            'invitados.*.mesa' => ['nullable', 'integer'],
        ]);

        return response()->json($store->merge($request->input('invitados')));
    }

    public function session(Request $request): JsonResponse
    {
        return $this->guard($request) ?? response()->json(['ok' => true]);
    }

    public function replace(Request $request, RecepcionStore $store): JsonResponse
    {
        if ($denied = $this->guard($request)) {
            return $denied;
        }
        $request->validate([
            'categorias' => ['required', 'array', 'max:20'],
            'invitados' => ['required', 'array', 'min:1', 'max:5000'],
            'invitados.*.id' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json($store->replace($request->input('categorias'), $request->input('invitados')));
    }

    private function guard(Request $request): ?JsonResponse
    {
        $key = (string) config('invitaciones.recepcion_clave');
        if ($key === '') {
            return response()->json(['message' => 'La carga de la lista no está configurada.'], 503);
        }
        if (! hash_equals($key, (string) $request->header('X-Recepcion-Key'))) {
            return response()->json(['message' => 'Contraseña incorrecta.'], 401);
        }

        return null;
    }
}
