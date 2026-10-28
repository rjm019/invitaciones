<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\DedicationStore;
use App\Services\Invitations\InvitationService;
use App\Services\Layout\EventRepository;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/public/events/{slug}/dedications y GET /api/public/invitations/{token}/dedications:
 * el muro de dedicatorias (solo lectura). Responde `{dedications: [{name, message}]}`, las más
 * recientes primero (máximo DedicationStore::WALL_LIMIT), sin token, `para`, id ni fecha.
 * 404 si el evento no existe o no está publicado, o si ninguna sección de dedicatorias
 * tiene `muro` encendido. En una muestra (demo) la lista va vacía: nada se guarda.
 */
class DedicationWallController extends Controller
{
    public function byEvent(string $slug, EventRepository $events, DedicationStore $store): JsonResponse
    {
        $config = $events->find($slug);
        if ($config === null || ! $config['published']) {
            return $this->notFound();
        }

        return $this->wall($slug, $config, $store);
    }

    public function byInvitation(string $token, InvitationService $invitations, DedicationStore $store): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return $this->notFound();
        }

        return $this->wall($invitation->slug, $invitation->event, $store);
    }

    /** @param  array<string, mixed>  $config */
    private function wall(string $slug, array $config, DedicationStore $store): JsonResponse
    {
        $enabled = false;
        foreach ($config['sections'] ?? [] as $section) {
            if (($section['type'] ?? '') === 'dedications' && ($section['wall'] ?? false) === true) {
                $enabled = true;
            }
        }
        if (! $enabled) {
            return $this->notFound();
        }

        return response()->json(['dedications' => ($config['demo'] ?? false) ? [] : $store->wall($slug)]);
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => 'No encontrado.'], 404);
    }
}
