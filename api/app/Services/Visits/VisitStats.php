<?php

namespace App\Services\Visits;

use Carbon\CarbonImmutable;

/**
 * Las estadísticas del gestor a partir de las visitas anotadas (VisitLog): totales, visitas
 * por día y de dónde llegan, en qué páginas e invitaciones, con qué dispositivo y las
 * últimas visitas. Las del equipo (con sesión del gestor en ese navegador) no cuentan.
 * Lógica pura sobre los renglones.
 */
final class VisitStats
{
    /** sitio: la landing · invitaciones: invitaciones, enlaces personales y muestras · todo. */
    public const SCOPES = ['sitio', 'invitaciones', 'todo'];

    public const RECENT = 60;

    private const TOP = 10;

    /**
     * @param  list<array<string, string>>  $rows  de VisitLog::rows()
     * @param  int  $quotes  cotizaciones que llegaron en esos días
     * @return array<string, mixed>
     */
    public static function summarize(array $rows, CarbonImmutable $from, CarbonImmutable $to, string $scope, int $quotes): array
    {
        $team = 0;
        $kept = [];
        foreach ($rows as $row) {
            if (! self::inScope($row['tipo'], $scope)) {
                continue;
            }
            if ($row['equipo'] === 'SI') {
                $team++;

                continue;
            }
            $kept[] = $row;
        }

        $visitors = self::visitors($kept);
        $days = [];
        for ($day = $from->startOfDay(); $day <= $to; $day = $day->addDay()) {
            $days[$day->format('Y-m-d')] = [];
        }
        foreach ($kept as $row) {
            $days[substr($row['fecha'], 0, 10)][] = $row;
        }

        return [
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'scope' => $scope,
            'totals' => [
                'visits' => count($kept),
                'visitors' => $visitors,
                'team' => $team,
                'quotes' => $quotes,
                // Cotizaciones por cada 100 personas que vieron la landing.
                'conversion' => $scope !== 'invitaciones' && $visitors > 0 ? round($quotes * 100 / $visitors, 1) : null,
            ],
            'days' => array_map(
                fn ($date, $list) => ['date' => $date, 'visits' => count($list), 'visitors' => self::visitors($list)],
                array_keys($days),
                array_values($days),
            ),
            'pages' => self::top($kept, fn ($r) => self::pageLabel($r)),
            'origins' => self::top($kept, fn ($r) => $r['origen'] ?: VisitClassifier::DIRECT, VisitClassifier::INSIDE),
            'campaigns' => self::top(array_values(array_filter($kept, fn ($r) => $r['campana'] !== '')), fn ($r) => $r['campana']),
            'devices' => self::top($kept, fn ($r) => $r['dispositivo'] ?: 'Otro'),
            'systems' => self::top($kept, fn ($r) => $r['sistema'] ?: 'Otro'),
            'browsers' => self::top($kept, fn ($r) => $r['navegador'] ?: 'Otro'),
            'events' => self::events($kept),
            'recent' => array_map(fn ($r) => [
                'at' => CarbonImmutable::parse($r['fecha'], 'America/Mexico_City')->toIso8601String(),
                'page' => self::pageLabel($r),
                'kind' => $r['tipo'],
                'origin' => $r['origen'] ?: VisitClassifier::DIRECT,
                'campaign' => $r['campana'] !== '' ? $r['campana'] : null,
                'device' => $r['dispositivo'],
                'system' => $r['sistema'],
                'browser' => $r['navegador'],
                'ip' => $r['ip'] !== '' ? $r['ip'] : null,
            ], array_slice(array_reverse($kept), 0, self::RECENT)),
        ];
    }

    public static function inScope(string $kind, string $scope): bool
    {
        return match ($scope) {
            'sitio' => $kind === 'landing',
            'invitaciones' => $kind !== 'landing',
            default => true,
        };
    }

    /** "/", "/invitaciones-digitales-boda", "/e/nat" o "/i (nat)" (los enlaces personales, sin su token). */
    private static function pageLabel(array $row): string
    {
        return $row['tipo'] === 'personal' || ($row['tipo'] === 'muestra' && $row['pagina'] === '/i')
            ? '/i ('.($row['evento'] ?: '?').')'
            : $row['pagina'];
    }

    /** @param  list<array<string, string>>  $rows */
    private static function visitors(array $rows): int
    {
        return count(array_unique(array_map(fn ($r) => $r['visitante'] ?: $r['ip'].'|'.$r['fecha'], $rows)));
    }

    /**
     * Los más vistos: [{ label, visits, visitors }], de más a menos. $last (p. ej. "Dentro
     * del sitio") va siempre al final: no es de dónde llegan.
     *
     * @param  list<array<string, string>>  $rows
     * @param  callable(array<string, string>): string  $key
     * @return list<array{label: string, visits: int, visitors: int}>
     */
    private static function top(array $rows, callable $key, ?string $last = null): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $groups[$key($row)][] = $row;
        }
        $list = array_map(
            fn ($label, $group) => ['label' => (string) $label, 'visits' => count($group), 'visitors' => self::visitors($group)],
            array_keys($groups),
            array_values($groups),
        );
        usort($list, fn ($a, $b) => [$a['label'] === $last, $b['visits'], $a['label']] <=> [$b['label'] === $last, $a['visits'], $b['label']]);

        return array_slice($list, 0, self::TOP);
    }

    /**
     * Cada invitación con sus visitas: la general (/e/), los enlaces personales y si es muestra.
     *
     * @param  list<array<string, string>>  $rows
     * @return list<array{slug: string, demo: bool, visits: int, visitors: int, general: int, personal: int}>
     */
    private static function events(array $rows): array
    {
        $groups = [];
        foreach ($rows as $row) {
            if ($row['evento'] !== '') {
                $groups[$row['evento']][] = $row;
            }
        }
        $list = [];
        foreach ($groups as $slug => $group) {
            $list[] = [
                'slug' => (string) $slug,
                'demo' => (bool) array_filter($group, fn ($r) => $r['tipo'] === 'muestra'),
                'visits' => count($group),
                'visitors' => self::visitors($group),
                'general' => count(array_filter($group, fn ($r) => str_starts_with($r['pagina'], '/e/'))),
                'personal' => count(array_filter($group, fn ($r) => $r['pagina'] === '/i')),
            ];
        }
        usort($list, fn ($a, $b) => [$b['visits'], $a['slug']] <=> [$a['visits'], $b['slug']]);

        return $list;
    }
}
