<?php

namespace Tests\Unit\Visits;

use App\Services\Visits\VisitClassifier as V;
use PHPUnit\Framework\TestCase;

class VisitClassifierTest extends TestCase
{
    private const SITE = ['invitaciones-jiro.fly.dev'];

    public function test_robots_and_link_previews_are_not_visits_but_phones_named_cubot_are(): void
    {
        foreach ([
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
            'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'WhatsApp/2.24.20.79 A',
            'TelegramBot (like TwitterBot)',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; moto g power) Chrome-Lighthouse',
            'curl/8.5.0',
            '',
        ] as $ua) {
            $this->assertTrue(V::isBot($ua), $ua);
        }
        $this->assertFalse(V::isBot('Mozilla/5.0 (Linux; Android 12; CUBOT X50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'));
        $this->assertFalse(V::isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0'));
    }

    public function test_device_system_and_browser(): void
    {
        $ipad = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
        $samsung = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36';
        $tablet = 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
        $edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0';
        $facebook = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22A3354 [FBAN/FBIOS;FBAV/480.0]';

        $this->assertSame(['Tableta', 'iOS', 'Safari'], [V::device($ipad), V::system($ipad), V::browser($ipad)]);
        $this->assertSame(['Celular', 'Android', 'Samsung'], [V::device($samsung), V::system($samsung), V::browser($samsung)]);
        $this->assertSame(['Tableta', 'Android', 'Chrome'], [V::device($tablet), V::system($tablet), V::browser($tablet)]);
        $this->assertSame(['Computadora', 'Windows', 'Edge'], [V::device($edge), V::system($edge), V::browser($edge)]);
        $this->assertSame(['Celular', 'iOS', 'Facebook'], [V::device($facebook), V::system($facebook), V::browser($facebook)]);
    }

    public function test_where_people_come_from(): void
    {
        $chrome = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

        $this->assertSame('google.com.mx', V::host('https://www.google.com.mx/search?q=invitaciones'));
        $this->assertSame('', V::host('no es una dirección'));

        $this->assertSame('Google', V::origin('google.com.mx', '', $chrome, self::SITE));
        $this->assertSame('Gemini', V::origin('gemini.google.com', '', $chrome, self::SITE));
        $this->assertSame('Facebook', V::origin('l.facebook.com', '', $chrome, self::SITE));
        $this->assertSame('Instagram', V::origin('l.instagram.com', '', $chrome, self::SITE));
        $this->assertSame('X', V::origin('t.co', '', $chrome, self::SITE));
        $this->assertSame('mit.co', V::origin('mit.co', '', $chrome, self::SITE));
        $this->assertSame('Perplexity', V::origin('perplexity.ai', '', $chrome, self::SITE));
        $this->assertSame('Dentro del sitio', V::origin('invitaciones-jiro.fly.dev', '', $chrome, self::SITE));
        $this->assertSame('blog.ejemplo.mx', V::origin('blog.ejemplo.mx', '', $chrome, self::SITE));

        // Las etiquetas del enlace mandan; sin página de antes, la app; si no, "Directo".
        $this->assertSame('Código QR', V::origin('google.com', 'QR', $chrome, self::SITE));
        $this->assertSame('Volante Expo', V::origin('', "Volante\tExpo", $chrome, self::SITE));
        $this->assertSame('TikTok', V::origin('', '', 'Mozilla/5.0 (Linux; Android 14) musical_ly_2023 BytedanceWebview', self::SITE));
        $this->assertSame('Directo', V::origin('', '', $chrome, self::SITE));
    }
}
