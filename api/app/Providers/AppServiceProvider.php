<?php

namespace App\Providers;

use App\Services\Manager\ManagerAuth;
use App\Services\Reminders\LogChannel;
use App\Services\Reminders\MetaWhatsAppChannel;
use App\Services\Reminders\ReminderChannel;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Por dónde salen los recordatorios del RSVP: "meta" (WhatsApp Cloud API) o "log" (local y pruebas).
        $this->app->bind(ReminderChannel::class, fn () => config('invitaciones.whatsapp.driver') === 'meta'
            ? new MetaWhatsAppChannel((array) config('invitaciones.whatsapp'))
            : new LogChannel);
    }

    public function boot(): void
    {
        // Buscador de recepción. Lectura y llegadas: cada pantalla consulta cada segundo y varias
        // comparten la IP del wifi del salón. La contraseña lleva su propio contador: sin nombre,
        // Laravel junta todas las rutas por IP y el sondeo agotaba los intentos de la contraseña.
        RateLimiter::for('recepcion-lectura', fn (Request $request) => Limit::perMinute(600)
            ->by('recepcion-lectura|'.$request->ip()));
        RateLimiter::for('recepcion-clave', fn (Request $request) => Limit::perMinute(10)
            ->by('recepcion-clave|'.$request->ip()));

        // Confirmaciones: 10 por minuto por IP y por invitación.
        RateLimiter::for('rsvp', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip().'|'.$request->route('token')));

        // Dedicatorias: una por enlace; 5 intentos por minuto bastan para corregir y reenviar.
        RateLimiter::for('dedication', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip().'|'.$request->route('token')));

        // Muro de dedicatorias: solo lectura; 30 por minuto por IP y evento (o enlace).
        RateLimiter::for('dedication-wall', fn (Request $request) => Limit::perMinute(30)
            ->by($request->ip().'|wall|'.($request->route('slug') ?? $request->route('token'))));

        // Trivia: abrir y responder; 10 por minuto por IP y enlace alcanzan para reintentar.
        RateLimiter::for('trivia', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip().'|trivia|'.$request->route('token')));

        // Álbum: 6 fotos por minuto por IP y enlace (cada una se decodifica en el servidor).
        RateLimiter::for('album', fn (Request $request) => Limit::perMinute(6)
            ->by($request->ip().'|album|'.$request->route('token')));

        // Cotizaciones de la landing: 5 por hora por IP (una persona cotiza una o dos veces).
        RateLimiter::for('quote', fn (Request $request) => Limit::perHour(5)->by('quote|'.$request->ip()));

        // Visitas: 60 páginas por minuto por IP sobran para una persona (o una familia con la misma red).
        RateLimiter::for('visit', fn (Request $request) => Limit::perMinute(60)->by('visit|'.$request->ip()));

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
