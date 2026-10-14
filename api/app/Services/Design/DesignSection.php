<?php

namespace App\Services\Design;

/**
 * Una sección de la invitación: su id ("itinerario", "frase-2"), sus campos y los
 * elementos de su lista (momentos, lugares, hoteles…). Los valores son texto tal como
 * van en invitacion.csv; el builder los valida.
 */
final class DesignSection
{
    /**
     * @param  array<string, string>  $fields
     * @param  list<array<string, string>>  $items
     */
    public function __construct(
        public string $id,
        public array $fields = [],
        public array $items = [],
    ) {}

    /** "frase-2" → "frase". */
    public function kind(): string
    {
        return self::kindOf($this->id);
    }

    public static function kindOf(string $id): string
    {
        return (string) preg_replace('/-\d+$/', '', $id);
    }

    /** Sin el campo, la sección se ve (como en el Excel). */
    public function visible(): bool
    {
        $value = trim($this->fields['visible'] ?? '');

        return $value === '' || Normalizer::yes($value);
    }

    public function field(string $key): ?string
    {
        $value = trim($this->fields[$key] ?? '');

        return $value === '' ? null : $value;
    }

    /** @return array{id: string, fields: array<string, string>, items: list<array<string, string>>} */
    public function toArray(): array
    {
        return ['id' => $this->id, 'fields' => $this->fields, 'items' => $this->items];
    }
}
