<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Layout\EventRepository;
use App\Services\Visits\VisitClassifier;
use App\Services\Visits\VisitLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

use function Illuminate\Support\defer;

/**
 * POST /api/public/visits — cada página vista (la landing, la invitación y las muestras)
 * manda un aviso con navigator.sendBeacon: { pagina, ref?, utm_source?, utm_medium?,
 * utm_campaign?, evento?, muestra?, equipo? }. Llega como texto (así el navegador no
 * pregunta antes con OPTIONS). Siempre 204: la página nunca espera ni ve un error.
 *
 * Del servidor salen la IP, el dispositivo y si es un robot (esos no se anotan). Con DNT o
 * GPC encendido, la visita se cuenta sin IP. Los enlaces personales (/i/<token>) se anotan
 * como "/i" con el evento: el token es la llave de la invitación y nunca se guarda aquí.
 */
class VisitController extends Controller
{
    private const PAGE = '#^/[a-z0-9-]{0,80}$#';

    public function store(Request $request, VisitLog $log, EventRepository $events): Response
    {
        $ua = (string) $request->userAgent();
        $data = json_decode($request->getContent(), true);
        if (! is_array($data) || VisitClassifier::isBot($ua)) {
            return response()->noContent();
        }
        $page = $this->page((string) ($data['pagina'] ?? ''), (string) ($data['evento'] ?? ''), (bool) ($data['muestra'] ?? false), $events);
        if ($page === null) {
            return response()->noContent();
        }

        $ip = (string) $request->ip();
        $private = $request->header('DNT') === '1' || $request->header('Sec-GPC') === '1';
        $referrer = VisitClassifier::host(mb_substr((string) ($data['ref'] ?? ''), 0, 500));
        $now = CarbonImmutable::now('America/Mexico_City');

        $visit = $page + [
            'origen' => VisitClassifier::origin($referrer, (string) ($data['utm_source'] ?? ''), $ua, $this->siteHosts($request)),
            'referencia' => VisitClassifier::label($referrer, 80),
            'campana' => $this->campaign($data),
            'dispositivo' => VisitClassifier::device($ua),
            'sistema' => VisitClassifier::system($ua),
            'navegador' => VisitClassifier::browser($ua),
            'ip' => $private ? '' : $ip,
            // La misma persona (IP + navegador) da siempre el mismo código, sin guardar el navegador.
            'visitante' => substr(hash_hmac('sha256', $ip.'|'.$ua, (string) config('app.key')), 0, 16),
            'equipo' => ($data['equipo'] ?? false) === true ? 'SI' : '',
        ];

        try {
            if ($log->record($visit, $now)) {
                defer(fn () => $log->forgetOldIps($now));
            }
        } catch (Throwable $e) {
            report($e); // contar visitas nunca debe fallarle a nadie
        }

        return response()->noContent();
    }

    /**
     * La página, ya limpia: la landing (/, /invitaciones-digitales-boda…), /e/<slug> o /i
     * (sin el token, con el evento). null si no es una página del sitio o el evento no existe.
     *
     * @return array{pagina: string, tipo: string, evento: string}|null
     */
    private function page(string $path, string $slug, bool $demo, EventRepository $events): ?array
    {
        if (preg_match('#^/e/([a-z0-9-]+)/?$#', $path, $m)) {
            return $events->path($m[1]) !== null
                ? ['pagina' => '/e/'.$m[1], 'tipo' => $demo ? 'muestra' : 'invitacion', 'evento' => $m[1]]
                : null;
        }
        if (str_starts_with($path, '/i/') || $path === '/i') {
            return $events->path($slug) !== null
                ? ['pagina' => '/i', 'tipo' => $demo ? 'muestra' : 'personal', 'evento' => $slug]
                : null;
        }
        $path = $path === '/' ? $path : rtrim($path, '/');

        return preg_match(self::PAGE, $path) ? ['pagina' => $path, 'tipo' => 'landing', 'evento' => ''] : null;
    }

    /** "instagram / historia / lanzamiento" (utm_source, utm_medium y utm_campaign que vengan). */
    private function campaign(array $data): string
    {
        $parts = array_filter(array_map(
            fn ($key) => VisitClassifier::label((string) ($data[$key] ?? ''), 40),
            ['utm_source', 'utm_medium', 'utm_campaign'],
        ), fn ($v) => $v !== '');

        return implode(' / ', $parts);
    }

    /** @return list<string> */
    private function siteHosts(Request $request): array
    {
        $hosts = [strtolower($request->getHost())];
        $front = (string) parse_url((string) config('invitaciones.frontend_url'), PHP_URL_HOST);
        if ($front !== '') {
            $hosts[] = strtolower($front);
        }

        return array_values(array_unique(array_map(fn ($h) => preg_replace('/^www\./', '', $h) ?? $h, $hosts)));
    }
}
