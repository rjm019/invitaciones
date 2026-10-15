<?php

namespace App\Services\Design;

use App\Services\Csv\CsvFile;
use App\Services\Invitations\EventSettings;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * "Publicar": lo que el gestor tiene en el borrador pasa a ser la invitación que ven los
 * invitados. Antes se revisa en modo estricto (con un error no se publica) y se guarda la
 * versión anterior en el historial. Si el evento seguía en el formato anterior, publicar es
 * su migración.
 */
final class DesignPublisher
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly DesignFile $file,
        private readonly InvitationConfigBuilder $builder,
        private readonly EventSettings $settings,
        private readonly LegacyMigrator $migrator,
        private readonly CsvFile $csv,
        private readonly PublicationLog $log,
    ) {}

    /**
     * @param  bool  $replaceOwnerDeadline  si el dueño movió la fecha límite desde su panel y el
     *                                      gestor publica otra, ¿gana la del gestor?
     * @param  array{usuario: string, nombre: string}|null  $by  quién publica (para la bitácora)
     * @return array{published_at: string, migrated: bool, version: string}
     *
     * @throws DesignConflict si la invitación cambió desde $expected
     * @throws PublishBlocked si tiene errores o no hay cambios
     */
    public function publish(string $slug, string $expected, bool $replaceOwnerDeadline = false, ?CarbonImmutable $now = null, ?array $by = null): array
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
        $now ??= CarbonImmutable::now();

        return $this->csv->locked($this->store->livePath($dir), function () use ($slug, $dir, $expected, $replaceOwnerDeadline, $now, $by) {
            // Borrador y publicada se leen una sola vez para toda la publicación.
            $state = $this->store->state($slug);
            $version = $state->version();
            if (! hash_equals($version, $expected)) {
                throw new DesignConflict($version);
            }

            if ($state->source() === 'live') {
                throw new PublishBlocked('No hay cambios por publicar.');
            }
            $current = ['design' => $state->current()->design(), 'source' => $state->source()];
            $published = $this->store->publishedOf($state);
            $migrated = $published['source'] === 'legacy';
            $ownSettings = $this->events->settings($slug);

            $settings = array_merge($migrated ? $published['settings'] : [], array_filter($ownSettings, fn ($v) => $v !== ''));
            $result = $this->builder->build($slug, $current['design'], $this->events->media($slug), $settings, now: $now);
            if ($result->hasErrors()) {
                throw new PublishBlocked('Antes de publicar, corrige lo que está marcado.', array_values(array_filter(
                    $result->issues,
                    fn ($issue) => $issue['level'] === 'error',
                )));
            }

            // La fecha límite que el dueño movió desde su panel gana sobre la invitación. Si el
            // gestor publica otra y elige que gane la suya, se quita solo ese ajuste (los
            // cambios que el dueño ya usó se conservan).
            $deadlineChanged = $published['design']->event('rsvp_limite') !== $current['design']->event('rsvp_limite');
            if ($replaceOwnerDeadline && $deadlineChanged && trim($ownSettings['rsvp_limite'] ?? '') !== '') {
                $this->settings->put($dir, ['rsvp_limite' => null], $now, $by);
            }

            if ($migrated) {
                $this->migrator->apply($slug, $current['design'], $published['settings'], $now, $by);
            } else {
                $this->store->archiveLive($dir, $now);
                $this->file->write($this->store->livePath($dir), $current['design']);
            }
            if ($current['source'] === 'draft') {
                @unlink($this->store->draftPath($dir));
            }
            $this->log->add($dir, $now, $migrated ? 'formato anterior' : 'borrador', count($current['design']->sections), $by);
            $this->events->forget($slug);

            return [
                'published_at' => $now->toIso8601String(),
                'migrated' => $migrated,
                'version' => $this->store->version($slug),
            ];
        });
    }
}
