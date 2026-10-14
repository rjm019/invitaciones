<?php

namespace App\Services\Design;

use Illuminate\Validation\ValidationException;

/**
 * La invitación que manda el editor (JSON) → Design, revisando la forma y los límites
 * antes de tocar un archivo: nombres de campos, ids de secciones, tamaños y tipos.
 * Los valores no se validan aquí (eso lo hace el builder y lo muestra en el editor).
 */
final class DesignInput
{
    private const KEY = '/^[a-z0-9_]{1,60}$/';

    private const ID = '/^[a-z_]{2,40}(-\d{1,3})?$/';

    private const BLOCKS = ['event', 'colors', 'fonts', 'texts', 'page'];

    /**
     * @throws ValidationException
     */
    public static function parse(mixed $data): Design
    {
        if (! is_array($data)) {
            self::fail('La invitación no tiene la forma esperada.');
        }
        foreach (self::BLOCKS as $block) {
            self::values($data[$block] ?? [], "design.{$block}");
        }

        $sections = $data['sections'] ?? [];
        if (! is_array($sections) || ! array_is_list($sections)) {
            self::fail('Las secciones no tienen la forma esperada.');
        }
        if (count($sections) > Catalog::LIMITS['sections']) {
            self::fail('Son demasiadas secciones (máximo '.Catalog::LIMITS['sections'].').');
        }
        $seen = [];
        foreach ($sections as $i => $section) {
            $id = is_array($section) ? ($section['id'] ?? null) : null;
            if (! is_string($id) || ! preg_match(self::ID, $id) || in_array($id, Catalog::RESERVED, true)) {
                self::fail('La sección '.($i + 1).' no tiene un nombre válido.');
            }
            if (isset($seen[$id])) {
                self::fail("La sección {$id} está repetida.");
            }
            $seen[$id] = true;
            self::values($section['fields'] ?? [], "sección {$id}", Catalog::LIMITS['fields']);
            $items = $section['items'] ?? [];
            if (! is_array($items) || ! array_is_list($items) || count($items) > Catalog::LIMITS['items']) {
                self::fail("La lista de {$id} no tiene la forma esperada (máximo ".Catalog::LIMITS['items'].' elementos).');
            }
            foreach ($items as $item) {
                self::values($item, "sección {$id}");
            }
        }

        return Design::fromArray($data);
    }

    private static function values(mixed $values, string $where, int $max = 200): void
    {
        if ($values === [] || $values === null) {
            return;
        }
        if (! is_array($values) || array_is_list($values) || count($values) > $max) {
            self::fail("{$where}: los campos no tienen la forma esperada.");
        }
        foreach ($values as $key => $value) {
            if (! preg_match(self::KEY, (string) $key)) {
                self::fail("{$where}: el campo '{$key}' no tiene un nombre válido.");
            }
            if (! is_null($value) && ! is_scalar($value)) {
                self::fail("{$where} → {$key}: el valor no es texto.");
            }
            if (is_string($value) && mb_strlen($value) > Catalog::LIMITS['value']) {
                self::fail("{$where} → {$key}: el texto es demasiado largo (máximo ".Catalog::LIMITS['value'].' letras).');
            }
        }
    }

    /** @return never */
    private static function fail(string $message): void
    {
        throw ValidationException::withMessages(['design' => $message]);
    }
}
