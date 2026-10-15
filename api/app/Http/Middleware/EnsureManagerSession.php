<?php

namespace App\Http\Middleware;

use App\Services\Manager\ManagerAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rutas del gestor: solo con el token de sesión de una persona (Authorization: Bearer).
 * Deja a esa persona en la petición (ManagerAuth::ATTRIBUTE) para anotar quién hizo qué.
 */
class EnsureManagerSession
{
    public function __construct(private readonly ManagerAuth $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->auth->enabled()) {
            return response()->json(['message' => 'El gestor no está activado: falta la clave GESTOR_CLAVE (16 caracteres o más).'], 403);
        }
        $user = $this->auth->user($request->bearerToken());
        if ($user === null) {
            return response()->json(['message' => 'Tu sesión terminó. Entra de nuevo.'], 401);
        }
        $request->attributes->set(ManagerAuth::ATTRIBUTE, $user);

        return $next($request);
    }
}
