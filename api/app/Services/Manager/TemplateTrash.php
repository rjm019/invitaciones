<?php

namespace App\Services\Manager;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Eliminar una plantilla desde el gestor. Su carpeta no se borra: pasa a
 * eventos/_gestor/papelera/<slug>-<fecha>/, fuera de la lista y de lo público ("_gestor"
 * nunca es un evento), y papelera.csv anota quién lo hizo. Para recuperarla, basta con
 * regresar la carpeta a eventos/ con su nombre de antes.
 *
 * Solo plantillas: una invitación guarda sus enlaces, sus confirmaciones y sus dedicatorias.
 */
final class TemplateTrash
{
    public const DIR = '_gestor/papelera';

    public const LOG = 'papelera.csv';

    public const HEADERS = ['fecha', 'plantilla', 'carpeta', 'usuario', 'nombre'];

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
    ) {}

    /**
     * @param  array{usuario: string, nombre: string}  $by
     * @return string dónde quedó, relativo a eventos/
     *
     * @throws RuntimeException si no existe, si no es una plantilla o si no se pudo mover
     */
    public function discard(string $slug, array $by, CarbonImmutable $now): string
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            throw new RuntimeException('Esa plantilla ya no existe.');
        }
        if (! $this->events->isTemplate($slug)) {
            throw new RuntimeException('Solo se pueden eliminar plantillas: una invitación guarda sus enlaces y sus confirmaciones.');
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
            throw new RuntimeException('No se pudo eliminar la plantilla. Intenta de nuevo.');
        }
        $this->events->forget($slug);
        $this->csv->append("{$trash}/".self::LOG, self::HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'plantilla' => $slug,
            'carpeta' => self::DIR.'/'.$name,
            'usuario' => $by['usuario'],
            'nombre' => CsvFile::safe($by['nombre']),
        ]);

        return self::DIR.'/'.$name;
    }
}
