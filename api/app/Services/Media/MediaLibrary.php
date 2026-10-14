<?php

namespace App\Services\Media;

use App\Services\Design\Design;
use App\Services\Design\DesignStore;
use App\Services\Layout\EventRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Las imágenes y el audio de un evento (eventos/<slug>/media/), como los ve el gestor.
 *
 * - Cada archivo subido recibe un nombre nuevo ("sobre-rosa-3f9a.webp"): nunca se pisa
 *   uno que ya existe, así los navegadores (que guardan media 7 días) nunca muestran uno viejo.
 * - Las imágenes se pasan a WebP (JPG, PNG, WebP o GIF); el audio va tal cual (MP3 o M4A).
 * - Se revisa lo que el archivo ES (no su extensión). Nunca SVG ni HTML: se sirven desde el
 *   mismo dominio que las sesiones.
 * - No se borra un archivo que la invitación usa (publicada o borrador).
 */
final class MediaLibrary
{
    public const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

    public const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

    private const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    private const AUDIO = ['audio/mpeg' => 'mp3', 'audio/mp3' => 'mp3', 'audio/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'video/mp4' => 'm4a'];

    /** Ancho máximo por uso: un fondo cubre toda la sección (más ancho); lo demás va a 2× de la columna. */
    private const WIDTH = ['fondo' => 1600, 'foto' => 1200, 'adorno' => 920];

    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly ImageOptimizer $optimizer,
    ) {}

    /**
     * @return array{files: list<array<string, mixed>>, total_bytes: int}
     */
    public function list(string $slug): array
    {
        $dir = $this->dir($slug).'/media';
        $usage = $this->usage($slug);
        $files = [];
        $total = 0;
        foreach (scandir($dir) ?: [] as $name) {
            if (! EventRepository::isMediaName($name) || ! is_file("{$dir}/{$name}")) {
                continue;
            }
            $files[] = $this->describe($slug, $name, $usage[$name] ?? []);
            $total += (int) filesize("{$dir}/{$name}");
        }
        usort($files, fn ($a, $b) => $b['modified'] <=> $a['modified']);

        return ['files' => $files, 'total_bytes' => $total];
    }

    /**
     * @param  string  $purpose  fondo, foto o adorno (para el ancho máximo); audio sube tal cual
     * @return array<string, mixed> el archivo ya guardado
     *
     * @throws RuntimeException con el motivo en español
     */
    public function store(string $slug, UploadedFile $file, string $purpose = 'foto', bool $trim = false): array
    {
        $dir = $this->dir($slug).'/media';
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException('No se pudo crear la carpeta de archivos.');
        }
        $path = (string) $file->getRealPath();
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        $base = $this->baseName($file->getClientOriginalName());

        if (in_array($mime, self::IMAGES, true)) {
            if ($file->getSize() > self::MAX_IMAGE_BYTES) {
                throw new RuntimeException('La imagen pesa más de 15 MB.');
            }
            // Un GIF puede estar animado: se queda como está.
            if ($mime === 'image/gif') {
                $name = $this->freeName($dir, $base, 'gif');
                copy($path, "{$dir}/{$name}");
            } else {
                $name = $this->freeName($dir, $base, 'webp');
                $this->optimizer->toWebp($path, "{$dir}/{$name}", self::WIDTH[$purpose] ?? self::WIDTH['foto'], 82, $trim);
            }
        } elseif (isset(self::AUDIO[$mime])) {
            if ($file->getSize() > self::MAX_AUDIO_BYTES) {
                throw new RuntimeException('El audio pesa más de 20 MB (ideal: 3 MB o menos).');
            }
            $name = $this->freeName($dir, $base, self::AUDIO[$mime]);
            copy($path, "{$dir}/{$name}");
        } else {
            throw new RuntimeException('Ese tipo de archivo no se puede usar. Sube una imagen (JPG, PNG, WebP o GIF) o una canción (MP3 o M4A).');
        }

        return $this->describe($slug, $name, []);
    }

    /**
     * @throws MediaInUse si la invitación (publicada o borrador) usa el archivo
     */
    public function delete(string $slug, string $name): void
    {
        $path = $this->events->mediaFile($slug, $name) ?? throw new RuntimeException('Ese archivo no existe.');
        $usage = $this->usage($slug)[$name] ?? [];
        if ($usage !== []) {
            throw new MediaInUse($usage);
        }
        unlink($path);
    }

    /**
     * Dónde usa cada archivo la invitación: en lo publicado y en el borrador.
     *
     * @return array<string, list<array{version: string, block: string, item: ?int, field: string}>>
     */
    public function usage(string $slug): array
    {
        $out = [];
        $versions = [];
        try {
            $versions['publicada'] = $this->store->published($slug)['design'];
        } catch (Throwable) {
            // Sin invitación todavía: nada la usa.
        }
        if ($this->store->hasDraft($slug)) {
            $versions['borrador'] = $this->store->current($slug)['design'];
        }
        foreach ($versions as $version => $design) {
            foreach ($this->references($design) as $ref) {
                $out[$ref['value']][] = ['version' => $version, 'block' => $ref['block'], 'item' => $ref['item'], 'field' => $ref['field']];
            }
        }

        return $out;
    }

    /**
     * Cualquier valor de la invitación que sea el nombre de un archivo.
     *
     * @return list<array{value: string, block: string, item: ?int, field: string}>
     */
    public static function references(Design $design): array
    {
        $refs = [];
        $add = function (string $block, ?int $item, array $values) use (&$refs) {
            foreach ($values as $field => $value) {
                $value = trim((string) $value);
                if (EventRepository::isMediaName($value)) {
                    $refs[] = ['value' => $value, 'block' => $block, 'item' => $item, 'field' => (string) $field];
                }
            }
        };
        foreach (['evento' => $design->event, 'pagina' => $design->page] as $block => $values) {
            $add($block, null, $values);
        }
        foreach ($design->sections as $section) {
            $add($section->id, null, $section->fields);
            foreach ($section->items as $i => $item) {
                $add($section->id, $i + 1, $item);
            }
        }

        return $refs;
    }

    /**
     * @param  list<array<string, mixed>>  $usage
     * @return array<string, mixed>
     */
    private function describe(string $slug, string $name, array $usage): array
    {
        $path = $this->dir($slug).'/media/'.$name;
        $kind = preg_match('/\.(mp3|m4a|ogg)$/i', $name) ? 'audio' : 'image';
        $size = $kind === 'image' ? @getimagesize($path) : false;

        return [
            'name' => $name,
            'url' => url("/media/{$slug}/{$name}"),
            'kind' => $kind,
            'bytes' => (int) filesize($path),
            'width' => $size ? $size[0] : null,
            'height' => $size ? $size[1] : null,
            'modified' => (int) filemtime($path),
            'used_in' => $usage,
        ];
    }

    /** "Foto Salón (1).JPG" → "foto-salon-1". */
    private function baseName(string $original): string
    {
        $base = Str::slug(pathinfo($original, PATHINFO_FILENAME));

        return substr($base !== '' ? $base : 'archivo', 0, 40);
    }

    /** Un nombre que no existe: "<base>-<4 hex>.<ext>". */
    private function freeName(string $dir, string $base, string $ext): string
    {
        do {
            $name = "{$base}-".bin2hex(random_bytes(2)).".{$ext}";
        } while (file_exists("{$dir}/{$name}"));

        return $name;
    }

    private function dir(string $slug): string
    {
        return $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
    }
}
