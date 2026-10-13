<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\InvitationService;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/public/invitations/{token}: el evento y la invitación (lugares y nombres ya
 * registrados). El token es la credencial.
 */
class InvitationController extends Controller
{
    public function show(string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        $body = ['event' => $invitation->event, 'invitation' => $invitations->present($invitation)];
        $invitations->recordOpen($invitation);

        return response()->json($body);
    }
}
