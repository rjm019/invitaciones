<?php

namespace App\Services\Manager;

use App\Services\Design\Design;
use App\Services\Design\DesignStore;
use App\Services\Design\Normalizer;
use App\Services\Design\PublicationLog;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Layout\EventRepository;
use App\Services\Panel\PanelService;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * La lista del inicio del gestor: cada evento y cada plantilla con lo necesario para su
 * tarjeta (título, fecha, si se ve, si tiene cambios sin publicar, quién publicó la última
 * vez, colores, confirmados).
 * Se lee de la invitación directamente (sin armar el config): es rápido aunque haya muchas.
 */
final class ManagerEvents
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly PublicationLog $log,
        private readonly ManagerAccess $access,
    ) {}

    /**
     * @param  array<string, string>|null  $user  con una persona, solo lo que ella ve
     * @return list<array<string, mixed>>
     */
    public function list(?array $user = null): array
    {
        $out = [];
        foreach ($this->events->slugs() as $slug) {
            if ($user === null || $this->access->can($user, $slug)) {
                $out[] = $this->summary($slug);
            }
        }
        usort($out, fn ($a, $b) => strcmp((string) $b['updated_at'], (string) $a['updated_at']));

        return $out;
    }

    /** @return array<string, mixed> */
    public function summary(string $slug): array
    {
        $dir = (string) $this->events->path($slug);
        $own = $this->events->settings($slug);
        try {
            // Borrador y publicada se leen una vez (y la publicada solo si hace falta).
            $state = $this->store->state($slug);
            $design = $state->current()->design();
        } catch (Throwable $e) {
            return ['slug' => $slug, 'title' => $slug, 'error' => 'No se pudo leer la invitación: '.$e->getMessage(), 'updated_at' => null];
        }
        $settings = [...($state->draft === null ? $state->legacySettings() : []), ...array_filter($own, fn ($v) => $v !== '')];
        $template = Normalizer::yes($settings['plantilla'] ?? 'NO');

        return [
            'slug' => $slug,
            'title' => PanelService::titleFor($slug, $this->miniEvent($design), $design->event('titulo_panel')),
            'type' => $design->event('tipo') ?? 'otro',
            'celebrant' => $design->event('festejada_corto') ?? $design->event('festejada'),
            'starts_at' => $this->startsAt($design),
            'published' => Normalizer::yes($settings['publicado'] ?? 'SI') && ! $template,
            'template' => $template,
            // Las muestras de la landing (demo=SI) van en su propia pestaña del inicio.
            'demo' => Normalizer::yes($settings['demo'] ?? 'NO') && ! $template,
            'format' => $state->legacy ? 'legacy' : 'design',
            'has_draft' => $state->draft !== null,
            'pending' => $state->draft !== null && ! $state->legacy && $state->pending(),
            'updated_at' => $this->updatedAt($dir),
            'last_publish' => $state->legacy ? null : $this->log->last($dir),
            'people' => ManagerAccess::parse($own[ManagerAccess::SETTING] ?? ''),
            'cover' => [
                'theme' => $design->event('tema'),
                'colors' => array_filter([
                    'bg' => $design->colors['fondo'] ?? null,
                    'primary' => $design->colors['primario'] ?? null,
                    'accent' => $design->colors['acento'] ?? null,
                    'text' => $design->colors['texto'] ?? null,
                ]),
                'font' => $design->fonts['script'] ?? null,
            ],
            // Una plantilla no tiene invitados (su tarjeta no muestra conteos).
            'counts' => $template ? ['invitations' => 0, 'guests' => 0, 'attending' => 0] : $this->counts($slug),
        ];
    }

    /** @return array{invitations: int, guests: int, attending: int} */
    private function counts(string $slug): array
    {
        $guests = 0;
        $attending = 0;
        foreach ($this->responses->all($slug) as $people) {
            foreach ($people as $person) {
                $guests++;
                $attending += $person['attending'] ? 1 : 0;
            }
        }

        return ['invitations' => count($this->invitations->all($slug)), 'guests' => $guests, 'attending' => $attending];
    }

    /** @return array<string, mixed> lo que PanelService::titleFor necesita */
    private function miniEvent(Design $design): array
    {
        return [
            'type' => $design->event('tipo') ?? 'otro',
            'title' => $design->event('titulo') ?? '',
            'celebrant' => ['short_name' => $design->event('festejada_corto') ?? '', 'full_name' => $design->event('festejada') ?? ''],
        ];
    }

    private function startsAt(Design $design): ?string
    {
        $value = $design->event('inicia');
        $timezone = $design->event('zona_horaria') ?? 'America/Mexico_City';

        return $value === null || ! Normalizer::timezone($timezone) ? null : Normalizer::dateTime($value, $timezone)?->toIso8601String();
    }

    private function updatedAt(string $dir): ?string
    {
        $times = array_map('filemtime', array_filter([
            $dir.'/invitacion.csv',
            $dir.'/'.DesignStore::DRAFT_DIR.'/invitacion.csv',
            $dir.'/layout.xlsx',
        ], 'is_file'));

        return $times === [] ? null : CarbonImmutable::createFromTimestamp(max($times))->toIso8601String();
    }
}
