<?php

namespace App\Services\Design;

/**
 * Filas de invitacion.csv (seccion, elemento, campo, valor) ⇄ Design.
 *
 * Al leer es tolerante: acepta alias y mayúsculas, ignora filas vacías y avisa (sin perder
 * nada) de lo repetido o lo desconocido. Al escribir siempre usa el mismo orden y no
 * escribe valores vacíos: leer y volver a escribir da el mismo archivo.
 */
final class DesignCodec
{
    public const HEADERS = ['seccion', 'elemento', 'campo', 'valor'];

    /**
     * @param  iterable<array<string, string>>  $rows  filas con encabezados normalizados; `_fila` = número de fila
     * @return array{0: Design, 1: list<string>} el diseño y los avisos
     */
    public function fromRows(iterable $rows): array
    {
        $design = new Design;
        $warnings = [];
        $blocks = array_fill_keys(Catalog::RESERVED, []);
        /** @var array<string, array{fields: array<string, string>, items: array<int, array<string, string>>}> $sections */
        $sections = [];

        foreach ($rows as $i => $row) {
            $line = (int) ($row['_fila'] ?? ($i + 2));
            $rawBlock = trim($row['seccion'] ?? '');
            $field = Normalizer::key($row['campo'] ?? '');
            $value = Normalizer::value($row['valor'] ?? '');
            $rawItem = trim($row['elemento'] ?? '');

            if ($rawBlock === '' && $field === '' && $value === '') {
                continue;
            }
            if ($rawBlock === '' || $field === '') {
                $warnings[] = "fila {$line}: falta la sección o el campo; se ignoró";

                continue;
            }

            $reserved = Normalizer::key($rawBlock);
            $isReserved = in_array($reserved, Catalog::RESERVED, true);
            $block = $isReserved ? $reserved : Normalizer::sectionId($rawBlock);
            if ($block === '') {
                $warnings[] = "fila {$line}: la sección '{$rawBlock}' no es válida; se ignoró";

                continue;
            }

            $item = null;
            if ($rawItem !== '') {
                if (! ctype_digit($rawItem) || (int) $rawItem < 1) {
                    $warnings[] = "fila {$line}: elemento '{$rawItem}' debe ser un número (1, 2, 3…); se ignoró";

                    continue;
                }
                $item = (int) $rawItem;
            }

            if ($isReserved) {
                if ($item !== null) {
                    $warnings[] = "fila {$line}: {$block} no tiene elementos; se ignoró";

                    continue;
                }
                if ($value === '') {
                    continue;
                }
                if (isset($blocks[$block][$field])) {
                    $warnings[] = "fila {$line}: {$block} → {$field} está repetido; se usa el último";
                }
                $blocks[$block][$field] = $value;

                continue;
            }

            $sections[$block] ??= ['fields' => [], 'items' => []];
            if ($value === '') {
                continue;
            }
            if ($item === null) {
                if (isset($sections[$block]['fields'][$field])) {
                    $warnings[] = "fila {$line}: {$block} → {$field} está repetido; se usa el último";
                }
                $sections[$block]['fields'][$field] = $value;
            } else {
                if (isset($sections[$block]['items'][$item][$field])) {
                    $warnings[] = "fila {$line}: {$block}, elemento {$item} → {$field} está repetido; se usa el último";
                }
                $sections[$block]['items'][$item][$field] = $value;
            }
        }

        foreach (Catalog::RESERVED as $name) {
            $design->setBlock($name, $blocks[$name]);
        }
        foreach ($sections as $id => $section) {
            ksort($section['items']);
            $kind = DesignSection::kindOf($id);
            if (Catalog::section($kind) === null) {
                $warnings[] = "sección '{$id}': no es un tipo de sección conocido";
            }
            $design->sections[] = new DesignSection($id, $section['fields'], array_values($section['items']));
        }

        return [$design, $warnings];
    }

    /**
     * Filas en el orden de siempre: evento, colores, fuentes, textos, pagina y luego las
     * secciones en su orden (cada una empieza con "visible").
     *
     * @return list<array{seccion: string, elemento: string, campo: string, valor: string}>
     */
    public function toRows(Design $design): array
    {
        $rows = [];
        $add = function (string $block, string $item, array $values, array $order) use (&$rows) {
            foreach ($this->ordered($values, $order) as $field => $value) {
                $value = trim((string) $value);
                if ($value !== '') {
                    $rows[] = ['seccion' => $block, 'elemento' => $item, 'campo' => $field, 'valor' => $value];
                }
            }
        };

        $add('evento', '', $design->event, Catalog::eventOrder());
        $add('colores', '', $design->colors, array_keys(Catalog::COLORS));
        $add('fuentes', '', $design->fonts, array_keys(Catalog::FONTS));
        $add('textos', '', $design->texts, Catalog::textsOrder());
        $add('pagina', '', $design->page, Catalog::pageOrder());

        foreach ($design->sections as $section) {
            $kind = $section->kind();
            $fields = $section->fields;
            // La fila "visible" abre cada sección: así una sección sin nada más también existe.
            $fields['visible'] = $section->visible() ? 'SI' : 'NO';
            $add($section->id, '', $fields, Catalog::fieldOrder($kind));
            foreach ($section->items as $n => $item) {
                $add($section->id, (string) ($n + 1), $item, Catalog::itemFieldOrder($kind));
            }
        }

        return $rows;
    }

    /**
     * Primero las claves en el orden del catálogo; las demás después, en orden alfabético.
     *
     * @param  array<string, string>  $values
     * @param  list<string>  $order
     * @return array<string, string>
     */
    private function ordered(array $values, array $order): array
    {
        $out = [];
        foreach ($order as $key) {
            if (array_key_exists($key, $values)) {
                $out[$key] = $values[$key];
            }
        }
        $rest = array_diff_key($values, $out);
        ksort($rest, SORT_STRING);

        return $out + $rest;
    }
}
