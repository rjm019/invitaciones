<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Album\AlbumService;
use App\Services\Layout\EventRepository;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * GET /media/{slug}/{file}: fotos, fondos y audio de eventos/<slug>/media/.
 * Solo nombres de archivo simples del primer nivel (nada de "../").
 */
class MediaController extends Controller
{
    private const HEADERS = [
        'Cache-Control' => 'public, max-age=604800',
        'X-Robots-Tag' => 'noindex, nofollow',
        // El navegador no "adivina" otro tipo (un archivo disfrazado no se ejecuta como página).
        'X-Content-Type-Options' => 'nosniff',
    ];

    public function __invoke(string $slug, string $file, EventRepository $events): BinaryFileResponse
    {
        $path = $events->mediaFile($slug, $file);
        abort_if($path === null, 404);

        return response()->file($path, self::HEADERS);
    }

    /** GET /media/{slug}/album/{file}: solo las fotos elegidas del álbum (las pendientes nunca están aquí). */
    public function album(string $slug, string $file, AlbumService $album): BinaryFileResponse
    {
        $path = $album->publicFile($slug, $file);
        abort_if($path === null, 404);

        return response()->file($path, self::HEADERS);
    }
}
