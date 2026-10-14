<?php

namespace App\Http\Middleware;

use App\Services\Manager\ManagerAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Rutas del gestor: solo con su token de sesión (Authorization: Bearer). */
class EnsureManagerSession
{
    public function __construct(private readonly ManagerAuth $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->auth->password() === null) {
            return response()->json(['message' => 'El gestor no está activado: falta la clave GESTOR_CLAVE (16 caracteres o más).'], 403);
        }
        if (! $this->auth->check($request->bearerToken())) {
            return response()->json(['message' => 'Tu sesión terminó. Escribe la clave de nuevo.'], 401);
        }

        return $next($request);
    }
}
