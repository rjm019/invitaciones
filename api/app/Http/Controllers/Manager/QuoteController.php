<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Manager\ManagerAuth;
use App\Services\Quotes\QuoteStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Las cotizaciones de la landing (solo quien administra): la lista, cambiar su estado y su
 * nota, borrarla si la persona lo pide y descargarlas en CSV.
 */
class QuoteController extends Controller
{
    public function __construct(private readonly QuoteStore $quotes) {}

    /** GET /api/manager/quotes → { quotes, new } */
    public function index(): JsonResponse
    {
        $list = $this->quotes->all();

        return response()->json([
            'quotes' => array_map(self::present(...), $list),
            'new' => count(array_filter($list, fn ($q) => $q['estado'] === 'nueva')),
        ]);
    }

    /** GET /api/manager/quotes/count → { new }: barato, para el contador del gestor. */
    public function count(): JsonResponse
    {
        return response()->json(['new' => $this->quotes->newCount()]);
    }

    /** PUT /api/manager/quotes/{id} — { status?, note? } → { quote } · 404 si no existe. */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(QuoteStore::STATES)],
            'note' => ['sometimes', 'nullable', 'string', 'max:'.QuoteStore::MAX_NOTE],
        ], [
            'status.*' => 'Elige un estado de la lista.',
            'note.*' => 'La nota puede tener hasta '.QuoteStore::MAX_NOTE.' letras.',
        ]);
        $changes = [];
        if (isset($data['status'])) {
            $changes['estado'] = $data['status'];
        }
        if (array_key_exists('note', $data)) {
            $changes['nota'] = trim((string) $data['note']);
        }
        $user = $request->attributes->get(ManagerAuth::ATTRIBUTE);
        $quote = $this->quotes->update($id, $changes, (string) ($user['usuario'] ?? ''), CarbonImmutable::now('America/Mexico_City'));
        if ($quote === null) {
            return response()->json(['message' => 'Esa cotización ya no existe.'], 404);
        }

        return response()->json(['quote' => self::present($quote)]);
    }

    /** DELETE /api/manager/quotes/{id} → 204 · 404 si no existe. */
    public function destroy(string $id): JsonResponse
    {
        if (! $this->quotes->delete($id, CarbonImmutable::now('America/Mexico_City'))) {
            return response()->json(['message' => 'Esa cotización ya no existe.'], 404);
        }

        return response()->json(null, 204);
    }

    /** GET /api/manager/quotes/export → cotizaciones.csv (UTF-8 con BOM, para Excel). */
    public function export(): StreamedResponse
    {
        $path = $this->quotes->path();

        return response()->streamDownload(function () use ($path) {
            if (is_file($path)) {
                readfile($path);
            } else {
                echo "\xEF\xBB\xBF".implode(',', QuoteStore::HEADERS)."\r\n";
            }
        }, 'cotizaciones.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @param  array<string, string>  $q
     * @return array<string, mixed>
     */
    private static function present(array $q): array
    {
        return [
            'id' => $q['id'],
            'created_at' => self::iso($q['fecha']),
            'name' => $q['nombre'] !== '' ? $q['nombre'] : null,
            'phone' => $q['telefono'],
            'type' => $q['tipo'],
            'event_date' => $q['fecha_evento'] !== '' ? $q['fecha_evento'] : null,
            'idea' => $q['idea'] !== '' ? $q['idea'] : null,
            'page' => $q['pagina'] !== '' ? $q['pagina'] : null,
            'status' => in_array($q['estado'], QuoteStore::STATES, true) ? $q['estado'] : 'nueva',
            'note' => $q['nota'] !== '' ? $q['nota'] : null,
            'handled_by' => $q['atendio'] !== '' ? $q['atendio'] : null,
            'updated_at' => self::iso($q['actualizada']),
        ];
    }

    private static function iso(string $local): ?string
    {
        return $local === '' ? null : CarbonImmutable::parse($local, 'America/Mexico_City')->toIso8601String();
    }
}
