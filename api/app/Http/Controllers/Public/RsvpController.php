<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/public/invitations/{token}/rsvp — registra nombres en los lugares libres.
 * 404 token desconocido · 409 confirmaciones cerradas · 422 datos inválidos o sin lugares.
 * Los nombres ya registrados no cambian; reenviar los mismos no duplica.
 */
class RsvpController extends Controller
{
    public function store(Request $request, string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        $closed = InvitationService::closedReason($invitation->event);
        if ($closed !== null) {
            return response()->json(['message' => $closed], 409);
        }

        $passes = $invitation->record['passes'];
        $data = $request->validate([
            'attending' => ['required', 'boolean'],
            'guests' => ['required', 'array', 'min:1', "max:{$passes}"],
            'guests.*.full_name' => ['required', 'string', 'max:120'],
        ], [
            'attending.*' => 'Dinos si podrás asistir.',
            'guests.required' => 'Escribe al menos un nombre.',
            'guests.array' => 'Escribe al menos un nombre.',
            'guests.min' => 'Escribe al menos un nombre.',
            'guests.max' => 'Tu invitación es para '.($passes === 1 ? '1 persona.' : "{$passes} personas."),
            'guests.*.full_name.required' => 'Falta el nombre de la persona :position.',
            'guests.*.full_name.string' => 'Falta el nombre de la persona :position.',
            'guests.*.full_name.max' => 'El nombre de la persona :position es muy largo (máximo 120 letras).',
        ]);

        $result = $invitations->respond(
            $invitation,
            (bool) $data['attending'],
            array_column($data['guests'], 'full_name'),
        );

        return response()->json(['invitation' => $result]);
    }
}
