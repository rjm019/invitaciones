<?php

namespace App\Services\Quotes;

use App\Mail\NewQuote;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Avisa por correo de una cotización nueva (a COTIZACIONES_CORREO). Si no hay correo
 * configurado, no hace nada: la cotización ya quedó en el gestor. Nunca debe tumbar la
 * petición: si el correo falla, solo se reporta.
 */
final class QuoteNotifier
{
    private const TYPES = ['boda' => 'Boda', 'xv' => 'XV años', 'graduacion' => 'Graduación', 'otro' => 'Otro'];

    /** @param  array<string, string>  $quote */
    public function send(array $quote): void
    {
        $to = (string) config('invitaciones.cotizaciones_correo');
        if ($to === '') {
            return;
        }
        try {
            Mail::to($to)->send(new NewQuote($quote));
        } catch (Throwable $e) {
            report($e);
        }
    }

    /** @param  array<string, string>  $quote */
    public static function subject(array $quote): string
    {
        $who = $quote['nombre'] !== '' ? $quote['nombre'] : $quote['telefono'];

        return 'Nueva cotización: '.(self::TYPES[$quote['tipo']] ?? 'Evento').' · '.$who;
    }

    /** @param  array<string, string>  $quote */
    public static function body(array $quote): string
    {
        $wa = 'https://wa.me/'.ltrim($quote['telefono'], '+');
        $lines = [
            'Llegó una cotización desde la página.',
            '',
            'Nombre: '.($quote['nombre'] !== '' ? $quote['nombre'] : '(sin nombre)'),
            'Teléfono: '.$quote['telefono'],
            'WhatsApp: '.$wa,
            'Evento: '.(self::TYPES[$quote['tipo']] ?? $quote['tipo']),
            'Fecha del evento: '.($quote['fecha_evento'] !== '' ? $quote['fecha_evento'] : '(sin fecha)'),
            'Página: '.($quote['pagina'] !== '' ? $quote['pagina'] : '/'),
            '',
            'Su idea:',
            $quote['idea'] !== '' ? $quote['idea'] : '(no escribió nada)',
            '',
            'Atiéndela en el gestor: '.rtrim((string) config('invitaciones.frontend_url'), '/').'/gestor',
        ];

        return implode("\n", $lines);
    }
}
