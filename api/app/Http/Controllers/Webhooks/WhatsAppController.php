<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\Reminders\WhatsAppWebhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Webhook de WhatsApp Cloud API: verificación (GET) y avisos de estado y respuestas (POST). */
class WhatsAppController extends Controller
{
    /** GET /api/webhooks/whatsapp — Meta manda hub.mode, hub.verify_token y hub.challenge (PHP cambia el punto por "_"). */
    public function verify(Request $request): Response
    {
        $token = (string) config('invitaciones.whatsapp.verify_token');
        if ($token !== '' && $request->query('hub_mode') === 'subscribe'
            && hash_equals($token, (string) $request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200, ['Content-Type' => 'text/plain']);
        }

        return response('', 403);
    }

    /** POST /api/webhooks/whatsapp — 401 si la firma no es de Meta; si lo es, 200 siempre. */
    public function receive(Request $request, WhatsAppWebhook $webhook): JsonResponse
    {
        $valid = WhatsAppWebhook::validSignature(
            $request->getContent(),
            $request->header('X-Hub-Signature-256'),
            (string) config('invitaciones.whatsapp.app_secret'),
        );
        if (! $valid) {
            return response()->json(['message' => 'Firma incorrecta.'], 401);
        }

        $payload = json_decode($request->getContent(), true);
        if (is_array($payload)) {
            $webhook->handle($payload);
        }

        return response()->json(['ok' => true]);
    }
}
