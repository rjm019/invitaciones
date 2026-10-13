<?php

namespace App\Http\Middleware;

use App\Services\Panel\PanelAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Rutas del panel: solo con el token de sesión de ese mismo evento (Authorization: Bearer). */
class EnsurePanelSession
{
    public function __construct(private readonly PanelAuth $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->auth->check((string) $request->route('slug'), $request->bearerToken())) {
            return response()->json(['message' => 'Tu sesión terminó. Escribe la clave de nuevo.'], 401);
        }

        return $next($request);
    }
}
