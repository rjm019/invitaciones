<?php

namespace App\Services\Visits;

/**
 * Qué se puede saber de una visita sin preguntarle nada a la persona: si es un robot, su
 * dispositivo, sistema y navegador (por el User-Agent) y de dónde llegó (la página de
 * antes, las etiquetas utm_* del enlace o la app en la que se abrió). Lógica pura.
 */
final class VisitClassifier
{
    /**
     * Robots de buscadores y de IA, vistas previas de enlaces (WhatsApp, Facebook…) y
     * herramientas. "bot" suelto no basta: hay celulares que se llaman "Cubot".
     */
    private const BOTS = '/bot\/|bot-|\bbot\b|(google|bing|yandex|duckduck|apple|ahrefs|semrush|mj12|dot|petal|amazon|gpt|claude|perplexity|telegram|slack|twitter|linkedin|discord|pinterest|baidu|seznam|yeti)bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|externalagent|^whatsapp|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|mediapartners|google-|googleother|python|curl|wget|httpclient|go-http|java\/|okhttp|axios|node-fetch|scrapy|phantom|puppeteer|playwright/i';

    /** utm_source escrito a mano → nombre que se muestra. */
    private const SOURCES = [
        'ig' => 'Instagram', 'instagram' => 'Instagram',
        'fb' => 'Facebook', 'facebook' => 'Facebook', 'meta' => 'Facebook',
        'wa' => 'WhatsApp', 'whatsapp' => 'WhatsApp',
        'tt' => 'TikTok', 'tiktok' => 'TikTok',
        'google' => 'Google', 'yt' => 'YouTube', 'youtube' => 'YouTube',
        'x' => 'X', 'twitter' => 'X',
        'qr' => 'Código QR',
        'email' => 'Correo', 'correo' => 'Correo', 'mail' => 'Correo',
    ];

    /** Dominio de la página de antes (o lo que termina en él) → nombre. El orden importa. */
    private const REFERRERS = [
        'gemini.google.com' => 'Gemini',
        'google.' => 'Google',
        'bing.com' => 'Bing',
        'duckduckgo.com' => 'DuckDuckGo',
        'yahoo.com' => 'Yahoo',
        'ecosia.org' => 'Ecosia',
        'search.brave.com' => 'Brave',
        'yandex.' => 'Yandex',
        'instagram.com' => 'Instagram',
        'facebook.com' => 'Facebook',
        'fb.com' => 'Facebook',
        'fb.me' => 'Facebook',
        'messenger.com' => 'Facebook',
        'tiktok.com' => 'TikTok',
        't.co' => 'X',
        'twitter.com' => 'X',
        'x.com' => 'X',
        'threads.net' => 'Threads',
        'whatsapp.com' => 'WhatsApp',
        'wa.me' => 'WhatsApp',
        'youtube.com' => 'YouTube',
        'youtu.be' => 'YouTube',
        'pinterest.' => 'Pinterest',
        'linkedin.com' => 'LinkedIn',
        'lnkd.in' => 'LinkedIn',
        'chatgpt.com' => 'ChatGPT',
        'openai.com' => 'ChatGPT',
        'perplexity.ai' => 'Perplexity',
        'claude.ai' => 'Claude',
        'copilot.microsoft.com' => 'Copilot',
    ];

    public const INSIDE = 'Dentro del sitio';

    public const DIRECT = 'Directo';

    public static function isBot(string $userAgent): bool
    {
        return trim($userAgent) === '' || (bool) preg_match(self::BOTS, $userAgent);
    }

    public static function device(string $ua): string
    {
        if (preg_match('/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i', $ua)) {
            return 'Tableta';
        }

        return preg_match('/Mobi|iPhone|iPod|Android|Windows Phone/i', $ua) ? 'Celular' : 'Computadora';
    }

    public static function system(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/iPhone|iPad|iPod/i', $ua) => 'iOS',
            (bool) preg_match('/Android/i', $ua) => 'Android',
            (bool) preg_match('/Windows/i', $ua) => 'Windows',
            (bool) preg_match('/CrOS/', $ua) => 'ChromeOS',
            (bool) preg_match('/Mac OS X|Macintosh/i', $ua) => 'macOS',
            (bool) preg_match('/Linux/i', $ua) => 'Linux',
            default => 'Otro',
        };
    }

    /** Las apps (Instagram, Facebook, TikTok) abren las páginas en su propio navegador. */
    public static function browser(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/Instagram/i', $ua) => 'Instagram',
            (bool) preg_match('/FBAN|FBAV|FB_IAB/', $ua) => 'Facebook',
            (bool) preg_match('/musical_ly|BytedanceWebview|TikTok/i', $ua) => 'TikTok',
            (bool) preg_match('/GSA\//', $ua) => 'Google',
            (bool) preg_match('/SamsungBrowser/', $ua) => 'Samsung',
            (bool) preg_match('/Edg(e|A|iOS)?\//', $ua) => 'Edge',
            (bool) preg_match('/OPR\/|Opera|OPiOS/', $ua) => 'Opera',
            (bool) preg_match('/Firefox|FxiOS/', $ua) => 'Firefox',
            (bool) preg_match('/CriOS|Chrome\//', $ua) => 'Chrome',
            (bool) preg_match('/Safari\//', $ua) => 'Safari',
            default => 'Otro',
        };
    }

    /** "https://www.google.com.mx/search?q=…" → "google.com.mx"; '' si no es una dirección. */
    public static function host(string $referrer): string
    {
        $host = strtolower((string) parse_url(trim($referrer), PHP_URL_HOST));

        return preg_replace('/^www\./', '', $host) ?? '';
    }

    /**
     * De dónde llegó: las etiquetas del enlace mandan (utm_source=ig); si no, la página de
     * antes; si no hay, la app en la que se abrió. Sin nada de eso es "Directo": escribieron
     * la dirección, escanearon un QR o la abrieron desde WhatsApp (que no dice de dónde viene).
     *
     * @param  list<string>  $siteHosts  los dominios de este sitio (navegar dentro no es "llegar")
     */
    public static function origin(string $referrerHost, string $utmSource, string $ua, array $siteHosts): string
    {
        $source = strtolower(trim($utmSource));
        if ($source !== '') {
            return self::SOURCES[$source] ?? self::label($utmSource);
        }
        if ($referrerHost !== '') {
            if (in_array($referrerHost, $siteHosts, true)) {
                return self::INSIDE;
            }
            foreach (self::REFERRERS as $domain => $name) {
                if (self::matches($referrerHost, $domain)) {
                    return $name;
                }
            }

            return $referrerHost;
        }

        return match ($browser = self::browser($ua)) {
            'Instagram', 'Facebook', 'TikTok' => $browser,
            default => self::DIRECT,
        };
    }

    /** Un texto libre (utm_*): una línea corta, sin caracteres de control. */
    public static function label(string $value, int $max = 40): string
    {
        $clean = trim((string) preg_replace(['/[\x00-\x1F\x7F]+/u', '/\s+/u'], ' ', $value));

        return mb_substr($clean, 0, $max);
    }

    /** "google." coincide con google.com y google.com.mx; "t.co", solo con t.co (no con mit.com). */
    private static function matches(string $host, string $domain): bool
    {
        if (str_ends_with($domain, '.')) {
            return str_starts_with($host, $domain) || str_contains($host, '.'.$domain);
        }

        return $host === $domain || str_ends_with($host, '.'.$domain);
    }
}
