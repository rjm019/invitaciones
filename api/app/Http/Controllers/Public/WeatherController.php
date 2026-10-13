<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use App\Services\Weather\WeatherService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/public/events/{slug}/weather: clima del día del evento en la ciudad del salón.
 * `weather` es null cuando no hay nada que mostrar (el evento ya pasó o el servicio de
 * clima no respondió); la sección se esconde sola.
 */
class WeatherController extends Controller
{
    public function show(string $slug, EventRepository $events, WeatherService $weather): JsonResponse
    {
        $config = $events->find($slug);

        if ($config === null || ! $config['published']) {
            return response()->json(['message' => 'Invitación no encontrada.'], 404);
        }

        return response()->json(['weather' => $weather->forEvent($slug, $config, CarbonImmutable::now())]);
    }
}
