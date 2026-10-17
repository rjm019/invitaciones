<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Csv\CsvFile;
use App\Services\Quotes\QuoteStore;
use App\Services\Visits\VisitLog;
use App\Services\Visits\VisitStats;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Las estadísticas del sitio (solo quien administra): las visitas de los últimos días, el
 * contador de hoy y la descarga en CSV con todo lo anotado (con la IP).
 */
class VisitController extends Controller
{
    public const DAYS = [1, 7, 30, 90, 365];

    public function __construct(private readonly VisitLog $log) {}

    /** GET /api/manager/visits?dias=30&alcance=sitio → el resumen (VisitStats). */
    public function index(Request $request, QuoteStore $quotes): JsonResponse
    {
        $data = $this->validated($request) + $request->validate([
            'alcance' => ['sometimes', Rule::in(VisitStats::SCOPES)],
        ], ['alcance.*' => 'Elige qué quieres ver.']);
        [$from, $to] = $this->range((int) ($data['dias'] ?? 30));

        $received = count(array_filter(
            $quotes->all(),
            fn ($q) => substr($q['fecha'], 0, 10) >= $from->format('Y-m-d') && substr($q['fecha'], 0, 10) <= $to->format('Y-m-d'),
        ));

        return response()->json(VisitStats::summarize($this->log->rows($from, $to), $from, $to, $data['alcance'] ?? 'sitio', $received));
    }

    /** GET /api/manager/visits/count → { today }: visitas a la landing hoy (barato, para el contador). */
    public function count(): JsonResponse
    {
        return response()->json(['today' => $this->log->countToday(CarbonImmutable::now('America/Mexico_City'))]);
    }

    /** GET /api/manager/visits/export?dias=30 → visitas.csv con todo (UTF-8 con BOM, para Excel). */
    public function export(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range((int) ($this->validated($request)['dias'] ?? 30));
        $rows = $this->log->rows($from, $to);
        $name = 'visitas-'.$from->format('Y-m-d').'-a-'.$to->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, VisitLog::HEADERS, ',', '"', '', "\r\n");
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($h) => CsvFile::safe($row[$h] ?? ''), VisitLog::HEADERS), ',', '"', '', "\r\n");
            }
            fclose($out);
        }, $name, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{dias?: int|string} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'dias' => ['sometimes', 'integer', Rule::in(self::DAYS)],
        ], ['dias.*' => 'Elige un periodo de la lista.']);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} de hace $days - 1 días a hoy */
    private function range(int $days): array
    {
        $today = CarbonImmutable::now('America/Mexico_City');

        return [$today->subDays($days - 1)->startOfDay(), $today->endOfDay()];
    }
}
