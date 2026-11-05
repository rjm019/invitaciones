<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Album\AlbumService;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Layout\LayoutException;
use App\Services\Panel\PanelService;
use App\Services\Reminders\ReminderPlanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Panel del dueño (con sesión): lista de invitaciones, generar y eliminar enlaces y cambiar la fecha límite.
 */
class PanelController extends Controller
{
    private const PHONE_MESSAGE = 'Escribe un teléfono de 10 dígitos o con lada internacional (+…).';

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

    /** GET /api/admin/events/{slug}/trivia.csv — el ranking de la trivia (UTF-8 con BOM, para Excel). */
    public function triviaCsv(string $slug, PanelService $panel): Response
    {
        return response($panel->triviaCsv($slug), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="trivia-'.$slug.'.csv"',
        ]);
    }

    /** GET /api/admin/events/{slug}/album/{id}/{photo|thumb} — una foto del álbum (pendiente o elegida), solo con la sesión del panel. */
    public function albumPhoto(string $slug, string $id, string $kind, AlbumService $album): BinaryFileResponse
    {
        $path = $album->panelFile($slug, $id, $kind === 'thumb');
        abort_if($path === null, 404);

        return response()->file($path, [
            'Cache-Control' => 'private, max-age=300',
            'X-Robots-Tag' => 'noindex, nofollow',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** PUT /api/admin/events/{slug}/album — { ids: [...], action: choose|unchoose|reject }. Devuelve el panel. */
    public function albumDecide(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['required', 'string', 'regex:/^[a-f0-9]{16}$/'],
            'action' => ['required', 'in:choose,unchoose,reject'],
        ], [
            'ids.*' => 'Elige al menos una foto.',
            'action.*' => 'Elige qué hacer con las fotos.',
        ]);

        return response()->json($panel->decideAlbum($slug, array_values($data['ids']), $data['action']));
    }

    /** GET /api/admin/events/{slug}/album.zip — las fotos elegidas, armadas al vuelo y enviadas en streaming. */
    public function albumZip(string $slug, AlbumService $album): BinaryFileResponse
    {
        $zip = $album->zip($slug);

        return response()->download($zip['path'], $zip['name'], ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
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

    /** POST /api/admin/events/{slug}/invitations — { passes, label?, phone? } */
    public function storeInvitation(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $max = InvitationStore::MAX_PASSES;
        $data = $request->validate([
            'passes' => ['required', 'integer', 'min:1', "max:{$max}"],
            'label' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:40'],
        ], [
            'passes.*' => "Escribe para cuántos invitados es (de 1 a {$max}).",
            'label.*' => 'El nombre puede tener hasta 80 letras.',
            'phone.*' => self::PHONE_MESSAGE,
        ]);

        $label = trim((string) preg_replace('/\s+/u', ' ', (string) ($data['label'] ?? '')));

        return response()->json(['invitation' => $panel->createInvitation($slug, (int) $data['passes'], $label, $data['phone'] ?? null)], 201);
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

    /** PUT /api/admin/events/{slug}/deadline-notice — { text: string|null } (vacío restaura el de siempre) */
    public function updateDeadlineNotice(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $data = $request->validate(['text' => ['present', 'nullable', 'string', 'max:160']], [
            'text.max' => 'El aviso lleva hasta 160 caracteres.',
            'text.*' => 'Escribe el texto del aviso.',
        ]);

        return response()->json(['rsvp' => $panel->changeDeadlineNotice($slug, $data['text'])]);
    }

    /** PUT /api/admin/events/{slug}/invitations/{id}/phone — { phone: string|null } (vacío lo quita). Devuelve el panel. */
    public function updatePhone(Request $request, string $slug, string $id, PanelService $panel): JsonResponse
    {
        $data = $request->validate(['phone' => ['nullable', 'string', 'max:40']], ['phone.*' => self::PHONE_MESSAGE]);

        return response()->json($panel->updatePhone($slug, $id, $data['phone'] ?? null));
    }

    /** PUT /api/admin/events/{slug}/reminders — { every_days: 0|2|3|5|7, consent: boolean }. Devuelve el panel. */
    public function updateReminders(Request $request, string $slug, PanelService $panel): JsonResponse
    {
        $data = $request->validate([
            'every_days' => ['required', 'integer', Rule::in([0, ...ReminderPlanner::OPTIONS])],
            'consent' => ['required', 'boolean'],
        ], [
            'every_days.*' => 'Elige cada cuántos días recordar.',
            'consent.*' => 'Confirma que tienes permiso de tus invitados para escribirles por WhatsApp.',
        ]);

        return response()->json($panel->updateReminders($slug, (int) $data['every_days'], (bool) $data['consent']));
    }
}
