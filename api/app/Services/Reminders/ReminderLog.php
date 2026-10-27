<?php

namespace App\Services\Reminders;

use App\Services\Csv\CsvFile;
use App\Services\Invitations\WhatsAppLink;
use App\Services\Layout\EventRepository;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;

/**
 * Lo que se sabe de los recordatorios, todo en CSV:
 * - eventos/<slug>/recordatorios.csv (solo se agrega): fecha, invitacion, wamid, estado, detalle.
 *   estado: enviado, entregado, leido, fallido o baja; el estado de un enlace es su última fila.
 * - eventos/_gestor/whatsapp/mensajes.csv: wamid → evento e invitación (para el webhook).
 * - eventos/_gestor/whatsapp/bajas.csv: teléfonos que pidieron no recibir más (de ningún evento).
 */
final class ReminderLog
{
    public const FILE = 'recordatorios.csv';

    public const HEADERS = ['fecha', 'invitacion', 'wamid', 'estado', 'detalle'];

    public const STATES = ['enviado', 'entregado', 'leido', 'fallido', 'baja'];

    private const INDEX = 'mensajes.csv';

    private const INDEX_HEADERS = ['fecha', 'wamid', 'evento', 'invitacion'];

    private const OPT_OUTS = 'bajas.csv';

    private const OPT_OUT_HEADERS = ['fecha', 'telefono', 'evento', 'invitacion'];

    public function __construct(
        private readonly EventRepository $events,
        private readonly CsvFile $csv,
    ) {}

    /** Carpeta compartida de WhatsApp (índice, bajas y candado de la corrida). */
    public function dir(): string
    {
        return rtrim((string) config('invitaciones.eventos_path'), '/').'/'.ManagerUsers::DIR.'/whatsapp';
    }

    /** Crea la carpeta compartida si hace falta y la devuelve. */
    public function ensureDir(): string
    {
        $dir = $this->dir();
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new \RuntimeException("No se pudo crear {$dir}");
        }

        return $dir;
    }

    /** @return list<array<string, string>> */
    public function rows(string $slug): array
    {
        $dir = $this->events->path($slug);

        return $dir === null ? [] : $this->csv->read($dir.'/'.self::FILE);
    }

    public function add(string $slug, string $invitationId, ?string $wamid, string $state, string $detail, CarbonImmutable $now): void
    {
        $dir = $this->events->path($slug);
        if ($dir === null) {
            return;
        }
        $this->csv->append($dir.'/'.self::FILE, self::HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'invitacion' => $invitationId,
            'wamid' => (string) $wamid,
            'estado' => $state,
            'detalle' => CsvFile::safe($detail),
        ]);
    }

    /**
     * Por invitación: su estado actual (la última fila), el detalle de esa fila, cuántos
     * recordatorios se le enviaron, la fecha-hora del último y el día del último intento
     * (enviado o fallido), que sirve para no insistir dos veces el mismo día.
     *
     * @return array<string, array{status: string, detail: string, sent: int, last_sent: string, last_attempt: string}>
     */
    public function states(string $slug): array
    {
        $out = [];
        foreach ($this->rows($slug) as $row) {
            $id = $row['invitacion'] ?? '';
            $state = $row['estado'] ?? '';
            if ($id === '' || ! in_array($state, self::STATES, true)) {
                continue;
            }
            $s = $out[$id] ?? ['status' => '', 'detail' => '', 'sent' => 0, 'last_sent' => '', 'last_attempt' => ''];
            $s['status'] = $state;
            $s['detail'] = $row['detalle'] ?? '';
            if ($state === 'enviado') {
                $s['sent']++;
                $s['last_sent'] = $row['fecha'] ?? '';
            }
            if ($state === 'enviado' || $state === 'fallido') {
                $s['last_attempt'] = substr($row['fecha'] ?? '', 0, 10);
            }
            $out[$id] = $s;
        }

        return $out;
    }

    /** Recordatorios enviados en el evento (los que cuentan contra su tope). */
    public function sentCount(string $slug): int
    {
        return count(array_filter($this->rows($slug), fn ($r) => ($r['estado'] ?? '') === 'enviado'));
    }

    /** Enviados un día (AAAA-MM-DD), para el límite diario. */
    public function sentOn(string $slug, string $day): int
    {
        return count(array_filter(
            $this->rows($slug),
            fn ($r) => ($r['estado'] ?? '') === 'enviado' && str_starts_with($r['fecha'] ?? '', $day),
        ));
    }

    public function index(string $wamid, string $slug, string $invitationId, CarbonImmutable $now): void
    {
        $this->ensureDir();
        $this->csv->append($this->dir().'/'.self::INDEX, self::INDEX_HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'wamid' => $wamid,
            'evento' => $slug,
            'invitacion' => $invitationId,
        ]);
    }

    /** @return array{slug: string, id: string}|null */
    public function locate(string $wamid): ?array
    {
        if ($wamid === '') {
            return null;
        }
        foreach ($this->csv->read($this->dir().'/'.self::INDEX) as $row) {
            if (($row['wamid'] ?? '') === $wamid) {
                return ['slug' => $row['evento'] ?? '', 'id' => $row['invitacion'] ?? ''];
            }
        }

        return null;
    }

    public function optOut(string $phone, string $slug, string $invitationId, CarbonImmutable $now): void
    {
        $this->ensureDir();
        $this->csv->append($this->dir().'/'.self::OPT_OUTS, self::OPT_OUT_HEADERS, [
            'fecha' => $now->format('Y-m-d H:i:s'),
            'telefono' => WhatsAppLink::phone($phone),
            'evento' => $slug,
            'invitacion' => $invitationId,
        ]);
    }

    /** @return array<string, true> teléfonos (solo dígitos, con lada) que no reciben recordatorios */
    public function optedOut(): array
    {
        $out = [];
        foreach ($this->csv->read($this->dir().'/'.self::OPT_OUTS) as $row) {
            $phone = WhatsAppLink::phone($row['telefono'] ?? '');
            if ($phone !== '') {
                $out[$phone] = true;
            }
        }

        return $out;
    }
}
