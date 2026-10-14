<?php

namespace App\Services\Manager;

use App\Services\Design\Design;
use App\Services\Design\DesignStore;
use App\Services\Design\InvitationConfigBuilder;
use App\Services\Design\LegacyMigrator;
use App\Services\Design\Normalizer;
use App\Services\Layout\EventRepository;
use App\Services\Panel\PanelService;

/**
 * Lo que el editor del gestor recibe de una invitación: lo que tiene enfrente (borrador,
 * publicada o la conversión del formato anterior), su versión, el config armado en modo
 * tolerante (para la vista previa) con lo que hay que revisar, la marca para la tarjeta de
 * WhatsApp y los ajustes que cambian al instante.
 */
final class DesignPayload
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly InvitationConfigBuilder $builder,
        private readonly PanelService $panel,
        private readonly LegacyMigrator $migrator,
    ) {}

    /** @return array<string, mixed> */
    public function full(string $slug): array
    {
        $this->events->forget($slug);
        $current = $this->store->current($slug);
        $legacy = ! $this->events->hasDesign($slug);

        return [
            'slug' => $slug,
            'design' => $current['design']->toArray(),
            'source' => $current['source'],
            'warnings' => $current['warnings'],
            ...$this->built($slug),
            'settings' => $this->settings($slug, $current['settings']),
            'conversion' => $legacy ? $this->conversion($slug) : null,
        ];
    }

    /**
     * Después de guardar el borrador: la versión nueva y el config para la vista previa.
     *
     * @return array<string, mixed>
     */
    public function built(string $slug): array
    {
        $current = $this->store->current($slug);
        $settings = [...$current['settings'], ...array_filter($this->events->settings($slug), fn ($v) => $v !== '')];
        $result = $this->builder->build($slug, $current['design'], $this->events->media($slug), $settings, lenient: true);
        $design = $current['design'];

        return [
            'version' => $this->store->version($slug),
            'has_draft' => $current['source'] === 'draft',
            'pending' => $current['source'] === 'legacy' || $this->store->pending($slug),
            'changes' => $current['source'] === 'draft' ? $this->changes($this->store->published($slug)['design'], $design) : [],
            'config' => $result->config,
            'issues' => $result->issues,
            'brand' => $this->panel->brandFrom($slug, $result->config, fn (string $key) => $design->event($key)),
        ];
    }

    /**
     * Qué cambió en el borrador contra lo publicado (para "Publicar").
     *
     * @return list<array{type: 'block'|'section'|'order', key: ?string, change: 'added'|'removed'|'changed'}>
     */
    public function changes(Design $published, Design $draft): array
    {
        $out = [];
        foreach (['evento', 'colores', 'fuentes', 'textos', 'pagina'] as $block) {
            if ($published->block($block) != $draft->block($block)) {
                $out[] = ['type' => 'block', 'key' => $block, 'change' => 'changed'];
            }
        }
        $before = array_map(fn ($s) => $s->id, $published->sections);
        $after = array_map(fn ($s) => $s->id, $draft->sections);
        foreach ($draft->sections as $section) {
            $old = $published->section($section->id);
            if ($old === null) {
                $out[] = ['type' => 'section', 'key' => $section->id, 'change' => 'added'];
            } elseif ($old->fields != $section->fields || $old->items != $section->items) {
                $out[] = ['type' => 'section', 'key' => $section->id, 'change' => 'changed'];
            }
        }
        foreach (array_diff($before, $after) as $id) {
            $out[] = ['type' => 'section', 'key' => $id, 'change' => 'removed'];
        }
        $common = array_values(array_intersect($after, $before));
        if ($common !== array_values(array_intersect($before, $after))) {
            $out[] = ['type' => 'order', 'key' => null, 'change' => 'changed'];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $legacySettings  clave y "publicado" del Excel anterior (sin migrar)
     * @return array<string, mixed>
     */
    public function settings(string $slug, array $legacySettings = []): array
    {
        $settings = [...$legacySettings, ...array_filter($this->events->settings($slug), fn ($v) => $v !== '')];
        $template = Normalizer::yes($settings['plantilla'] ?? 'NO');

        return [
            'published' => ! $template && Normalizer::yes($settings['publicado'] ?? 'SI'),
            'template' => $template,
            'panel_password' => $template ? null : ($settings['clave_panel'] ?? $this->events->eventValue($slug, 'clave_panel')),
            'owner_deadline' => ($settings['rsvp_limite'] ?? '') ?: null,
            'deadline_changes' => (int) ($settings['rsvp_limite_cambios'] ?? 0),
        ];
    }

    /** @return array{identical: bool, differences: list<string>, errors: list<string>} */
    private function conversion(string $slug): array
    {
        $check = $this->migrator->check($slug);

        return ['identical' => $check['identical'], 'differences' => $check['differences'], 'errors' => $check['errors']];
    }
}
