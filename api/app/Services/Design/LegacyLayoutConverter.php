<?php

namespace App\Services\Design;

use App\Services\Layout\LayoutReader;

/**
 * Pasa un layout del formato anterior (layout.xlsx o un CSV por pestaña) al formato nuevo.
 * Lo usan la migración (invitacion:migrar), "Convertir" en el gestor y la importación de
 * un Excel viejo. El resultado arma exactamente el mismo config (ConfigComparator lo revisa).
 *
 * - Las pestañas familia, itinerario, ubicaciones y hoteles pasan a ser los elementos de su
 *   sección; retrato y vestimenta_colores, campos de la suya.
 * - Si un dato no tiene sección (hoteles sin "hospedaje"), se crea la sección oculta para
 *   guardarlo: el config sigue igual y el dato no se pierde.
 * - clave_panel y publicado no son parte del diseño: van a ajustes.csv.
 */
final class LegacyLayoutConverter
{
    /** Claves de "evento" que ahora son campos de una sección. */
    private const TO_SECTION = [
        'retrato' => ['foto', 'imagen'],
        'vestimenta_colores' => ['vestimenta', 'colores'],
    ];

    /** Claves de "evento" que pasan a ajustes.csv. */
    public const TO_SETTINGS = ['clave_panel', 'publicado'];

    /** Columnas de la pestaña "secciones" que pasan a la sección (orden y seccion no). */
    private const SECTION_COLUMNS = [
        'titulo', 'subtitulo', 'texto', 'boton', 'variante', 'fondo', 'fondo_ajuste',
        'color_fondo', 'overlay', 'fijo', 'efectos', 'escritorio',
    ];

    /** Pestañas de lista → sección dueña y columnas. */
    private const LISTS = [
        'itinerario' => 'itinerario',
        'ubicaciones' => 'ubicacion',
        'hoteles' => 'hospedaje',
    ];

    private const KNOWN_SHEETS = [
        'evento', 'paleta', 'tipografia', 'secciones', 'familia', 'itinerario', 'ubicaciones',
        'hoteles', 'hospedaje', 'familias',
    ];

    /**
     * @param  array<string, list<array<string, string>>>  $sheets  pestañas de LayoutReader
     * @return array{design: Design, settings: array<string, string>, warnings: list<string>}
     */
    public function convert(array $sheets): array
    {
        $design = new Design;
        $settings = [];
        $warnings = [];
        $toSection = [];

        foreach ($sheets['evento'] ?? [] as $row) {
            $key = LayoutReader::key($row['clave'] ?? '');
            $value = Normalizer::value($row['valor'] ?? '');
            if ($key === '' || $value === '') {
                continue;
            }
            match (true) {
                in_array($key, self::TO_SETTINGS, true) => $settings[$key] = $key === 'publicado' ? (Normalizer::yes($value) ? 'SI' : 'NO') : $value,
                isset(self::TO_SECTION[$key]) => $toSection[$key] = $value,
                default => $design->event[$key] = $value,
            };
        }

        foreach ($sheets['paleta'] ?? [] as $row) {
            $name = LayoutReader::key($row['token'] ?? '');
            $color = trim($row['color'] ?? '');
            if ($name !== '' && $color !== '') {
                $design->colors[$name] = $color;
            }
        }

        foreach ($sheets['tipografia'] ?? [] as $row) {
            $role = LayoutReader::key($row['rol'] ?? '');
            $font = trim($row['fuente'] ?? '');
            if ($role !== '' && $font !== '') {
                $design->fonts[$role] = $font;
            }
        }

        $design->sections = $this->sections($sheets['secciones'] ?? [], $warnings);

        $family = $this->family($sheets['familia'] ?? []);
        if ($family !== []) {
            $this->owner($design, 'bendicion')->items = $family;
        }

        $hotels = $sheets['hoteles'] ?? $sheets['hospedaje'] ?? [];
        foreach (['itinerario' => $sheets['itinerario'] ?? [], 'ubicaciones' => $sheets['ubicaciones'] ?? [], 'hoteles' => $hotels] as $sheet => $rows) {
            $kind = self::LISTS[$sheet];
            $items = $this->items($kind, $rows, $sheet, $warnings);
            if ($items !== []) {
                $this->owner($design, $kind)->items = $items;
            }
        }

        foreach ($toSection as $key => $value) {
            [$kind, $field] = self::TO_SECTION[$key];
            $this->owner($design, $kind)->fields[$field] = $value;
        }

        if (array_filter($sheets['familias'] ?? [], fn ($row) => implode('', $row) !== '') !== []) {
            $warnings[] = 'familias: esta pestaña ya no se usa (los enlaces se generan en el panel); no se pasó';
        }
        foreach (array_keys($sheets) as $sheet) {
            if (! in_array($sheet, self::KNOWN_SHEETS, true)) {
                $warnings[] = "{$sheet}: esta pestaña no es parte del layout; no se pasó";
            }
        }

        return ['design' => $design, 'settings' => $settings, 'warnings' => $warnings];
    }

