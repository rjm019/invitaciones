<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * GET /media/{slug}/{file}: fotos, fondos y audio de eventos/<slug>/media/.
 * Solo nombres de archivo simples del primer nivel (nada de "../").
 */
class MediaController extends Controller
{
    public function __invoke(string $slug, string $file, EventRepository $events): BinaryFileResponse
    {
        $path = $events->mediaFile($slug, $file);
        abort_if($path === null, 404);

        return response()->file($path, [
            'Cache-Control' => 'public, max-age=604800',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }
}
