<?php

namespace App\Services\Album;

use App\Services\Csv\CsvFile;
use App\Services\Design\DesignSection;
use App\Services\Design\Normalizer;
use App\Services\Invitations\Invitation;
use App\Services\Invitations\InvitationService;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\RsvpException;
use App\Services\Layout\EventRepository;
use App\Services\Media\ImageOptimizer;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

/**
 * Álbum de los invitados (sección `album`). Sin base de datos: album.csv es la bitácora
 * (id, invitacion, para, archivo, ancho, alto, estado, subida, decidida) y las fotos viven en
 * eventos/<slug>/album/ (fuera de /media: nadie las ve hasta que el dueño las elige). Las
 * elegidas se copian a eventos/<slug>/media/album/, que Apache sirve directo.
 *
 * Calendario (zona horaria del evento): antes del día del evento no se sube; desde las 00:00
 * de ese día sí; el día siguiente cuenta el día 1 de `album_dias` (5 a 20) y sigue abierto
 * hasta que termina el último; entonces se borra todo el álbum (closeIfDue, perezoso e
 * idempotente) y el evento responde 410. El panel y los CSV se quedan.
 */
final class AlbumService
{
    public const FILE = 'album.csv';

    public const HEADERS = ['id', 'invitacion', 'para', 'archivo', 'ancho', 'alto', 'estado', 'subida', 'decidida'];

    public const DELETED = 'album-eliminadas.csv';

    public const ENDED = 'Este evento ya terminó. ¡Gracias por acompañarnos!';

    public const PER_INVITATION = 2;

    public const MIN_DAYS = 5;

    public const MAX_DAYS = 20;

    public const DEFAULT_MAX_MB = 300;

    /** Lo que se rechaza sin procesar. */
    public const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

    public const MAX_SOURCE_SIDE = 4096;

    public const PHOTO_SIDE = 1600;

    public const PHOTO_QUALITY = 80;

