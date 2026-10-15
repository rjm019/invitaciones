<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Quotes\QuoteNotifier;
use App\Services\Quotes\QuoteStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

use function Illuminate\Support\defer;

/**
 * POST /api/public/quotes — la landing pide una cotización: { telefono, nombre?, tipo,
 * fecha_evento?, idea?, privacidad, pagina?, empresa (trampa), t (cuándo se abrió la página) }.
 * 201 { ok } · 422 datos inválidos · 429 demasiados envíos. Sin JS, el formulario hace un
 * POST normal y vuelve a la página de "recibimos tu solicitud".
 *
 * Contra robots, sin captcha: un campo oculto que una persona nunca llena y un tiempo mínimo
 * entre abrir la página y enviar. Si cae en alguna, se responde igual que si se guardara
 * (el robot no aprende nada) pero no se guarda.
 */
class QuoteController extends Controller
{
    public const MIN_SECONDS = 3;

    public function store(Request $request, QuoteStore $quotes, QuoteNotifier $notifier): JsonResponse|RedirectResponse
    {
        if ($this->looksLikeABot($request)) {
            return $this->done($request);
        }

        try {
            $data = $request->validate([
                'telefono' => ['required', 'string', 'max:30'],
                'nombre' => ['nullable', 'string', 'max:80'],
                'tipo' => ['required', Rule::in(QuoteStore::TYPES)],
                'fecha_evento' => ['nullable', 'date_format:Y-m-d'],
                'idea' => ['nullable', 'string', 'max:'.QuoteStore::MAX_IDEA],
                'pagina' => ['nullable', 'string', 'max:120'],
                'privacidad' => ['accepted'],
            ], [
                'telefono.*' => 'Escribe tu WhatsApp o teléfono.',
                'nombre.*' => 'Tu nombre puede tener hasta 80 letras.',
                'tipo.*' => 'Elige qué celebras.',
                'fecha_evento.*' => 'Elige una fecha válida (o déjala vacía).',
                'idea.*' => 'Tu idea puede tener hasta '.QuoteStore::MAX_IDEA.' letras.',
                'privacidad.*' => 'Necesitamos que aceptes el aviso de privacidad para escribirte.',
            ]);
        } catch (ValidationException $e) {
            if (! $request->expectsJson()) {
                return redirect('/#cotizar');
            }
            throw $e;
        }

        $phone = QuoteStore::normalizePhone($data['telefono']);
        if ($phone === null) {
            if (! $request->expectsJson()) {
                return redirect('/#cotizar');
            }
            $message = 'Revisa tu número: 10 dígitos (por ejemplo 55 1234 5678).';

            return response()->json(['message' => $message, 'errors' => ['telefono' => [$message]]], 422);
        }

        $quote = $quotes->add([
            'nombre' => self::line((string) ($data['nombre'] ?? '')),
            'telefono' => $phone,
            'tipo' => $data['tipo'],
            'fecha_evento' => (string) ($data['fecha_evento'] ?? ''),
            'idea' => self::text((string) ($data['idea'] ?? '')),
            'pagina' => self::line((string) ($data['pagina'] ?? '')),
        ], CarbonImmutable::now('America/Mexico_City'));

        // El correo sale después de responder: quien cotiza nunca espera al servidor de correo.
        defer(fn () => $notifier->send($quote));

        return $this->done($request);
    }

    private function looksLikeABot(Request $request): bool
    {
        if (trim((string) $request->input('empresa', '')) !== '') {
            return true;
        }
        $opened = (int) $request->input('t', 0); // milisegundos, del reloj del navegador

        return $opened > 0 && (int) (microtime(true) * 1000) - $opened < self::MIN_SECONDS * 1000;
    }

    private function done(Request $request): JsonResponse|RedirectResponse
    {
        return $request->expectsJson()
            ? response()->json(['ok' => true], 201)
            : redirect('/cotizacion-enviada');
    }

    private static function line(string $value): string
    {
        return trim((string) preg_replace(['/[\x00-\x1F\x7F]+/u', '/\s+/u'], ' ', $value));
    }

    private static function text(string $value): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $value);
        $text = (string) preg_replace(['/[\x00-\x09\x0B-\x1F\x7F]+/u', '/[ \t]+/u', '/\n{3,}/u'], [' ', ' ', "\n\n"], $text);

        return trim($text);
    }
}
