<?php

namespace App\Http\Middleware;

use App\Services\Layout\EventRepository;
use App\Services\Manager\ManagerAccess;
use App\Services\Manager\ManagerAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Después de "manager", en /events/{slug}/…: quien edita solo entra a las invitaciones que
 * creó o le asignaron (quien administra, a todas). Si el evento no existe, sigue y el
 * controlador responde 404.
 */
class EnsureManagerEventAccess
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly ManagerAccess $access,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $slug = (string) $request->route('slug');
        $user = (array) $request->attributes->get(ManagerAuth::ATTRIBUTE);
        if ($this->events->path($slug) !== null && ! $this->access->can($user, $slug)) {
            return response()->json([
                'message' => 'Esta invitación no está asignada a ti. Pídele a quien administra el gestor que te la asigne.',
            ], 403);
        }

        return $next($request);
    }
}
