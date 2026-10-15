<?php

namespace App\Services\Manager;

use App\Services\Design\Design;
use App\Services\Design\DesignState;
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
        private readonly ManagerUsers $users,
    ) {}

    /** @return array<string, mixed> */
    public function full(string $slug): array
    {
        $this->events->forget($slug);
        $state = $this->store->state($slug);
        $current = $state->current();
        $settings = $this->events->settings($slug);

        return [
            'slug' => $slug,
            'design' => $current->design()->toArray(),
            'source' => $state->source(),
            'warnings' => $current->warnings(),
            ...$this->built($slug, $state, $settings),
            'settings' => $this->settings($slug, $state->draft === null ? $state->legacySettings() : [], $settings),
            'conversion' => $state->legacy ? $this->conversion($slug) : null,
        ];
    }

    /**
     * Después de guardar el borrador: la versión nueva y el config para la vista previa.
     * Con el estado que dejó el guardado no se vuelve a leer nada.
     *
     * @param  array<string, string>|null  $settings  ajustes.csv, si ya se leyó
     * @return array<string, mixed>
     */
    public function built(string $slug, ?DesignState $state = null, ?array $settings = null): array
    {
        $state ??= $this->store->state($slug);
        $source = $state->source();
        $design = $state->current()->design();
        $own = array_filter($settings ?? $this->events->settings($slug), fn ($v) => $v !== '');
        $settings = [...($source === 'draft' ? [] : $state->legacySettings()), ...$own];
        $result = $this->builder->build($slug, $design, $this->events->media($slug), $settings, lenient: true);

        return [
            'version' => $state->version(),
            'has_draft' => $source === 'draft',
            'pending' => $source === 'legacy' || $state->pending(),
            'changes' => $source === 'draft' ? $this->changes($state->published()->design(), $design) : [],
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
     * @param  array<string, string>|null  $own  ajustes.csv, si ya se leyó
     * @return array<string, mixed>
     */
    public function settings(string $slug, array $legacySettings = [], ?array $own = null): array
    {
        $users = null;
        $settings = [...$legacySettings, ...array_filter($own ?? $this->events->settings($slug), fn ($v) => $v !== '')];
        $template = Normalizer::yes($settings['plantilla'] ?? 'NO');

        return [
            'published' => ! $template && Normalizer::yes($settings['publicado'] ?? 'SI'),
            'template' => $template,
            'panel_password' => $template ? null : ($settings['clave_panel'] ?? $this->events->eventValue($slug, 'clave_panel')),
            'owner_deadline' => ($settings['rsvp_limite'] ?? '') ?: null,
            'deadline_changes' => (int) ($settings['rsvp_limite_cambios'] ?? 0),
            // Quién la ve en el gestor, además de quien administra.
            'people' => array_map(function (string $username) use (&$users) {
                $users ??= array_column($this->users->all(), null, 'usuario');
                $user = $users[$username] ?? null;

                return [
                    'username' => $username,
                    'name' => $user['nombre'] ?? $username,
                    'role' => $user['rol'] ?? 'editor',
                    'active' => $user !== null && ManagerUsers::active($user),
                ];
            }, ManagerAccess::parse($settings[ManagerAccess::SETTING] ?? '')),
        ];
    }

    /** @return array{identical: bool, differences: list<string>, errors: list<string>} */
    private function conversion(string $slug): array
    {
        $check = $this->migrator->check($slug);

        return ['identical' => $check['identical'], 'differences' => $check['differences'], 'errors' => $check['errors']];
    }
}
