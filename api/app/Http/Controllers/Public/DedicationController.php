<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\DedicationStore;
use App\Services\Invitations\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/public/invitations/{token}/dedication — la dedicatoria del enlace.
 * Una por invitación: si ya hay una, 409 y no cambia. 404 token desconocido · 422 datos
 * inválidos. No depende de la fecha límite de las confirmaciones.
 */
class DedicationController extends Controller
{
    public function store(Request $request, string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        $maxName = DedicationStore::MAX_NAME;
        $maxMessage = DedicationStore::MAX_MESSAGE;
        $data = $request->validate([
            'name' => ['required', 'string', "max:{$maxName}"],
            'message' => ['required', 'string', "max:{$maxMessage}"],
        ], [
            'name.required' => 'Escribe tu nombre.',
            'name.string' => 'Escribe tu nombre.',
            'name.max' => "Tu nombre es muy largo (máximo {$maxName} letras).",
            'message.required' => 'Escribe tu dedicatoria.',
            'message.string' => 'Escribe tu dedicatoria.',
            'message.max' => "Tu dedicatoria es muy larga (máximo {$maxMessage} letras).",
        ]);

        return response()->json([
            'invitation' => $invitations->dedicate($invitation, $data['name'], $data['message']),
        ]);
    }
}
