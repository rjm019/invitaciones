<?php

namespace App\Services\Design;

/**
 * La invitación completa en el formato nuevo (lo que guarda invitacion.csv): los bloques
 * generales (evento, colores, fuentes, textos, pagina) y las secciones en su orden.
 * Es lo que edita el gestor; el builder la convierte en el config público.
 */
final class Design
{
    /**
     * @param  array<string, string>  $event
     * @param  array<string, string>  $colors
     * @param  array<string, string>  $fonts
     * @param  array<string, string>  $texts
     * @param  array<string, string>  $page
     * @param  list<DesignSection>  $sections
     */
    public function __construct(
        public array $event = [],
        public array $colors = [],
        public array $fonts = [],
        public array $texts = [],
        public array $page = [],
        public array $sections = [],
    ) {}

    /** Valor de "evento", o null si está vacío. */
    public function event(string $key): ?string
    {
        $value = trim($this->event[$key] ?? '');

        return $value === '' ? null : $value;
    }

    public function section(string $id): ?DesignSection
    {
        foreach ($this->sections as $section) {
            if ($section->id === $id) {
                return $section;
            }
        }

        return null;
    }

    /** La primera sección de un tipo (visible o no): es la dueña de los datos de ese tipo. */
    public function first(string $kind): ?DesignSection
    {
        foreach ($this->sections as $section) {
            if ($section->kind() === $kind) {
                return $section;
            }
        }

        return null;
    }

    /**
     * El bloque reservado por su nombre en el CSV.
     *
     * @return array<string, string>
     */
    public function block(string $name): array
    {
        return match ($name) {
            'evento' => $this->event,
            'colores' => $this->colors,
            'fuentes' => $this->fonts,
            'textos' => $this->texts,
            'pagina' => $this->page,
            default => [],
        };
    }

    /** @param  array<string, string>  $values */
    public function setBlock(string $name, array $values): void
    {
        match ($name) {
            'evento' => $this->event = $values,
            'colores' => $this->colors = $values,
            'fuentes' => $this->fonts = $values,
            'textos' => $this->texts = $values,
            'pagina' => $this->page = $values,
        };
    }

    /**
     * Para el editor (JSON).
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'event' => (object) $this->event,
            'colors' => (object) $this->colors,
            'fonts' => (object) $this->fonts,
            'texts' => (object) $this->texts,
            'page' => (object) $this->page,
            'sections' => array_map(fn (DesignSection $s) => [
                'id' => $s->id,
                'fields' => (object) $s->fields,
                'items' => array_map(fn ($item) => (object) $item, $s->items),
            ], $this->sections),
        ];
    }

    /**
     * Desde el JSON del editor. La forma ya viene validada (DesignController); aquí solo
     * se pasa a texto y se quitan los valores vacíos.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $values = function (mixed $block): array {
            $out = [];
            foreach (is_array($block) ? $block : [] as $key => $value) {
                $value = is_bool($value) ? ($value ? 'SI' : 'NO') : trim((string) $value);
                if ($value !== '') {
                    $out[(string) $key] = $value;
                }
            }

            return $out;
        };

        $sections = [];
        foreach ($data['sections'] ?? [] as $section) {
            $sections[] = new DesignSection(
                (string) ($section['id'] ?? ''),
                $values($section['fields'] ?? []),
                array_values(array_filter(array_map($values, $section['items'] ?? []), fn ($item) => $item !== [])),
            );
        }

        return new self(
            $values($data['event'] ?? []),
            $values($data['colors'] ?? []),
            $values($data['fonts'] ?? []),
            $values($data['texts'] ?? []),
            $values($data['page'] ?? []),
            $sections,
        );
    }
}
