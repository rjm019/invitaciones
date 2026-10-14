<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use App\Services\Media\MediaInUse;
use App\Services\Media\MediaLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use RuntimeException;

/** Imágenes y audio del evento (eventos/<slug>/media/). */
class MediaController extends Controller
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly MediaLibrary $library,
    ) {}

    /** GET /api/manager/events/{slug}/media */
    public function index(string $slug): JsonResponse
    {
        if ($this->events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }

        return response()->json($this->library->list($slug));
    }

    /**
     * POST /api/manager/events/{slug}/media — multipart { file, purpose?: fondo|foto|adorno, trim? }
     * 201 { file } · 422 tipo o tamaño · 413 demasiado grande para el servidor.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        if ($this->events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.(20 * 1024)],
            'purpose' => ['sometimes', Rule::in(['fondo', 'foto', 'adorno'])],
            'trim' => ['sometimes', 'boolean'],
        ], [
            'file.required' => 'Elige un archivo.',
            'file.uploaded' => 'El archivo no se pudo subir (quizá pesa demasiado).',
            'file.max' => 'El archivo pesa más de 20 MB.',
            'file.*' => 'Elige un archivo.',
        ]);

        try {
            $file = $this->library->store($slug, $data['file'], $data['purpose'] ?? 'foto', (bool) ($data['trim'] ?? false));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => ['file' => [$e->getMessage()]]], 422);
        }

        return response()->json(['file' => $file], 201);
    }

    /** DELETE /api/manager/events/{slug}/media/{file} — 204 · 409 si la invitación lo usa. */
    public function destroy(string $slug, string $file): JsonResponse|Response
    {
        if ($this->events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        try {
            $this->library->delete($slug, $file);
        } catch (MediaInUse $e) {
            return response()->json(['message' => $e->getMessage(), 'used_in' => $e->usedIn], 409);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        return response()->noContent();
    }
}
