<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Design\DesignFactory;
use App\Services\Invitations\EventSettings;
use App\Services\Layout\EventRepository;
use App\Services\Manager\DesignPayload;
use App\Services\Manager\ManagerAccess;
use App\Services\Manager\ManagerAuth;
use App\Services\Manager\ManagerEvents;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/** Eventos y plantillas: la lista, crear (en blanco o copiando) y los ajustes al instante. */
class EventController extends Controller
{
    /**
     * GET /api/manager/events — las que ve esta persona (quien administra, todas) y sus datos
     * al día (otra persona pudo cambiar su nombre o su rol): el inicio no pide /me aparte.
     */
    public function index(Request $request, ManagerEvents $events): JsonResponse
    {
        $user = $request->attributes->get(ManagerAuth::ATTRIBUTE);

        return response()->json(['events' => $events->list($user), 'user' => ManagerUsers::present($user)]);
    }

    /**
     * POST /api/manager/events — { slug, source: blank|event, from?, template?, event?: {tipo, festejada, inicia…} }
     * 201 { slug, panel_password } · 409 ya existe · 422 datos inválidos.
     */
    public function store(Request $request, EventRepository $events, DesignFactory $factory, ManagerAccess $access): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'regex:/^[a-z0-9][a-z0-9-]{1,59}$/', Rule::notIn(DesignFactory::RESERVED_SLUGS)],
            'source' => ['required', Rule::in(['blank', 'event'])],
            'from' => ['required_if:source,event', 'nullable', 'string', 'regex:/^[a-z0-9][a-z0-9-]{1,59}$/'],
            'template' => ['sometimes', 'boolean'],
            'event' => ['sometimes', 'array'],
            'event.tipo' => ['nullable', Rule::in(['xv', 'boda', 'bautizo', 'cumple', 'otro'])],
            'event.festejada' => ['nullable', 'string', 'max:120'],
            'event.festejada_corto' => ['nullable', 'string', 'max:40'],
            'event.pareja' => ['nullable', 'string', 'max:120'],
            'event.titulo' => ['nullable', 'string', 'max:120'],
            'event.inicia' => ['nullable', 'date_format:Y-m-d H:i'],
        ], [
            'slug.required' => 'Escribe la dirección de la invitación.',
            'slug.regex' => 'La dirección solo lleva minúsculas, números y guiones (por ejemplo xv-ana).',
            'slug.not_in' => 'Esa dirección está reservada; elige otra.',
            'from.required_if' => 'Elige de qué evento o plantilla copiar.',
            'from.*' => 'Elige de qué evento o plantilla copiar.',
            'event.tipo.in' => 'Elige el tipo de evento.',
            'event.inicia.date_format' => 'Escribe la fecha y la hora del evento.',
            'event.*.max' => 'Ese texto es demasiado largo.',
        ]);

        if ($events->path($data['slug']) !== null) {
            return response()->json([
                'message' => 'Ya existe una invitación con esa dirección.',
                'errors' => ['slug' => ['Ya existe una invitación con esa dirección.']],
            ], 409);
        }
        $from = $data['source'] === 'event' ? (string) $data['from'] : null;
        if ($from !== null && $events->path($from) !== null && ! $access->can($request->attributes->get(ManagerAuth::ATTRIBUTE), $from)) {
            return response()->json(['message' => 'Esa invitación no está asignada a ti: no la puedes copiar.'], 403);
        }
        try {
            $created = $factory->create(
                $data['slug'],
                $data['source'] === 'event' ? $data['from'] : null,
                (bool) ($data['template'] ?? false),
                array_map(fn ($v) => (string) $v, array_filter($data['event'] ?? [], fn ($v) => $v !== null)),
                by: ManagerAuth::actor($request),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($created, 201);
    }

    /**
     * PUT /api/manager/events/{slug}/settings — { panel_password?, published?, people? }
     * Aplica al instante (no pasa por "Publicar"). people (quién la ve en el gestor) solo lo
     * cambia quien administra.
     */
    public function settings(Request $request, string $slug, EventRepository $events, EventSettings $settings, DesignPayload $payload, ManagerUsers $users): JsonResponse
    {
        $dir = $events->path($slug);
        if ($dir === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        $data = $request->validate([
            'panel_password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:64', 'regex:/^[\x21-\x7E]+$/'],
            'published' => ['sometimes', 'boolean'],
            'people' => ['sometimes', 'array', 'max:100'],
            'people.*' => ['string', 'max:60'],
        ], [
            'panel_password.min' => 'La clave del panel lleva al menos 8 caracteres.',
            'panel_password.*' => 'La clave del panel lleva de 8 a 64 caracteres, sin espacios.',
            'published.*' => 'Elige si la invitación se ve.',
            'people.*' => 'Elige a las personas de la lista.',
        ]);
        $me = $request->attributes->get(ManagerAuth::ATTRIBUTE);
        if (array_key_exists('people', $data) && ($me['rol'] ?? '') !== 'admin') {
            return response()->json(['message' => 'Solo quien administra el gestor asigna las invitaciones.'], 403);
        }
        foreach ($data['people'] ?? [] as $username) {
            if ($users->find($username) === null) {
                return response()->json([
                    'message' => "No existe la persona {$username}.",
                    'errors' => ['people' => ["No existe la persona {$username}."]],
                ], 422);
            }
        }

        if ($events->isTemplate($slug) && (array_key_exists('panel_password', $data) || ($data['published'] ?? false))) {
            return response()->json(['message' => 'Una plantilla no se publica ni tiene panel del cliente.'], 422);
        }

        $changes = [];
        if (array_key_exists('panel_password', $data)) {
            $changes['clave_panel'] = $data['panel_password'];
        }
        if (array_key_exists('published', $data)) {
            $changes['publicado'] = $data['published'] ? 'SI' : 'NO';
        }
        if (array_key_exists('people', $data)) {
            $changes[ManagerAccess::SETTING] = ManagerAccess::format(array_map(ManagerUsers::normalize(...), $data['people'])) ?: null;
        }
        $settings->put($dir, $changes, CarbonImmutable::now(), ManagerAuth::actor($request));
        $events->forget($slug);

        return response()->json(['settings' => $payload->settings($slug)]);
    }
}
