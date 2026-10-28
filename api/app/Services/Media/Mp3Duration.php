<?php

namespace App\Services\Media;

/**
 * Duración de un MP3 leyendo solo sus cabeceras (sin ffprobe ni librerías): usa el
 * encabezado Xing/Info/VBRI si lo trae y, si no, calcula con la tasa de bits (CBR).
 * Devuelve null cuando no puede saberla (otro formato, archivo dañado): quien llama no
 * debe inventar nada.
 */
final class Mp3Duration
{
    private const BITRATES = [
        // [versión][capa] en kbps; versión 1 = MPEG1, 2 = MPEG2/2.5
        1 => [
            1 => [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
            2 => [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
            3 => [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        ],
        2 => [
            1 => [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
            2 => [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
            3 => [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
        ],
    ];

    private const SAMPLE_RATES = [
        3 => [44100, 48000, 32000], // MPEG1
        2 => [22050, 24000, 16000], // MPEG2
        0 => [11025, 12000, 8000],  // MPEG2.5
    ];

    /** Segundos (con decimales) o null si no se puede saber. */
    public static function seconds(string $path): ?float
    {
        if (! is_file($path) || ! preg_match('/\.mp3$/i', $path)) {
            return null;
        }
        $size = filesize($path);
        $head = @file_get_contents($path, false, null, 0, 262144);
        if ($size === false || $head === false || $head === '') {
            return null;
        }

        $offset = 0;
        if (str_starts_with($head, 'ID3') && strlen($head) >= 10) {
            $len = (ord($head[6]) << 21) | (ord($head[7]) << 14) | (ord($head[8]) << 7) | ord($head[9]);
            $offset = 10 + $len;
        }
        $end = strlen($head);
        for ($i = $offset; $i + 4 <= $end; $i++) {
            if (ord($head[$i]) !== 0xFF || (ord($head[$i + 1]) & 0xE0) !== 0xE0) {
                continue;
            }
            $frame = self::frame(substr($head, $i, 4));
            if ($frame === null) {
                continue;
            }

            return self::duration($head, $i, $frame, $size);
        }

        return null;
    }

    /**
     * @return array{version: int, layer: int, bitrate: int, rate: int, samples: int, channels: int}|null
     */
    private static function frame(string $h): ?array
    {
        $b1 = ord($h[1]);
        $b2 = ord($h[2]);
        $b3 = ord($h[3]);
        $versionBits = ($b1 >> 3) & 3;
        $layerBits = ($b1 >> 1) & 3;
        $bitrateIndex = $b2 >> 4;
        $rateIndex = ($b2 >> 2) & 3;
        if ($versionBits === 1 || $layerBits === 0 || $bitrateIndex === 0 || $bitrateIndex === 15 || $rateIndex === 3) {
            return null;
        }
        $layer = 4 - $layerBits;
        $table = $versionBits === 3 ? 1 : 2;
        $bitrate = self::BITRATES[$table][$layer][$bitrateIndex] ?? 0;
        $rate = self::SAMPLE_RATES[$versionBits][$rateIndex];
        $samples = match (true) {
            $layer === 1 => 384,
            $layer === 2 || $versionBits === 3 => 1152,
            default => 576,
        };

        return [
            'version' => $versionBits,
            'layer' => $layer,
            'bitrate' => $bitrate * 1000,
            'rate' => $rate,
            'samples' => $samples,
            'channels' => (($b3 >> 6) & 3) === 3 ? 1 : 2,
        ];
    }

    /** @param array{version: int, layer: int, bitrate: int, rate: int, samples: int, channels: int} $f */
    private static function duration(string $head, int $at, array $f, int $size): ?float
    {
        // Xing / Info (VBR o CBR con total de cuadros) a una distancia fija del encabezado.
        $side = $f['version'] === 3 ? ($f['channels'] === 1 ? 17 : 32) : ($f['channels'] === 1 ? 9 : 17);
        $xing = $at + 4 + $side;
        $tag = substr($head, $xing, 4);
        if (($tag === 'Xing' || $tag === 'Info') && strlen($head) >= $xing + 12 && (ord($head[$xing + 7]) & 1)) {
            $frames = unpack('N', substr($head, $xing + 8, 4))[1];

            return $frames > 0 ? $frames * $f['samples'] / $f['rate'] : null;
        }
        $vbri = substr($head, $at + 4 + 32, 4);
        if ($vbri === 'VBRI' && strlen($head) >= $at + 4 + 32 + 18) {
            $frames = unpack('N', substr($head, $at + 4 + 32 + 14, 4))[1];

            return $frames > 0 ? $frames * $f['samples'] / $f['rate'] : null;
        }
        if ($f['bitrate'] <= 0) {
            return null;
        }
        $audioBytes = $size - $at;

        return $audioBytes > 0 ? $audioBytes * 8 / $f['bitrate'] : null;
    }
}