    /**
     * En el orden de la columna "orden" (con decimales: 9.5, 9.55); un tipo repetido se
     * vuelve "frase-2", "frase-3"…
     *
     * @param  list<array<string, string>>  $rows
     * @param  list<string>  $warnings
     * @return list<DesignSection>
     */
    private function sections(array $rows, array &$warnings): array
    {
        $list = [];
        foreach ($rows as $i => $row) {
            $raw = LayoutReader::key($row['seccion'] ?? '');
            if ($raw === '') {
                continue;
            }
            $list[] = [
                'kind' => $this->kind($raw),
                'order' => is_numeric($row['orden'] ?? '') ? (float) $row['orden'] : $i + 1,
                'row' => $row,
                'line' => $i + 2,
            ];
        }
        usort($list, fn ($a, $b) => $a['order'] <=> $b['order']);

        $seen = [];
        $sections = [];
        foreach ($list as $entry) {
            $kind = $entry['kind'];
            if (Catalog::section($kind) === null) {
                $warnings[] = "secciones, fila {$entry['line']}: '{$kind}' no es un tipo de sección conocido";
            }
            $seen[$kind] = ($seen[$kind] ?? 0) + 1;
            $id = $seen[$kind] > 1 ? "{$kind}-{$seen[$kind]}" : $kind;

            $visible = trim($entry['row']['visible'] ?? '');
            $fields = ['visible' => Normalizer::yes($visible === '' ? 'SI' : $visible) ? 'SI' : 'NO'];
            foreach (self::SECTION_COLUMNS as $column) {
                $value = Normalizer::value($entry['row'][$column] ?? '');
                if ($value !== '') {
                    $fields[$column] = $value;
                }
            }
            $sections[] = new DesignSection($id, $fields);
        }

        return $sections;
    }

    /** Nombre de la pestaña "secciones" (o tipo en inglés) → tipo del formato. */
    private function kind(string $raw): string
    {
        $kind = Catalog::canonicalKind($raw);
        if (Catalog::section($kind) !== null) {
            return $kind;
        }

        return Catalog::kindOfType(str_replace('_', '-', $raw)) ?? $raw;
    }

    /**
     * Un elemento por rol, con un nombre por línea (en el Excel era un renglón por nombre).
     *
     * @param  list<array<string, string>>  $rows
     * @return list<array<string, string>>
     */
    private function family(array $rows): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $role = trim($row['rol'] ?? '');
            $name = trim($row['nombre'] ?? '');
            if ($role === '' || $name === '') {
                continue;
            }
            $groups[$role][] = $name;
        }

        return array_map(
            fn ($role, $names) => ['rol' => (string) $role, 'nombres' => implode("\n", $names)],
            array_keys($groups),
            $groups,
        );
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @param  list<string>  $warnings
     * @return list<array<string, string>>
     */
    private function items(string $kind, array $rows, string $sheet, array &$warnings): array
    {
        $known = Catalog::itemFieldOrder($kind);
        $items = [];
        $ignored = [];
        foreach ($rows as $row) {
            $item = [];
            foreach ($row as $column => $value) {
                $value = Normalizer::value((string) $value);
                if ($value === '') {
                    continue;
                }
                if (in_array($column, $known, true)) {
                    $item[$column] = $value;
                } else {
                    $ignored[$column] = true;
                }
            }
            if ($item !== []) {
                $items[] = $item;
            }
        }
        if ($ignored !== []) {
            $warnings[] = "{$sheet}: las columnas ".implode(', ', array_keys($ignored)).' no se usan; no se pasaron';
        }

        return $items;
    }

    /** La primera sección de un tipo; si no hay, una oculta al final para guardar sus datos. */
    private function owner(Design $design, string $kind): DesignSection
    {
        $section = $design->first($kind);
        if ($section === null) {
            $section = new DesignSection($kind, ['visible' => 'NO']);
            $design->sections[] = $section;
        }

        return $section;
    }
}
