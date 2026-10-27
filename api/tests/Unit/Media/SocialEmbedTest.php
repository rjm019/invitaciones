<?php

namespace Tests\Unit\Media;

use App\Services\Media\SocialEmbed;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Los mismos casos que web/src/services/__tests__/socialEmbedService.spec.ts. */
class SocialEmbedTest extends TestCase
{
    /** @return array<string, array{string, string, string, string, string}> */
    public static function valid(): array
    {
        return [
            'youtube watch' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'youtube watch con lista' => ['https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL1&t=3s', 'youtube', 'video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'youtu.be' => ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube', 'video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'shorts' => ['https://www.youtube.com/shorts/abcdefghijk', 'youtube', 'short', 'abcdefghijk', 'https://www.youtube.com/shorts/abcdefghijk'],
            'embed' => ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'youtube', 'video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'instagram reel' => ['https://www.instagram.com/reel/C8abcDEF123/?igsh=xyz', 'instagram', 'reel', 'C8abcDEF123', 'https://www.instagram.com/reel/C8abcDEF123/'],
            'instagram post de usuario' => ['https://instagram.com/jiro.invitaciones/p/Cabc_12-x/', 'instagram', 'post', 'Cabc_12-x', 'https://www.instagram.com/p/Cabc_12-x/'],
            'instagram reels' => ['https://www.instagram.com/reels/C8abcDEF123', 'instagram', 'reel', 'C8abcDEF123', 'https://www.instagram.com/reel/C8abcDEF123/'],
            'facebook watch' => ['https://www.facebook.com/watch/?v=1234567890123', 'facebook', 'video', '1234567890123', 'https://www.facebook.com/watch/?v=1234567890123'],
            'facebook reel' => ['https://m.facebook.com/reel/1234567890123', 'facebook', 'video', '1234567890123', 'https://www.facebook.com/reel/1234567890123'],
            'facebook video de página' => ['https://www.facebook.com/jiro/videos/1234567890123/', 'facebook', 'video', '1234567890123', 'https://www.facebook.com/jiro/videos/1234567890123'],
            'facebook post' => ['https://www.facebook.com/jiro/posts/pfbid02abcDEF', 'facebook', 'post', 'pfbid02abcDEF', 'https://www.facebook.com/jiro/posts/pfbid02abcDEF'],
        ];
    }

    #[DataProvider('valid')]
    public function test_accepts_known_links(string $input, string $network, string $kind, string $id, string $url): void
    {
        $r = SocialEmbed::parse($input);
        $this->assertNotNull($r);
        $this->assertSame([$network, $kind, $id, $url], [$r['network'], $r['kind'], $r['id'], $r['url']]);
    }

    /** @return array<string, array{string}> */
    public static function invalid(): array
    {
        return [
            'vacío' => [''],
            'javascript' => ['javascript:alert(1)'],
            'data' => ['data:text/html,<script>1</script>'],
            'http' => ['http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'sin esquema' => ['www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'otro dominio' => ['https://vimeo.com/123456789'],
            'dominio parecido' => ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'],
            'sufijo' => ['https://evilyoutube.com/watch?v=dQw4w9WgXcQ'],
            'userinfo' => ['https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ'],
            'userinfo al revés' => ['https://evil.com@www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'puerto' => ['https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ'],
            'puerto 443' => ['https://www.youtube.com:443/watch?v=dQw4w9WgXcQ'],
            'id corto' => ['https://youtu.be/abc'],
            'id con comilla' => ['https://www.youtube.com/watch?v=dQw4w9WgXc"'],
            'canal sin video' => ['https://www.youtube.com/@jiro'],
            'instagram perfil' => ['https://www.instagram.com/jiro.invitaciones/'],
            'facebook página' => ['https://www.facebook.com/jiro'],
            'facebook video sin id' => ['https://www.facebook.com/jiro/videos/abc'],
            'espacios' => ['https://youtu.be/dQw4w9WgXcQ <script>'],
            'barra invertida' => ['https://youtube.com\\@evil.com/watch?v=dQw4w9WgXcQ'],
        ];
    }

    #[DataProvider('invalid')]
    public function test_rejects_everything_else(string $input): void
    {
        $this->assertNull(SocialEmbed::parse($input));
    }

    public function test_embed_urls_are_built_from_validated_parts(): void
    {
        $yt = SocialEmbed::parse('https://youtu.be/dQw4w9WgXcQ?x=1');
        $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $yt['embed']);
        $this->assertNull(SocialEmbed::parse('https://www.instagram.com/reel/C8abcDEF123/')['embed']);
        $fb = SocialEmbed::parse('https://www.facebook.com/watch/?v=1234567890123&extra=1');
        $this->assertSame('https://www.facebook.com/plugins/video.php?href='.rawurlencode('https://www.facebook.com/watch/?v=1234567890123').'&show_text=false&width=560', $fb['embed']);
    }

    public function test_network_filter(): void
    {
        $this->assertNotNull(SocialEmbed::parse('https://youtu.be/dQw4w9WgXcQ', 'youtube'));
        $this->assertNull(SocialEmbed::parse('https://youtu.be/dQw4w9WgXcQ', 'instagram'));
    }
}
