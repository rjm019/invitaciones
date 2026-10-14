<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Manager\ManagerAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Entrada al gestor con la clave maestra. */
class SessionController extends Controller
{
    /**
     * POST /api/manager/session — { password }
     * 403 gestor sin clave · 422 clave incorrecta · 429 demasiados intentos.
     */
    public function store(Request $request, ManagerAuth $auth): JsonResponse
    {
        if ($auth->password() === null) {
            return response()->json(['message' => 'El gestor no está activado: falta la clave GESTOR_CLAVE (16 caracteres o más).'], 403);
        }

        $data = $request->validate(['password' => ['required', 'string', 'max:200']], [
            'password.*' => 'Escribe la clave del gestor.',
        ]);

        $session = $auth->attempt($data['password']);
        if ($session === null) {
            return response()->json([
                'message' => 'La clave no es correcta.',
                'errors' => ['password' => ['La clave no es correcta.']],
            ], 422);
        }

        return response()->json($session);
    }
}
