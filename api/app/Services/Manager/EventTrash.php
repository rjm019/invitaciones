<?php

namespace App\Services\Manager;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Eliminar una invitación, una plantilla o una muestra desde el gestor. Su carpeta no se
 * borra: pasa completa (enlaces, respuestas, dedicatorias, media, respaldos) a
 * eventos/_gestor/papelera/<slug>-<fecha>/, fuera de la lista y de lo público ("_gestor"
 * nunca es un evento: sus enlaces, su panel y su media dejan de abrir), y papelera.csv
 * anota quién lo hizo y qué tenía. Para recuperarla, basta con regresar la carpeta a
 * eventos/ con su nombre de antes.
 *
 * Una invitación que ya se compartió (visible, con enlaces o con confirmaciones) solo se
 * elimina si se escribe su dirección para confirmar.
 */
final class EventTrash
{
    public const DIR = '_gestor/papelera';

    public const LOG = 'papelera.csv';

    public const HEADERS = ['fecha', 'evento', 'tipo', 'carpeta', 'enlaces', 'confirmados', 'usuario', 'nombre'];

    public function __construct(
        private readonly EventRepository $events,
        private readonly ManagerEvents $list,
        private readonly CsvFile $csv,
    ) {}

    /**
     * ¿Hace falta escribir la dirección para eliminarla? Sí en una invitación (o muestra)
     * visible, con enlaces generados o con personas que ya confirmaron.
     *
     * @param  array<string, mixed>  $summary  la tarjeta del evento (ManagerEvents::summary)
     */
    public static function needsConfirmation(array $summary): bool
    {
        // Si no se pudo leer, no sabemos qué tiene: mejor pedirla.
        if (isset($summary['error'])) {
            return true;
        }
        if ($summary['template'] ?? false) {
            return false;
        }
        $counts = $summary['counts'] ?? [];

        return ($summary['published'] ?? false) || ($counts['invitations'] ?? 0) > 0 || ($counts['guests'] ?? 0) > 0;
    }

    /**
     * @param  array{usuario: string, nombre: string}  $by
     * @param  string|null  $confirm  la dirección escrita por quien elimina
     * @return string dónde quedó, relativo a eventos/
     *
     * @throws ConfirmationRequired si hacía falta escribir la dirección y no coincide
     * @throws RuntimeException si no existe o si no se pudo mover
     */
    public function discard(string $slug, array $by, CarbonImmutable $now, ?string $confirm = null): string
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            throw new RuntimeException('Esa invitación ya no existe.');
        }
        $summary = $this->list->summary($slug);
        if (self::needsConfirmation($summary) && trim((string) $confirm) !== $slug) {
            throw new ConfirmationRequired("Para eliminarla, escribe su dirección: {$slug}");
        }
        $trash = $this->events->root().'/'.self::DIR;
        if (! is_dir($trash) && ! mkdir($trash, 0775, true) && ! is_dir($trash)) {
            throw new RuntimeException('No se pudo preparar la papelera del gestor.');
        }
        $base = $slug.'-'.$now->format('Ymd-His');
        $name = $base;
        for ($i = 2; file_exists("{$trash}/{$name}"); $i++) {
            $name = "{$base}-{$i}";
        }
        if (! rename($dir, "{$trash}/{$name}")) {
            throw new RuntimeException('No se pudo eliminar. Intenta de nuevo.');
        }
        $this->events->forget($slug);
        $this->upgradeLog("{$trash}/".self::LOG);
        $this->csv->append("{$trash}/".self::LOG, self::HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'evento' => $slug,
            'tipo' => ($summary['template'] ?? false) ? 'plantilla' : (($summary['demo'] ?? false) ? 'muestra' : 'invitacion'),
            'carpeta' => self::DIR.'/'.$name,
            'enlaces' => (int) ($summary['counts']['invitations'] ?? 0),
            'confirmados' => (int) ($summary['counts']['attending'] ?? 0),
            'usuario' => $by['usuario'],
            'nombre' => CsvFile::safe($by['nombre']),
        ]);

        return self::DIR.'/'.$name;
    }

    /**
     * La primera versión de la papelera (solo plantillas, release v11) anotaba la columna
     * "plantilla". Se pasa una vez a "evento" con tipo "plantilla", para que la bitácora no
     * tenga dos columnas para lo mismo.
     */
    private function upgradeLog(string $path): void
    {
        if (! is_file($path)) {
            return;
        }
        $this->csv->locked($path, function () use ($path) {
            $rows = $this->csv->read($path);
            if ($rows === [] || ! array_key_exists('plantilla', $rows[0]) || array_key_exists('evento', $rows[0])) {
                return;
            }
            $this->csv->write($path, self::HEADERS, array_map(
                fn ($row) => [...$row, 'evento' => $row['plantilla'], 'tipo' => 'plantilla'],
                $rows,
            ));
        });
    }
}
