<?php

namespace App\Services\Invitations;

/**
 * Enlace wa.me con el mensaje ya escrito, listo para mandar la invitación.
 */
final class WhatsAppLink
{
    public const DEFAULT_MESSAGE = '¡Hola{, familia}! Te compartimos tu invitación ({pases}): {enlace}';

    /**
     * Teléfono como lo escribe una persona → solo dígitos con lada de país. Un número
     * de 10 dígitos se toma como de México (52). Sin teléfono, wa.me deja elegir el chat.
     */
    public static function phone(string $phone): string
    {
        $digits = (string) preg_replace('/\D+/', '', $phone);

        return match (true) {
            strlen($digits) === 10 => '52'.$digits,
            strlen($digits) === 13 && str_starts_with($digits, '521') => '52'.substr($digits, 3), // formato viejo de celular
            default => $digits,
        };
    }

    /**
     * Plantilla con {familia}, {pases} ("4 pases") y {enlace}. "{, familia}" pone ", Familia
     * Pérez" solo si la invitación tiene nombre.
     */
    public static function message(string $template, string $name, int $passes, string $url): string
    {
        return strtr($template, [
            '{, familia}' => $name !== '' ? ", {$name}" : '',
            '{familia}' => $name,
            '{pases}' => $passes === 1 ? '1 pase' : "{$passes} pases",
            '{enlace}' => $url,
        ]);
    }

    public static function url(string $phone, string $text): string
    {
        return 'https://wa.me/'.self::phone($phone).'?text='.rawurlencode($text);
    }
}
