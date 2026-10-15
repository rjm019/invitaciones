<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Layout\LayoutException;
use App\Services\Panel\PanelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Panel del dueño (con sesión): lista de invitaciones, generar y eliminar enlaces y cambiar la fecha límite.
 */
class PanelController extends Controller
{
    /** GET /api/admin/events/{slug} */
    public function show(string $slug, PanelService $panel): JsonResponse
    {
        try {
            return response()->json($panel->overview($slug));
        } catch (LayoutException $e) {
            // El dueño ya entró con su clave: aquí sí ve qué corregir en su Excel.
            return response()->json(['message' => 'El layout del evento tiene errores.', 'errors' => $e->errors], 503);
        }
    }

    /** GET /api/admin/events/{slug}/version — huella para saber si hay algo nuevo. */
    public function version(string $slug, PanelService $panel): JsonResponse
    {
        return response()->json(['version' => $panel->version($slug)]);
    }

    /**
     * PUT /api/admin/events/{slug}/tables — { assignments: [{ invitation, slot, table|null }] }
     * Una persona o toda una invitación de una vez. Devuelve el panel actualizado.
     */
    public function updateTables(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $max = ResponseStore::MAX_TABLE;
        $data = $request->validate([
            'assignments' => ['required', 'array', 'min:1', 'max:500'],
            'assignments.*.invitation' => ['required', 'string', 'max:10'],
            'assignments.*.slot' => ['required', 'integer', 'min:1'],
            'assignments.*.table' => ['nullable', 'integer', 'min:1', "max:{$max}"],
        ], [
            'assignments.*.table.*' => "La mesa debe ser un número de 1 a {$max}.",
            'assignments.*' => 'Elige a quién asignarle la mesa.',
            'assignments.*.*' => 'Elige a quién asignarle la mesa.',
        ]);

        $assignments = array_map(fn ($a) => [
            'invitation' => (string) $a['invitation'],
            'slot' => (int) $a['slot'],
            'table' => isset($a['table']) ? (int) $a['table'] : null,
        ], $data['assignments']);

        return response()->json($panel->assignTables($slug, $assignments));
    }

    /** POST /api/admin/events/{slug}/invitations — { passes, label? } */
    public function storeInvitation(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $max = InvitationStore::MAX_PASSES;
        $data = $request->validate([
            'passes' => ['required', 'integer', 'min:1', "max:{$max}"],
            'label' => ['nullable', 'string', 'max:80'],
        ], [
            'passes.*' => "Escribe para cuántos invitados es (de 1 a {$max}).",
            'label.*' => 'El nombre puede tener hasta 80 letras.',
        ]);

        $label = trim((string) preg_replace('/\s+/u', ' ', (string) ($data['label'] ?? '')));

        return response()->json(['invitation' => $panel->createInvitation($slug, (int) $data['passes'], $label)], 201);
    }

    /**
     * DELETE /api/admin/events/{slug}/invitations/{id} — elimina la invitación con sus
     * invitados y su dedicatoria. Devuelve el panel actualizado.
     */
    public function destroyInvitation(string $slug, string $id, PanelService $panel): JsonResponse
    {
        return response()->json($panel->deleteInvitation($slug, $id));
    }

    /** PUT /api/admin/events/{slug}/deadline — { deadline: AAAA-MM-DD } (hasta 3 cambios) */
    public function updateDeadline(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $data = $request->validate(['deadline' => ['required', 'date_format:Y-m-d']], [
            'deadline.*' => 'Elige una fecha válida.',
        ]);

        return response()->json(['rsvp' => $panel->changeDeadline($slug, $data['deadline'])]);
    }
}
