<?php

namespace Tests\Unit\Media;

use App\Services\Media\Mp3Duration;
use PHPUnit\Framework\TestCase;

class Mp3DurationTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir().'/mp3-'.bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir.'/*') ?: []);
        rmdir($this->dir);
    }

    /** MPEG1 capa 3, 128 kbps, 44.1 kHz: cada cuadro mide 417 bytes y dura 1152/44100 s. */
    public static function cbr(int $frames, string $prefix = ''): string
    {
        return $prefix.str_repeat("\xFF\xFB\x90\x00".str_repeat("\0", 413), $frames);
    }

    public function test_cbr_duration_from_the_bitrate(): void
    {
        file_put_contents($this->dir.'/a.mp3', self::cbr(383));

        $this->assertEqualsWithDelta(10.0, Mp3Duration::seconds($this->dir.'/a.mp3'), 0.05);
    }

    public function test_skips_the_id3_tag(): void
    {
        $tag = "ID3\x04\x00\x00\x00\x00\x01\x00".str_repeat("\0", 128); // 128 bytes
        file_put_contents($this->dir.'/a.mp3', self::cbr(383, $tag));

        $this->assertEqualsWithDelta(10.0, Mp3Duration::seconds($this->dir.'/a.mp3'), 0.05);
    }

    public function test_uses_the_xing_frame_count_when_present(): void
    {
        // Estéreo MPEG1: el encabezado Xing va 32 bytes después del de 4 bytes.
        $xing = "\xFF\xFB\x90\x00".str_repeat("\0", 32).'Xing'."\0\0\0\x01".pack('N', 1000);
        $data = $xing.str_repeat("\0", 417 - strlen($xing)).self::cbr(10);
        file_put_contents($this->dir.'/a.mp3', $data);

        $this->assertEqualsWithDelta(1000 * 1152 / 44100, Mp3Duration::seconds($this->dir.'/a.mp3'), 0.001);
    }

    public function test_returns_null_when_it_cannot_know(): void
    {
        file_put_contents($this->dir.'/basura.mp3', 'esto no es audio');
        file_put_contents($this->dir.'/a.ogg', self::cbr(10));

        $this->assertNull(Mp3Duration::seconds($this->dir.'/basura.mp3'));
        $this->assertNull(Mp3Duration::seconds($this->dir.'/a.ogg'));
        $this->assertNull(Mp3Duration::seconds($this->dir.'/no-existe.mp3'));
    }
}
