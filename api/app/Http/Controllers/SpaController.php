<?php

namespace App\Http\Controllers;

use App\Services\Design\GiftPrivacy;
use App\Services\Invitations\InvitationService;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Panel\PanelService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * La invitación (SPA compilada en public/app.html) en toda ruta que no sea de la API ni de
 * media; el router de Vue decide qué mostrar. En /e/{slug} y /i/{token} la página ya trae
 * los datos (window.__BOOT__): la invitación no espera otra petición para empezar a cargar
 * su tema, sus fuentes y sus imágenes. En /panel/{slug}, los colores de la entrada.
 */
class SpaController extends Controller
{
    private const JSON = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;

    public function __invoke(Request $request, EventRepository $events, InvitationService $invitations, PanelService $panel): Response
    {
        $spa = (string) config('invitaciones.spa_path');
        abort_if($request->is('api', 'api/*') || ! is_file($spa), 404);

        $html = (string) file_get_contents($spa);
        $boot = $this->boot($request->path(), $events, $invitations, $panel);
        if ($boot !== null) {
            // JSON_HEX_*: un texto del layout con "</script>" no puede cerrar la etiqueta.
            $html = str_replace('</head>', '<script>window.__BOOT__='.json_encode($boot, self::JSON).'</script></head>', $html);
        }

        // private: en /i/{token} la página lleva los nombres de esa invitación. Nada de la SPA
        // se indexa (invitaciones, paneles, gestor): lo que se busca en Google es la landing.
        $headers = [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache, private',
            'X-Robots-Tag' => 'noindex, nofollow',
        ];
        // El gestor solo se deja poner dentro de sí mismo (la vista previa es un iframe).
        if ($request->is('gestor', 'gestor/*')) {
            $headers['Content-Security-Policy'] = "frame-ancestors 'self'";
        }

        // Una dirección que no es de la SPA se ve igual ("no encontramos esta página"), pero
        // responde 404: para los buscadores no es una página más del sitio.
        return response($html, $this->isSpaRoute($request->path()) ? 200 : 404, $headers);
    }

    /** Las rutas del router de Vue (web/src/router): la invitación, el panel y el gestor. */
    private function isSpaRoute(string $path): bool
    {
        return (bool) preg_match('#^(/|i/[A-Za-z0-9]+|e/[a-z0-9-]+|panel/[a-z0-9-]+|gestor(/[a-z0-9-]+)?|legacy/boda)/?$#', $path);
    }

    /**
     * Lo mismo que responderían GET /api/public/events/{slug}, /invitations/{token} y
     * /api/admin/events/{slug}/brand.
     *
     * @return array{kind: string, key: string, data: array<string, mixed>}|null
     */
    private function boot(string $path, EventRepository $events, InvitationService $invitations, PanelService $panel): ?array
    {
        try {
            if (preg_match('#^panel/([a-z0-9-]+)$#', $path, $m)) {
                return $events->path($m[1]) !== null
                    ? ['kind' => 'panel', 'key' => $m[1], 'data' => ['brand' => $panel->brand($m[1])]]
                    : null;
            }
            if (preg_match('#^e/([a-z0-9-]+)$#', $path, $m)) {
                $event = $events->find($m[1]);

                return $event !== null && $event['published']
                    ? ['kind' => 'event', 'key' => $m[1], 'data' => ['event' => GiftPrivacy::forGeneralLink($event)]]
                    : null;
            }
            if (preg_match('#^i/([A-Za-z0-9]+)$#', $path, $m)) {
                $invitation = $invitations->find($m[1]);
                if ($invitation === null) {
                    return null;
                }
                $data = ['event' => $invitation->event, 'invitation' => $invitations->present($invitation)];
                $invitations->recordOpen($invitation);

                return ['kind' => 'invitation', 'key' => $m[1], 'data' => $data];
            }
        } catch (LayoutException) {
            // Con errores en el layout, la página los pide a la API y los muestra.
        }

        return null;
    }
}
