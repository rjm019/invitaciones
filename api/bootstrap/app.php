<?php

use App\Http\Middleware\EnsureManagerAdmin;
use App\Http\Middleware\EnsureManagerEventAccess;
use App\Http\Middleware\EnsureManagerSession;
use App\Http\Middleware\EnsurePanelSession;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sin cookies: el público entra con el token de su invitación, el dueño con el token
        // de sesión de su panel y el gestor con el suyo (Authorization: Bearer). Las páginas
        // (la invitación, el panel y el gestor) tampoco abren sesión ni mandan cookies: nada
        // las usa, y así cada visita no escribe un archivo de sesión ni cifra dos cookies.
        $middleware->web(remove: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            PreventRequestForgery::class,
        ]);
        $middleware->alias([
            'panel' => EnsurePanelSession::class,
            'manager' => EnsureManagerSession::class,
            'manager.admin' => EnsureManagerAdmin::class,
            'manager.event' => EnsureManagerEventAccess::class,
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