    /** El panel avisa a partir de este porcentaje del tope. */
    public const WARN_PERCENT = 80;

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
        private readonly ImageOptimizer $images,
        private readonly InvitationStore $invitations,
    ) {}

    /** `album_dias` acotado a 5–20 (vacío o inválido: 5). */
    public static function clampDays(mixed $value): int
    {
        return is_numeric($value) ? max(self::MIN_DAYS, min(self::MAX_DAYS, (int) $value)) : self::MIN_DAYS;
    }

    /** `album_max_mb` acotado a 10–5000 (vacío o inválido: 300). */
    public static function clampMaxMb(mixed $value): int
    {
        return is_numeric($value) ? max(10, min(5000, (int) $value)) : self::DEFAULT_MAX_MB;
    }

    /**
     * El calendario del álbum. `state`: before (aún no es el día) · event_day (se sube) ·
     * after (del día siguiente al último día: se sigue subiendo y se ve el álbum) · closed.
     *
     * @return array{state: string, event_day: string, opens_at: string, closes_at: string, last_day: string, days: int}
     */
    public static function window(CarbonImmutable $startsAt, string $timezone, int $days, CarbonImmutable $now): array
    {
        $day = $startsAt->setTimezone($timezone)->startOfDay();
        $now = $now->setTimezone($timezone);
        $closes = $day->addDays($days + 1);
        $state = match (true) {
            $now->lessThan($day) => 'before',
            $now->lessThan($day->addDay()) => 'event_day',
            $now->lessThan($closes) => 'after',
            default => 'closed',
        };

        return [
            'state' => $state,
            'event_day' => $day->format('Y-m-d'),
            'opens_at' => $day->toIso8601String(),
            'closes_at' => $closes->toIso8601String(),
            'last_day' => $day->addDays($days)->format('Y-m-d'),
            'days' => $days,
        ];
    }

    /** La sección `album` visible del evento publicado, o null si no tiene. */
    public function section(string $slug): ?DesignSection
    {
        $section = $this->events->design($slug)?->first('album');

        return $section !== null && $section->visible() ? $section : null;
    }

    /**
     * El calendario de este evento; null si no tiene álbum o no se sabe cuándo es. Una
     * muestra (demo) nunca cierra: siempre está "después", con todo habilitado.
     *
     * @return array{state: string, event_day: ?string, opens_at: ?string, closes_at: ?string, last_day: ?string, days: int}|null
     */
    public function windowFor(string $slug, ?CarbonImmutable $now = null): ?array
    {
        $section = $this->section($slug);
        if ($section === null) {
            return null;
        }
        $days = self::clampDays($section->field('album_dias'));
        if ($this->isDemo($slug)) {
            return ['state' => 'after', 'event_day' => null, 'opens_at' => null, 'closes_at' => null, 'last_day' => null, 'days' => $days];
        }
        $design = $this->events->design($slug);
        $timezone = $design?->event('zona_horaria') ?? 'America/Mexico_City';
        if (! Normalizer::timezone($timezone)) {
            $timezone = 'America/Mexico_City';
        }
        $start = Normalizer::dateTime($design?->event('inicia') ?? '', $timezone);
        if ($start === null) {
            return null;
        }

        return self::window($start, $timezone, $days, $now ?? CarbonImmutable::now($timezone));
    }

    /**
     * Al inicio de cada petición pública o del panel: cierra el álbum si ya le tocaba y, si el
     * evento ya terminó, responde 410 (EventEnded). Barato: una fecha; solo borra una vez.
     *
     * @param  array<string, mixed>  $event  config del evento (para los colores del 410)
     *
     * @throws EventEnded
     */
    public function guard(string $slug, array $event): void
    {
        $this->closeIfDue($slug);
        if (($this->windowFor($slug)['state'] ?? null) === 'closed') {
            throw new EventEnded([
                'title' => (string) ($event['title'] ?? ''),
                'theme' => (string) ($event['theme'] ?? ''),
                'palette' => (array) ($event['palette'] ?? []),
                'fonts' => (array) ($event['fonts'] ?? []),
            ]);
        }
    }

    /**
     * Borra el álbum completo si ya terminó su último día y lo anota en album.csv. Perezoso
     * (corre en la primera petición después del cierre), bajo candado e idempotente.
     * Devuelve true solo la vez que borró algo.
     */
    public function closeIfDue(string $slug, ?CarbonImmutable $now = null): bool
    {
        $dir = $this->events->path($slug);
        $window = $dir === null ? null : $this->windowFor($slug, $now);
        if ($window === null || $window['state'] !== 'closed') {
            return false;
        }
        $private = $dir.'/album';
        $public = $dir.'/media/album';
        $path = $dir.'/'.self::FILE;
        if (! is_dir($private) && ! is_dir($public) && ! is_file($path)) {
            return false;
        }

        return $this->csv->locked($path, function () use ($path, $private, $public, $window, $now) {
            $rows = $this->csv->read($path);
            $pending = array_filter($rows, fn ($r) => ! in_array($r['estado'] ?? '', ['rechazada', 'borrada'], true));
            if (! is_dir($private) && ! is_dir($public) && $pending === []) {
                return false;
            }
            File::deleteDirectory($private);
            File::deleteDirectory($public);
            $at = ($now ?? CarbonImmutable::parse($window['closes_at']))->format('Y-m-d H:i:s');
            $this->csv->backupDaily($path, $now ?? CarbonImmutable::now());
            $this->csv->write($path, self::HEADERS, array_map(function ($r) use ($at) {
                if (! in_array($r['estado'] ?? '', ['rechazada', 'borrada'], true)) {
                    $r['estado'] = 'borrada';
                    $r['decidida'] = $at;
                }

                return $r;
            }, $rows));

            return true;
        });
    }

    /**
     * Estado del álbum para el enlace personal; null si el evento no tiene álbum.
     *
     * @return array{state: string, can_upload: bool, used: int, remaining: int, max: int, closes_at: ?string, last_day: ?string}|null
     */
    public function present(Invitation $invitation): ?array
    {
        $window = $this->windowFor($invitation->slug);
        if ($this->section($invitation->slug) === null) {
            return null;
        }
        $used = $this->isDemo($invitation->slug) ? 0 : $this->countMine($invitation->slug, $invitation->record['id']);
        $state = $window['state'] ?? 'before';
        $open = in_array($state, ['event_day', 'after'], true);

        return [
            'state' => $state,
            'can_upload' => $open && $used < self::PER_INVITATION,
            'used' => $used,
            'remaining' => max(0, self::PER_INVITATION - $used),
            'max' => self::PER_INVITATION,
            'closes_at' => $window['closes_at'] ?? null,
            'last_day' => $window['last_day'] ?? null,
        ];
    }

    /**
     * Sube una foto de este enlace: máximo 2 por invitación (revisado dentro del candado; una
     * rechazada libera su lugar). Se re-codifica a WebP de 1600 px q80 con miniatura de 480 px
     * y sin EXIF. En una muestra no se guarda nada.
     *
     * @return array{id: ?string}
     *
     * @throws RsvpException 404 sin álbum · 409 aún no es el día · 422 foto inválida o 2 ya subidas · 507 tope del evento
     */
    public function upload(Invitation $invitation, UploadedFile $file): array
    {
        $slug = $invitation->slug;
        $section = $this->section($slug) ?? throw new RsvpException('Esta invitación no tiene álbum.', 404);
        $window = $this->windowFor($slug);
        $state = $window['state'] ?? 'before';
        if ($state === 'before') {
            throw new RsvpException('Todavía no es el día de la fiesta. ¡Ese día podrás subir tus fotos aquí!', 409);
        }
        if ($state === 'closed') {
            throw new RsvpException(self::ENDED, 410);
        }

        $source = (string) $file->getRealPath();
        if ($file->getSize() > self::MAX_UPLOAD_BYTES) {
            throw new RsvpException('La foto pesa más de 8 MB. Elige otra o reduce su tamaño.', 422, 'photo');
        }
        $size = @getimagesize($source);
        if ($size === false || ! in_array($size[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            throw new RsvpException('No pudimos leer esa foto. Prueba con una imagen JPG, PNG o WebP.', 422, 'photo');
        }
        if (max($size[0], $size[1]) > self::MAX_SOURCE_SIDE) {
            throw new RsvpException('La foto es demasiado grande (más de 4096 píxeles). Elige otra o reduce su tamaño.', 422, 'photo');
        }

        if ($this->isDemo($slug)) {
            return ['id' => null];
        }

        $dir = $this->events->path($slug) ?? throw new RsvpException(InvitationService::NOT_FOUND, 404);
        $path = $dir.'/'.self::FILE;
        $maxBytes = self::clampMaxMb($section->field('album_max_mb')) * 1024 * 1024;
        $now = CarbonImmutable::now($invitation->event['timezone']);

        return $this->csv->locked($path, function () use ($invitation, $dir, $path, $source, $maxBytes, $now) {
            $slug = $invitation->slug;
            $id = $invitation->record['id'];
            if (! $this->invitations->active($slug, $id)) {
                throw new RsvpException(InvitationService::NOT_FOUND, 404);
            }
            $rows = $this->csv->read($path);
            $mine = count(array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') === $id && $this->counts($r)));
            if ($mine >= self::PER_INVITATION) {
                throw new RsvpException('Ya subiste tus '.self::PER_INVITATION.' fotos. ¡Gracias por compartirlas!', 422, 'photo');
            }
            $full = new RsvpException('El álbum ya está lleno y no recibe más fotos. ¡Gracias por querer compartir!', 507);
            $used = $this->usedBytes($dir);
            if ($used >= $maxBytes) {
                throw $full;
            }

            $folder = $dir.'/album';
            if (! is_dir($folder) && ! mkdir($folder, 0775, true) && ! is_dir($folder)) {
                throw new RuntimeException("No se pudo crear {$folder}");
            }
            $photoId = bin2hex(random_bytes(8));
            $name = $photoId.'.webp';
            $target = $folder.'/'.$name;
            try {
                $dimensions = $this->images->toWebp($source, $target, self::PHOTO_SIDE, self::PHOTO_QUALITY, maxSide: self::PHOTO_SIDE);
                $this->images->makeThumbnail($target, $folder.'/'.ImageOptimizer::thumbName($name));
            } catch (RuntimeException $e) {
                $this->forget($folder, $name);
                throw new RsvpException('No pudimos procesar esa foto. Prueba con otra.', 422, 'photo');
            }
            $thumb = $folder.'/'.ImageOptimizer::thumbName($name);
            if ($used + (int) @filesize($target) + (is_file($thumb) ? (int) filesize($thumb) : 0) > $maxBytes) {
                $this->forget($folder, $name);
                throw $full;
            }

            $rows[] = [
                'id' => $photoId,
                'invitacion' => $id,
                'para' => CsvFile::safe($invitation->record['label']),
                'archivo' => $name,
                'ancho' => (string) $dimensions['width'],
                'alto' => (string) $dimensions['height'],
                'estado' => 'pendiente',
                'subida' => $now->format('Y-m-d H:i:s'),
                'decidida' => '',
            ];
            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, $rows);

            return ['id' => $photoId];
        });
    }

    /**
     * Las fotos elegidas para la invitación pública (formato de galería), de la carpeta que
     * Apache sirve. Nunca las pendientes.
     *
     * @return list<array<string, mixed>>
     */
    public function publicPhotos(string $slug): array
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            return [];
        }
        $base = url("/media/{$slug}/album");
        $out = [];
        foreach ($this->csv->read($dir.'/'.self::FILE) as $row) {
            $name = $row['archivo'] ?? '';
            if (($row['estado'] ?? '') !== 'elegida' || ! $this->validName($name) || ! is_file($dir.'/media/album/'.$name)) {
                continue;
            }
            $entry = ['photo' => "{$base}/{$name}", 'caption' => '', 'width' => (int) $row['ancho'], 'height' => (int) $row['alto']];
            $thumb = $dir.'/media/album/'.ImageOptimizer::thumbName($name);
            $thumbSize = is_file($thumb) ? @getimagesize($thumb) : false;
            if ($thumbSize !== false) {
                $entry['thumb'] = "{$base}/".ImageOptimizer::thumbName($name);
                $entry['thumb_width'] = (int) $thumbSize[0];
            }
            $out[] = $entry;
        }

        return $out;
    }

    /** Ruta de una foto elegida servida por Laravel (desarrollo); null si no existe o no está elegida. */
    public function publicFile(string $slug, string $file): ?string
    {
        $dir = $this->events->path($slug);
        if ($dir === null || ! preg_match('/^[a-f0-9]{16}(-'.ImageOptimizer::THUMB_SIDE.')?\.webp$/', $file)) {
            return null;
        }
        $path = $dir.'/media/album/'.$file;

        return is_file($path) ? $path : null;
    }

    /**
     * Lo que ve el dueño en la pestaña "Álbum": las fotos pendientes y elegidas (la más
     * reciente primero), el espacio y cuándo se borra. null si el evento no tiene álbum.
     *
     * @param  array<string, mixed>  $event
     * @param  array<string, array{label: string}>  $records
     * @return array<string, mixed>|null
     */
    public function panel(string $slug, array $event, array $records): ?array
    {
        $section = $this->section($slug);
        $dir = $this->events->path($slug);
        if ($section === null || $dir === null) {
            return null;
        }
        $window = $this->windowFor($slug);
        $closed = ($window['state'] ?? null) === 'closed';
        $maxBytes = self::clampMaxMb($section->field('album_max_mb')) * 1024 * 1024;
        $used = $this->usedBytes($dir);

        $photos = [];
        $counts = ['pending' => 0, 'chosen' => 0];
        if (! $closed) {
            foreach (array_reverse($this->csv->read($dir.'/'.self::FILE)) as $row) {
                $status = match ($row['estado'] ?? '') {
                    'pendiente' => 'pending',
                    'elegida' => 'chosen',
                    default => null,
                };
                if ($status === null) {
                    continue;
                }
                $counts[$status]++;
                $label = $records[$row['invitacion'] ?? '']['label'] ?? CsvFile::unsafe($row['para'] ?? '');
                $photos[] = [
                    'id' => $row['id'],
                    'invitation' => $row['invitacion'],
                    'label' => $label !== '' ? $label : null,
                    'status' => $status,
                    'width' => (int) ($row['ancho'] ?? 0),
                    'height' => (int) ($row['alto'] ?? 0),
                    'uploaded_at' => $this->iso($row['subida'] ?? '', $event['timezone']),
                ];
            }
        }

        return [
            'state' => $window['state'] ?? 'before',
            'closes_at' => $window['closes_at'] ?? null,
            'last_day' => $window['last_day'] ?? null,
            'days' => $window['days'] ?? self::clampDays($section->field('album_dias')),
            'used_bytes' => $used,
            'max_bytes' => $maxBytes,
            'percent' => $maxBytes > 0 ? min(100, (int) round($used * 100 / $maxBytes)) : 0,
            'near_limit' => $maxBytes > 0 && $used * 100 >= $maxBytes * self::WARN_PERCENT,
            'counts' => $counts,
            'photos' => $photos,
        ];
    }

    /**
     * Elegir (pendiente → elegida: se copia a media/album), quitar (elegida → pendiente) o
     * rechazar (borra el archivo al instante y libera el lugar de esa invitación).
     *
     * @param  list<string>  $ids
     * @param  'choose'|'unchoose'|'reject'  $action
     * @return int cuántas fotos cambiaron
     *
     * @throws RsvpException 404 sin álbum · 409 si ya se borró
     */
    public function decide(string $slug, array $ids, string $action, CarbonImmutable $now): int
    {
        $this->section($slug) ?? throw new RsvpException('Este evento no tiene álbum.', 404);
        $dir = $this->events->path($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
        if (($this->windowFor($slug)['state'] ?? null) === 'closed') {
            throw new RsvpException('El álbum ya se borró.', 409);
        }
        $path = $dir.'/'.self::FILE;
        $ids = array_flip($ids);

        return $this->csv->locked($path, function () use ($dir, $path, $ids, $action, $now) {
            $changed = 0;
            $rows = $this->csv->read($path);
            foreach ($rows as &$row) {
                if (! isset($ids[$row['id'] ?? '']) || ! $this->validName($row['archivo'] ?? '')) {
                    continue;
                }
                $name = $row['archivo'];
                $state = $row['estado'] ?? '';
                if ($action === 'choose' && $state === 'pendiente') {
                    $this->publish($dir, $name);
                    $row['estado'] = 'elegida';
                } elseif ($action === 'unchoose' && $state === 'elegida') {
                    $this->unpublish($dir, $name);
                    $row['estado'] = 'pendiente';
                } elseif ($action === 'reject' && in_array($state, ['pendiente', 'elegida'], true)) {
                    $this->unpublish($dir, $name);
                    $this->forget($dir.'/album', $name);
                    $row['estado'] = 'rechazada';
                } else {
                    continue;
                }
                $row['decidida'] = $now->format('Y-m-d H:i:s');
                $changed++;
            }
            unset($row);
            if ($changed > 0) {
                $this->csv->backupDaily($path, $now);
                $this->csv->write($path, self::HEADERS, $rows);
            }

            return $changed;
        });
    }

    /**
     * Ruta de una foto (o su miniatura) para el panel: la pendiente o la elegida; null si no existe.
     */
    public function panelFile(string $slug, string $id, bool $thumb): ?string
    {
        $dir = $this->events->path($slug);
        if ($dir === null || ! preg_match('/^[a-f0-9]{16}$/', $id)) {
            return null;
        }
        foreach ($this->csv->read($dir.'/'.self::FILE) as $row) {
            if (($row['id'] ?? '') !== $id || ! in_array($row['estado'] ?? '', ['pendiente', 'elegida'], true) || ! $this->validName($row['archivo'] ?? '')) {
                continue;
            }
            $name = $row['archivo'];
            foreach ($thumb ? [ImageOptimizer::thumbName($name), $name] : [$name] as $candidate) {
                if (is_file($dir.'/album/'.$candidate)) {
                    return $dir.'/album/'.$candidate;
                }
            }
        }

        return null;
    }

    /**
     * El .zip de las fotos elegidas: se arma en un archivo temporal (sin cargar las fotos en
     * memoria, sin comprimir: ya son WebP) para enviarlo por streaming.
     *
     * @return array{path: string, name: string}
     *
     * @throws RsvpException 404 sin álbum o sin fotos elegidas · 409 si ya se borró
     */
    public function zip(string $slug): array
    {
        $this->section($slug) ?? throw new RsvpException('Este evento no tiene álbum.', 404);
        $dir = $this->events->path($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
        if (($this->windowFor($slug)['state'] ?? null) === 'closed') {
            throw new RsvpException('El álbum ya se borró.', 409);
        }
        $chosen = array_values(array_filter(
            $this->csv->read($dir.'/'.self::FILE),
            fn ($r) => ($r['estado'] ?? '') === 'elegida' && $this->validName($r['archivo'] ?? '') && is_file($dir.'/media/album/'.$r['archivo']),
        ));
        if ($chosen === []) {
            throw new RsvpException('Todavía no hay fotos elegidas para descargar.', 404);
        }

        $tmp = tempnam(sys_get_temp_dir(), 'album');
        $zip = new ZipArchive;
        if ($tmp === false || $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('No se pudo armar el .zip.');
        }
        foreach ($chosen as $i => $row) {
            $who = Str::slug(CsvFile::unsafe($row['para'] ?? '')) ?: 'invitacion-'.$row['invitacion'];
            $entry = sprintf('%03d-%s.webp', $i + 1, $who);
            $zip->addFile($dir.'/media/album/'.$row['archivo'], $entry);
            $zip->setCompressionName($entry, ZipArchive::CM_STORE);
        }
        $zip->close();

        return ['path' => $tmp, 'name' => "album-{$slug}.zip"];
    }

    /** Quita las fotos de una invitación eliminada (el registro pasa a album-eliminadas.csv). */
    public function removeInvitation(string $slug, string $invitationId, CarbonImmutable $now): bool
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            return false;
        }
        $path = $dir.'/'.self::FILE;
        if (! is_file($path)) {
            return false;
        }

        return $this->csv->locked($path, function () use ($dir, $path, $invitationId, $now) {
            $rows = $this->csv->read($path);
            $mine = array_values(array_filter($rows, fn ($r) => ($r['invitacion'] ?? '') === $invitationId && $this->counts($r)));
            if ($mine === []) {
                return false;
            }
            foreach ($mine as $row) {
                if ($this->validName($row['archivo'] ?? '')) {
                    $this->unpublish($dir, $row['archivo']);
                    $this->forget($dir.'/album', $row['archivo']);
                }
                $this->csv->append($dir.'/'.self::DELETED, ['eliminada', ...self::HEADERS], ['eliminada' => $now->format('Y-m-d H:i:s')] + $row);
            }
            $this->csv->backupDaily($path, $now);
            $this->csv->write($path, self::HEADERS, array_values(array_filter(
                $rows,
                fn ($r) => ! (($r['invitacion'] ?? '') === $invitationId && $this->counts($r)),
            )));

            return true;
        });
    }

    /** Bytes del álbum en disco (privadas y elegidas, con miniaturas). */
    public function usedBytes(string $eventDir): int
    {
        $total = 0;
        foreach ([$eventDir.'/album', $eventDir.'/media/album'] as $folder) {
            foreach (glob($folder.'/*') ?: [] as $file) {
                $total += is_file($file) ? (int) filesize($file) : 0;
            }
        }

        return $total;
    }

    private function isDemo(string $slug): bool
    {
        return Normalizer::yes($this->events->settings($slug)['demo'] ?? 'NO');
    }

    private function countMine(string $slug, string $invitationId): int
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            return 0;
        }

        return count(array_filter(
            $this->csv->read($dir.'/'.self::FILE),
            fn ($r) => ($r['invitacion'] ?? '') === $invitationId && $this->counts($r),
        ));
    }

    /** ¿Esta foto ocupa un lugar de su invitación? (la rechazada o borrada no) */
    private function counts(array $row): bool
    {
        return in_array($row['estado'] ?? '', ['pendiente', 'elegida'], true);
    }

    private function validName(string $name): bool
    {
        return (bool) preg_match('/^[a-f0-9]{16}\.webp$/', $name);
    }

    /** Copia la foto (y su miniatura) a media/album/ para que Apache la sirva. */
    private function publish(string $dir, string $name): void
    {
        $target = $dir.'/media/album';
        if (! is_dir($target) && ! mkdir($target, 0775, true) && ! is_dir($target)) {
            throw new RuntimeException("No se pudo crear {$target}");
        }
        foreach ([$name, ImageOptimizer::thumbName($name)] as $file) {
            if (is_file($dir.'/album/'.$file)) {
                copy($dir.'/album/'.$file, $target.'/'.$file);
            }
        }
    }

    private function unpublish(string $dir, string $name): void
    {
        $this->forget($dir.'/media/album', $name);
    }

    /** Borra una foto y su miniatura de una carpeta. */
    private function forget(string $folder, string $name): void
    {
        foreach ([$name, ImageOptimizer::thumbName($name)] as $file) {
            @unlink($folder.'/'.$file);
        }
    }

    private function iso(string $local, string $timezone): ?string
    {
        if ($local === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($local, $timezone)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
