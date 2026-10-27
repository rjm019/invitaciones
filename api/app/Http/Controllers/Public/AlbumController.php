<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/public/invitations/{token}/album — sube UNA foto del álbum (campo `photo`, ya
 * reducida en el celular). Hasta 2 por invitación, desde el día del evento: 409 si aún no
 * es el día · 410 si el evento ya terminó · 422 foto inválida o ya subió 2 · 507 álbum lleno
 * · 404 token desconocido o evento sin álbum.
 */
class AlbumController extends Controller
{
    public function store(Request $request, string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        $request->validate([
            'photo' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:8192'],
        ], [
            'photo.max' => 'La foto pesa más de 8 MB. Elige otra o reduce su tamaño.',
            'photo.mimetypes' => 'No pudimos leer esa foto. Prueba con una imagen JPG, PNG o WebP.',
            'photo.required' => 'Elige una foto.',
            'photo.file' => 'No pudimos recibir la foto. Elige una e inténtalo de nuevo.',
            'photo.uploaded' => 'No pudimos recibir la foto (¿pesa demasiado?). Elige otra e inténtalo de nuevo.',
        ]);

        return response()->json($invitations->uploadAlbumPhoto($invitation, $request->file('photo')), 201);
    }
}
