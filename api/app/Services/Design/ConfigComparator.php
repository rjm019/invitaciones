<?php

namespace App\Services\Design;

/**
 * Compara el config que arma el Excel de antes con el que arma el formato nuevo, para
 * migrar solo cuando la invitación queda idéntica. No cuenta lo que el formato nuevo
 * agrega (key, colores, adornos y estilos de texto por sección; page; extra_fonts) ni las
 * secciones ocultas, que antes se mandaban y ahora no (la web nunca las pintó).
 */
final class ConfigComparator
{
    private const NEW_SECTION_KEYS = ['key', 'colors', 'decor', 'text_styles', 'image'];

    private const NEW_EVENT_KEYS = ['page', 'extra_fonts'];

    private const MAX_DIFFERENCES = 40;

    /**
     * @param  array<string, mixed>  $legacy
     * @param  array<string, mixed>  $new
     * @return list<string> diferencias en español; vacía si son iguales
     */
    public function differences(array $legacy, array $new): array
    {
        $out = [];
        $this->diff($this->normalize($legacy), $this->normalize($new), '', $out);

        return array_slice($out, 0, self::MAX_DIFFERENCES);
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function normalize(array $config): array
    {
        // Los objetos (assets) se vuelven arreglos, como los ve la web en el JSON.
        $config = json_decode(json_encode($config, JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        foreach (self::NEW_EVENT_KEYS as $key) {
            unset($config[$key]);
        }
        $sections = [];
        foreach ($config['sections'] ?? [] as $section) {
            if (($section['visible'] ?? true) === false) {
                continue;
            }
            foreach (self::NEW_SECTION_KEYS as $key) {
                unset($section[$key]);
            }
            $sections[] = $section;
        }
        $config['sections'] = $sections;

        return $this->sortKeys($config);
    }

    private function sortKeys(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        if (! array_is_list($value)) {
            ksort($value, SORT_STRING);
        }

        return array_map($this->sortKeys(...), $value);
    }

    /** @param  list<string>  $out */
    private function diff(mixed $before, mixed $after, string $path, array &$out): void
    {
        if (count($out) >= self::MAX_DIFFERENCES) {
            return;
        }
        if (is_array($before) && is_array($after)) {
            foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
                $child = $path === '' ? (string) $key : "{$path}.{$key}";
                if (! array_key_exists($key, $after)) {
                    $out[] = "{$child}: antes ".$this->show($before[$key]).', ahora no está';
                } elseif (! array_key_exists($key, $before)) {
                    $out[] = "{$child}: antes no estaba, ahora ".$this->show($after[$key]);
                } else {
                    $this->diff($before[$key], $after[$key], $child, $out);
                }
            }

            return;
        }
        if ($before !== $after) {
            $out[] = "{$path}: antes ".$this->show($before).', ahora '.$this->show($after);
        }
    }

    private function show(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return mb_strlen((string) $json) > 80 ? mb_substr((string) $json, 0, 77).'…' : (string) $json;
    }
}
