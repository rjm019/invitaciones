<?php

use App\Http\Middleware\EnsureManagerAdmin;
use App\Http\Middleware\EnsureManagerSession;
use App\Http\Middleware\EnsurePanelSession;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sin cookies: el público entra con el token de su invitación, el dueño con el token
        // de sesión de su panel y el gestor con el suyo (Authorization: Bearer).
        $middleware->alias([
            'panel' => EnsurePanelSession::class,
            'manager' => EnsureManagerSession::class,
            'manager.admin' => EnsureManagerAdmin::class,
        ]);
        // En Fly la conexión llega por su proxy: así las URLs (fotos de media) salen con https.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // La invitación es una SPA: los errores de /api siempre en JSON, nunca la página HTML de Laravel.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
