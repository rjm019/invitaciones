<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Invitations\InvitationService;
use App\Services\Invitations\TriviaStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/public/invitations/{token}/trivia/start y /trivia — la trivia del enlace.
 * Una participación por invitación: 409 si ya respondió o si ya cerró · 404 token desconocido
 * o evento sin trivia · 422 datos inválidos. La respuesta trae aciertos y total, nunca las
 * respuestas correctas.
 */
class TriviaController extends Controller
{
    public function start(string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        return response()->json($invitations->startTrivia($invitation));
    }

    public function store(Request $request, string $token, InvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->find($token);
        if ($invitation === null) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        $maxName = TriviaStore::MAX_NAME;
        $data = $request->validate([
            'name' => ['required', 'string', "max:{$maxName}"],
            'answers' => ['required', 'array', 'min:1', 'max:10'],
            'answers.*' => ['required', 'integer', 'min:1', 'max:4'],
        ], [
            'name.required' => 'Escribe tu nombre.',
            'name.string' => 'Escribe tu nombre.',
            'name.max' => "Tu nombre es muy largo (máximo {$maxName} letras).",
            'answers.required' => 'Responde todas las preguntas.',
            'answers.array' => 'Responde todas las preguntas.',
            'answers.min' => 'Responde todas las preguntas.',
            'answers.max' => 'Responde todas las preguntas.',
            'answers.*' => 'Elige una de las opciones de cada pregunta.',
        ]);

        return response()->json($invitations->answerTrivia(
            $invitation,
            $data['name'],
            array_map('intval', array_values($data['answers'])),
        ));
    }
}
