<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Services\Reminders\ReminderRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/internal/reminders/run — lo llama el cron (Cloud Scheduler, GitHub Actions…) con
 * X-Reminders-Key. 503 sin clave configurada · 401 clave incorrecta · 200 con el resumen.
 */
class ReminderRunController extends Controller
{
    public function run(Request $request, ReminderRunner $runner): JsonResponse
    {
        $key = (string) config('invitaciones.whatsapp.run_key');
        if ($key === '') {
            return response()->json(['message' => 'Los recordatorios no están configurados.'], 503);
        }
        if (! hash_equals($key, (string) $request->header('X-Reminders-Key'))) {
            return response()->json(['message' => 'Clave incorrecta.'], 401);
        }

        $summary = $runner->run();
        unset($summary['due']);

        return response()->json($summary);
    }
}
