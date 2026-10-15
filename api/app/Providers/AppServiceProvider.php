<?php

namespace App\Providers;

use App\Services\Manager\ManagerAuth;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Confirmaciones: 10 por minuto por IP y por invitación.
        RateLimiter::for('rsvp', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip().'|'.$request->route('token')));

        // Dedicatorias: una por enlace; 5 intentos por minuto bastan para corregir y reenviar.
        RateLimiter::for('dedication', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip().'|'.$request->route('token')));

        // Entrar al panel: 5 intentos por minuto por IP y evento (contra adivinar la clave).
        RateLimiter::for('panel-login', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip().'|'.$request->route('slug')));

        // Entrar al gestor (y crear la primera cuenta): 5 intentos por minuto por IP.
        RateLimiter::for('manager-login', fn (Request $request) => Limit::perMinute(5)
            ->by('manager|'.$request->ip()));

        // Cambiar mi clave en el gestor: 5 intentos por minuto por persona (contra adivinar la actual).
        RateLimiter::for('manager-password', fn (Request $request) => Limit::perMinute(5)
            ->by('manager-password|'.($request->attributes->get(ManagerAuth::ATTRIBUTE)['usuario'] ?? $request->ip())));
    }
}
