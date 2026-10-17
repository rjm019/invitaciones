<?php

namespace App\Services\Visits;

use App\Services\Csv\CsvFile;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;

/**
 * Las visitas al sitio (la landing, las invitaciones y las muestras): un renglón por página
 * vista en eventos/_gestor/visitas/AAAA-MM-DD.csv, un archivo por día (fuera de git). Se
 * abren en Excel y solo los ve quien administra el gestor.
 *
 * La IP se guarda para las estadísticas y la seguridad, y se borra a los 365 días (el
 * renglón se queda, sin IP). Si el navegador pide no ser rastreado (DNT o GPC), no se guarda.
 */
final class VisitLog
{
    public const DIR = 'visitas';

    public const HEADERS = ['fecha', 'pagina', 'tipo', 'evento', 'origen', 'referencia', 'campana', 'dispositivo', 'sistema', 'navegador', 'ip', 'visitante', 'equipo'];

    /** landing: la página de ventas · invitacion: /e/<slug> · personal: /i/<token> · muestra: los demos. */
    public const KINDS = ['landing', 'invitacion', 'personal', 'muestra'];

    public const IP_DAYS = 365;

    /** Hasta qué día ya se borraron las IP viejas. */
    private const FORGOTTEN = 'ip-borradas-hasta.txt';

    public function __construct(private readonly CsvFile $csv) {}

    public function dir(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/').'/'.ManagerUsers::DIR.'/'.self::DIR;
    }

    public function path(CarbonImmutable $day): string
    {
        return $this->dir().'/'.$day->format('Y-m-d').'.csv';
    }

    /**
     * Anota una visita. true si fue la primera del día (quien llama aprovecha para borrar
     * las IP que ya cumplieron un año: forgetOldIps).
     *
     * @param  array<string, string>  $visit  las columnas de HEADERS, menos la fecha
     */
    public function record(array $visit, CarbonImmutable $now): bool
    {
        $dir = $this->dir();
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $path = $this->path($now);
        $first = ! is_file($path);

        $row = ['fecha' => $now->format('Y-m-d H:i:s')];
        foreach (self::HEADERS as $header) {
            if ($header !== 'fecha') {
                $row[$header] = CsvFile::safe((string) ($visit[$header] ?? ''));
            }
        }
        $this->csv->append($path, self::HEADERS, $row);

        return $first;
    }

    /**
     * Las visitas de esos días, de la más antigua a la más reciente.
     *
     * @return list<array<string, string>>
     */
    public function rows(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = [];
        for ($day = $from->startOfDay(); $day <= $to; $day = $day->addDay()) {
            foreach ($this->csv->read($this->path($day)) as $row) {
                foreach ($row as $key => $value) {
                    $row[$key] = CsvFile::unsafe($value);
                }
                $rows[] = $row + array_fill_keys(self::HEADERS, '');
            }
        }

        return $rows;
    }

    /** Cuántas visitas de la landing van hoy (sin las del equipo). */
    public function countToday(CarbonImmutable $now): int
    {
        return count(array_filter(
            $this->csv->read($this->path($now)),
            fn ($r) => ($r['tipo'] ?? '') === 'landing' && ($r['equipo'] ?? '') !== 'SI',
        ));
    }

    /**
     * Borra la IP de las visitas de hace más de IP_DAYS días (el renglón se queda). Revisa
     * solo los días que faltan desde la última vez. Devuelve cuántos archivos cambió.
     */
    public function forgetOldIps(CarbonImmutable $now): int
    {
        $dir = $this->dir();
        if (! is_dir($dir)) {
            return 0;
        }
        $cutoff = $now->subDays(self::IP_DAYS)->format('Y-m-d');
        $marker = $dir.'/'.self::FORGOTTEN;
        $done = is_file($marker) ? trim((string) file_get_contents($marker)) : '';
        if ($done >= $cutoff) {
            return 0;
        }

        $changed = 0;
        foreach (scandir($dir) ?: [] as $name) {
            if (! preg_match('/^(\d{4}-\d{2}-\d{2})\.csv$/', $name, $m) || $m[1] <= $done || $m[1] > $cutoff) {
                continue;
            }
            $path = $dir.'/'.$name;
            $changed += $this->csv->locked($path, function () use ($path) {
                $rows = $this->csv->read($path);
                if (! array_filter($rows, fn ($r) => ($r['ip'] ?? '') !== '')) {
                    return 0;
                }
                // Sin respaldo a propósito: la copia guardaría las IP que se están borrando.
                $this->csv->write($path, self::HEADERS, array_map(fn ($r) => ['ip' => ''] + $r, $rows));

                return 1;
            });
        }
        $this->csv->replace($marker, $cutoff."\n");

        return $changed;
    }
}
