<?php

namespace App\Services\Design;

/**
 * Los datos bancarios de la lluvia de sobres son de confianza: con "solo con enlace" (lo
 * normal) viajan solo en las invitaciones personales (/i/<token>). El enlace general
 * (/e/<slug>, por API o ya en la página) los recibe vacíos y con el aviso `hidden`, para
 * que la invitación diga dónde encontrarlos. El filtro va aquí, nunca en la web.
 */
final class GiftPrivacy
{
    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public static function forGeneralLink(array $config): array
    {
        if (isset($config['gifts']['envelope'])) {
            $config['gifts']['envelope'] = self::hide($config['gifts']['envelope']);
        }
        if (isset($config['envelope'])) {
            $config['envelope'] = self::hide($config['envelope']);
        }

        return $config;
    }

    /**
     * @param  mixed  $envelope
     * @return mixed
     */
    private static function hide($envelope)
    {
        if (! is_array($envelope) || ! ($envelope['private'] ?? true)) {
            return $envelope;
        }
        $hasData = ($envelope['bank'] ?? '') !== '' || ($envelope['account'] ?? '') !== '' || ($envelope['holder'] ?? '') !== '';

        return $hasData ? [...$envelope, 'bank' => '', 'account' => '', 'holder' => '', 'hidden' => true] : $envelope;
    }
}
