<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Design\DesignConflict;
use App\Services\Design\DesignInput;
use App\Services\Design\DesignPublisher;
use App\Services\Design\DesignStore;
use App\Services\Design\PublishBlocked;
use App\Services\Layout\EventRepository;
use App\Services\Manager\DesignPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * El editor de una invitación: lo que tiene enfrente, guardar el borrador (autoguardado),
 * descartarlo, publicarlo y su historial.
 */
class DesignController extends Controller
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly DesignPayload $payload,
    ) {}

    /** GET /api/manager/events/{slug}/design */
    public function show(string $slug): JsonResponse
    {
        return $this->missing($slug) ?? response()->json($this->payload->full($slug));
    }

    /**
     * PUT /api/manager/events/{slug}/draft — { design, version }
     * → { version, has_draft, pending, config, issues, brand } · 409 si cambió en otra ventana.
     */
    public function save(Request $request, string $slug): JsonResponse
    {
        if ($missing = $this->missing($slug)) {
            return $missing;
        }
        $request->validate(['version' => ['required', 'string', 'max:80'], 'design' => ['required', 'array']], [
            'version.*' => 'Falta la versión de la invitación.',
            'design.*' => 'Falta la invitación.',
        ]);
        $design = DesignInput::parse($request->input('design'));

        try {
            $this->store->saveDraft($slug, $design, (string) $request->input('version'));
        } catch (DesignConflict $e) {
            return $this->conflict($slug, $e);
        }
        $this->events->forget($slug);

        return response()->json($this->payload->built($slug));
    }

    /** DELETE /api/manager/events/{slug}/draft — descarta los cambios sin publicar. */
    public function discard(string $slug): JsonResponse
    {
        if ($missing = $this->missing($slug)) {
            return $missing;
        }
        $this->store->discard($slug);

        return response()->json($this->payload->full($slug));
    }

    /**
     * POST /api/manager/events/{slug}/publish — { version, replace_owner_deadline? }
     * → { published_at, migrated, version } · 422 con lo que hay que corregir · 409.
     */
    public function publish(Request $request, string $slug, DesignPublisher $publisher): JsonResponse
    {
        if ($missing = $this->missing($slug)) {
            return $missing;
        }
        $data = $request->validate([
            'version' => ['required', 'string', 'max:80'],
            'replace_owner_deadline' => ['sometimes', 'boolean'],
        ], ['version.*' => 'Falta la versión de la invitación.']);

        try {
            $published = $publisher->publish($slug, $data['version'], (bool) ($data['replace_owner_deadline'] ?? false));
        } catch (DesignConflict $e) {
            return $this->conflict($slug, $e);
        } catch (PublishBlocked $e) {
            return response()->json(['message' => $e->getMessage(), 'issues' => $e->issues], 422);
        }

        return response()->json($published);
    }

    /** GET /api/manager/events/{slug}/history — las versiones publicadas antes. */
    public function history(string $slug): JsonResponse
    {
        return $this->missing($slug) ?? response()->json(['versions' => $this->store->history($slug)]);
    }

    /** POST /api/manager/events/{slug}/history/{id}/restore — esa versión pasa al borrador. */
    public function restore(string $slug, string $id): JsonResponse
    {
        if ($missing = $this->missing($slug)) {
            return $missing;
        }
        try {
            $this->store->restore($slug, $id);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        return response()->json($this->payload->full($slug));
    }

    private function missing(string $slug): ?JsonResponse
    {
        return $this->events->path($slug) === null ? response()->json(['message' => 'Evento no encontrado.'], 404) : null;
    }

    private function conflict(string $slug, DesignConflict $e): JsonResponse
    {
        return response()->json([
            'message' => 'Esta invitación se cambió en otra ventana.',
            'version' => $e->version,
            'design' => $this->store->current($slug)['design']->toArray(),
        ], 409);
    }
}
