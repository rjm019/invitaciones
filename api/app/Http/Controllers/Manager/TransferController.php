<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Design\DesignTransfer;
use App\Services\Layout\EventRepository;
use App\Services\Manager\DesignPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Desarmar (exportar) y volver a armar (importar) una invitación. */
class TransferController extends Controller
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignTransfer $transfer,
    ) {}

    /** GET /api/manager/events/{slug}/export?format=csv|xlsx|zip */
    public function export(Request $request, string $slug): JsonResponse|BinaryFileResponse
    {
        if ($this->events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        $data = $request->validate(['format' => ['sometimes', Rule::in(['csv', 'xlsx', 'zip'])]], [
            'format.*' => 'Elige CSV, Excel o paquete.',
        ]);
        $file = $this->transfer->export($slug, $data['format'] ?? 'csv');

        return response()->download($file['path'], $file['name'], ['Content-Type' => $file['type']])->deleteFileAfterSend();
    }

    /**
     * POST /api/manager/events/{slug}/import — multipart { file } (.csv, .xlsx o .zip)
     * Lo importado cae en el borrador → lo mismo que GET design, más los avisos.
     */
    public function import(Request $request, string $slug, DesignPayload $payload): JsonResponse
    {
        if ($this->events->path($slug) === null) {
            return response()->json(['message' => 'Evento no encontrado.'], 404);
        }
        $data = $request->validate(['file' => ['required', 'file', 'max:'.(60 * 1024)]], [
            'file.max' => 'El archivo pesa más de 60 MB.',
            'file.*' => 'Elige un archivo .csv, .xlsx o .zip.',
        ]);

        try {
            $result = $this->transfer->import($slug, (string) $data['file']->getRealPath(), (string) $data['file']->getClientOriginalName());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => ['file' => [$e->getMessage()]]], 422);
        }

        return response()->json([...$payload->full($slug), 'import' => $result]);
    }
}
