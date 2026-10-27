<?php

namespace App\Services\Media;

/**
 * Valida el enlace de un video o publicación de YouTube, Instagram o Facebook y saca lo
 * necesario para mostrarlo. Espejo de web/src/services/socialEmbedService.ts: los dos
 * comparten los mismos casos de prueba.
 *
 * Solo `https`, sin usuario ni puerto, y solo los dominios de esas tres redes. Todo lo demás
 * (javascript:, http, otros dominios, "youtube.com@otro.com") se rechaza. La URL que sale
 * (`url`, `embed`) se arma desde las partes ya validadas, nunca copia la que escribió la persona.
 */
final class SocialEmbed
{
    public const NETWORKS = ['youtube', 'instagram', 'facebook'];

    private const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];

    private const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com'];

    private const FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com'];

    /**
     * `kind`: video, short, reel o post. `embed` solo si la red tiene un iframe propio.
     *
     * @return array{network: string, kind: string, id: string, url: string, embed: ?string}|null
     */
    public static function parse(string $input, ?string $network = null): ?array
    {
        $input = trim($input);
        if ($input === '' || strlen($input) > 500 || preg_match('/[\s\x00-\x1f\x7f\\\\<>"\'`]/', $input)) {
            return null;
        }
        $parts = parse_url($input);
        if ($parts === false || strtolower($parts['scheme'] ?? '') !== 'https') {
            return null;
        }
        // Sin usuario, contraseña ni puerto.
        if (isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
            return null;
        }
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';
        parse_str($parts['query'] ?? '', $query);

        $found = match (true) {
            in_array($host, self::YOUTUBE_HOSTS, true) || $host === 'youtu.be' => self::youtube($host, $path, $query),
            in_array($host, self::INSTAGRAM_HOSTS, true) => self::instagram($path),
            in_array($host, self::FACEBOOK_HOSTS, true) || $host === 'fb.watch' => self::facebook($host, $path, $query),
            default => null,
        };

        return $found !== null && ($network === null || $network === $found['network']) ? $found : null;
    }

    /** "YouTube" → "youtube" (también acepta la clave ya normalizada). */
    public static function networkName(string $network): string
    {
        return ['youtube' => 'YouTube', 'instagram' => 'Instagram', 'facebook' => 'Facebook'][$network] ?? $network;
    }

    /** @return array{network: string, kind: string, id: string, url: string, embed: ?string}|null */
    private static function youtube(string $host, string $path, array $query): ?array
    {
        $id = null;
        $kind = 'video';
        if ($host === 'youtu.be') {
            if (preg_match('~^/([A-Za-z0-9_-]{11})/?$~', $path, $m)) {
                $id = $m[1];
            }
        } elseif (preg_match('~^/shorts/([A-Za-z0-9_-]{11})/?$~', $path, $m)) {
            $id = $m[1];
            $kind = 'short';
        } elseif (preg_match('~^/(?:embed|live)/([A-Za-z0-9_-]{11})/?$~', $path, $m)) {
            $id = $m[1];
        } elseif (preg_match('~^/watch/?$~', $path) && is_string($query['v'] ?? null) && preg_match('~^[A-Za-z0-9_-]{11}$~', $query['v'])) {
            $id = $query['v'];
        }
        if ($id === null) {
            return null;
        }

        return [
            'network' => 'youtube',
            'kind' => $kind,
            'id' => $id,
            'url' => $kind === 'short' ? "https://www.youtube.com/shorts/{$id}" : "https://www.youtube.com/watch?v={$id}",
            'embed' => "https://www.youtube-nocookie.com/embed/{$id}",
        ];
    }

    /** @return array{network: string, kind: string, id: string, url: string, embed: ?string}|null */
    private static function instagram(string $path): ?array
    {
        if (! preg_match('~^(?:/[A-Za-z0-9._]{1,30})?/(reels?|p|tv)/([A-Za-z0-9_-]{5,30})/?$~', $path, $m)) {
            return null;
        }
        $kind = $m[1] === 'p' ? 'post' : ($m[1] === 'tv' ? 'video' : 'reel');
        $segment = $m[1] === 'reels' ? 'reel' : $m[1];

        return [
            'network' => 'instagram',
            'kind' => $kind,
            'id' => $m[2],
            'url' => "https://www.instagram.com/{$segment}/{$m[2]}/",
            'embed' => null,
        ];
    }

    /** @return array{network: string, kind: string, id: string, url: string, embed: ?string}|null */
    private static function facebook(string $host, string $path, array $query): ?array
    {
        $kind = 'video';
        $id = null;
        $url = null;
        if ($host === 'fb.watch') {
            if (preg_match('~^/([A-Za-z0-9_-]{4,30})/?$~', $path, $m)) {
                [$id, $url] = [$m[1], "https://fb.watch/{$m[1]}/"];
            }
        } elseif (preg_match('~^/watch/?$~', $path) && is_string($query['v'] ?? null) && preg_match('~^\d{5,25}$~', $query['v'])) {
            [$id, $url] = [$query['v'], "https://www.facebook.com/watch/?v={$query['v']}"];
        } elseif (preg_match('~^/reel/(\d{5,25})/?$~', $path, $m)) {
            [$id, $url] = [$m[1], "https://www.facebook.com/reel/{$m[1]}"];
        } elseif (preg_match('~^/share/([vrp])/([A-Za-z0-9_-]{4,40})/?$~', $path, $m)) {
            $kind = $m[1] === 'p' ? 'post' : 'video';
            [$id, $url] = [$m[2], "https://www.facebook.com/share/{$m[1]}/{$m[2]}/"];
        } elseif (preg_match('~^/([A-Za-z0-9.-]{1,80})/videos/(?:[^/]{1,120}/)?(\d{5,25})/?$~', $path, $m)) {
            [$id, $url] = [$m[2], "https://www.facebook.com/{$m[1]}/videos/{$m[2]}"];
        } elseif (preg_match('~^/([A-Za-z0-9.-]{1,80})/posts/([A-Za-z0-9_-]{5,80})/?$~', $path, $m)) {
            $kind = 'post';
            [$id, $url] = [$m[2], "https://www.facebook.com/{$m[1]}/posts/{$m[2]}"];
        } elseif (preg_match('~^/permalink\.php$~', $path) && is_string($query['story_fbid'] ?? null) && is_string($query['id'] ?? null)
            && preg_match('~^[A-Za-z0-9_-]{5,80}$~', $query['story_fbid']) && preg_match('~^\d{5,25}$~', $query['id'])) {
            $kind = 'post';
            [$id, $url] = [$query['story_fbid'], "https://www.facebook.com/permalink.php?story_fbid={$query['story_fbid']}&id={$query['id']}"];
        }
        if ($id === null || $url === null) {
            return null;
        }
        // fb.watch no sirve de href para el plugin: se queda como enlace ("Ver en Facebook").
        $embed = $host === 'fb.watch' ? null : 'https://www.facebook.com/plugins/'.($kind === 'post' ? 'post' : 'video')
            .'.php?href='.rawurlencode($url).'&show_text=false&width=560';

        return ['network' => 'facebook', 'kind' => $kind, 'id' => $id, 'url' => $url, 'embed' => $embed];
    }
}
