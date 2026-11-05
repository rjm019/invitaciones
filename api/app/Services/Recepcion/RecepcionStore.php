<?php

namespace App\Services\Recepcion;

/**
 * Estado compartido del buscador de invitados (recepcion/): una sola lista para todos los
 * dispositivos, en eventos/_recepcion/estado.json. Escritura atómica (tmp + rename) y con flock.
 *
 * @phpstan-type Estado array{rev: int, categorias: list<array{id: string, etiqueta: string}>, invitados: list<array<string, mixed>>}
 */
class RecepcionStore
{
    private const TEXT_FIELDS = [
        'nombre', 'categoria', 'hora', 'comentario', 'nota_hora', 'nota_por',
        'marcado_por', 'sustituye_a', 'editado_por',
    ];

    private const BOOL_FIELDS = ['llego', 'libre', 'extra'];

    private function dir(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/').'/_recepcion';
    }

    private function path(): string
    {
        return $this->dir().'/estado.json';
    }

    /** @return Estado */
    public function read(): array
    {
        $json = is_file($this->path()) ? file_get_contents($this->path()) : false;
        $data = $json === false ? null : json_decode($json, true);

        return [
            'rev' => (int) ($data['rev'] ?? 0),
            'categorias' => array_values($data['categorias'] ?? []),
            'invitados' => array_values($data['invitados'] ?? []),
        ];
    }

    /**
     * Reemplaza toda la lista (carga del administrador).
     *
     * @param  list<array<string, mixed>>  $categorias
     * @param  list<array<string, mixed>>  $invitados
     * @return Estado
     */
    public function replace(array $categorias, array $invitados): array
    {
        return $this->locked(function (array $current) use ($categorias, $invitados) {
            $cats = [];
            foreach ($categorias as $c) {
                $cats[] = ['id' => $this->text($c['id'] ?? '', 40), 'etiqueta' => $this->text($c['etiqueta'] ?? '', 60)];
            }
            $byId = [];
            foreach ($invitados as $g) {
                $r = $this->record($g);
                $byId[$r['id']] = $r;
            }

            return ['rev' => $current['rev'] + 1, 'categorias' => $cats, 'invitados' => array_values($byId)];
        });
    }

    /**
     * Mezcla los renglones que cambiaron (por id; el último en llegar gana).
     *
     * @param  list<array<string, mixed>>  $changes
     * @return Estado
     */
    public function merge(array $changes): array
    {
        return $this->locked(function (array $current) use ($changes) {
            $byId = [];
            foreach ($current['invitados'] as $g) {
                $byId[$g['id']] = $g;
            }
            foreach ($changes as $g) {
                $r = $this->record($g);
                $byId[$r['id']] = $r;
            }
            ksort($byId);

            return ['rev' => $current['rev'] + 1, 'categorias' => $current['categorias'], 'invitados' => array_values($byId)];
        });
    }

    /** @param  callable(Estado): Estado  $change */
    private function locked(callable $change): array
    {
        if (! is_dir($this->dir())) {
            mkdir($this->dir(), 0775, true);
        }
        $lock = fopen($this->dir().'/.lock', 'c');
        flock($lock, LOCK_EX);
        try {
            $next = $change($this->read());
            $tmp = $this->path().'.tmp';
            file_put_contents($tmp, json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            rename($tmp, $this->path());

            return $next;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * @param  array<string, mixed>  $g
     * @return array<string, mixed>
     */
    private function record(array $g): array
    {
        $r = ['id' => (int) ($g['id'] ?? 0), 'mesa' => max(0, (int) ($g['mesa'] ?? 0))];
        foreach (self::TEXT_FIELDS as $f) {
            $r[$f] = $this->text($g[$f] ?? '', $f === 'comentario' ? 500 : 120);
        }
        foreach (self::BOOL_FIELDS as $f) {
            $r[$f] = (bool) ($g[$f] ?? false);
        }

        return $r;
    }

    private function text(mixed $v, int $max): string
    {
        return mb_substr(trim((string) $v), 0, $max);
    }
}
