<?php

namespace App\Http\Middleware;

use App\Services\Manager\ManagerAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Después de "manager": solo quien administra el gestor (las cuentas de las personas). */
class EnsureManagerAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->attributes->get(ManagerAuth::ATTRIBUTE);
        if (($user['rol'] ?? null) !== 'admin') {
            return response()->json(['message' => 'Solo quien administra el gestor puede ver y cambiar las cuentas.'], 403);
        }

        return $next($request);
    }
}
