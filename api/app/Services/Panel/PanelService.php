<?php

namespace App\Services\Panel;

use App\Services\Album\AlbumService;
use App\Services\Csv\CsvFile;
use App\Services\Design\TriviaQuiz;
use App\Services\Invitations\DedicationStore;
use App\Services\Invitations\EventSettings;
use App\Services\Invitations\InvitationService;
use App\Services\Invitations\InvitationStore;
use App\Services\Invitations\ResponseStore;
use App\Services\Invitations\RsvpException;
use App\Services\Invitations\TriviaStore;
use App\Services\Invitations\WhatsAppLink;
use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutException;
use App\Services\Layout\LayoutReader;
use App\Services\Quotes\QuoteStore;
use App\Services\Reminders\ReminderPlanner;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Lo que ve y hace el dueño en el panel: la lista de enlaces generados (para cuántas
 * personas es cada uno y quiénes ya confirmaron), las dedicatorias, generar y eliminar
 * enlaces, cambiar la fecha límite (hasta 3 veces) y asignar mesas a los invitados.
 */
final class PanelService
{
    public function __construct(
        private readonly EventRepository $events,
        private readonly InvitationStore $invitations,
        private readonly ResponseStore $responses,
        private readonly EventSettings $settings,
        private readonly DedicationStore $dedications,
        private readonly TriviaStore $trivia,
        private readonly ReminderPlanner $reminders,
        private readonly AlbumService $album,
    ) {}

    /**
     * @return array<string, mixed>
     *
     * @throws LayoutException
     */
    public function overview(string $slug): array
    {
        $event = $this->event($slug);
        $this->album->closeIfDue($slug);
        $guests = $this->responses->all($slug);
        $opens = $this->responses->opens($slug);

        $records = $this->invitations->all($slug);
        $plan = $this->reminders->evaluate($slug, $event, CarbonImmutable::now($event['timezone']));
        $list = [];
        $totals = ['invitations' => 0, 'seats' => 0, 'attending' => 0, 'declined' => 0, 'empty' => 0];
        foreach ($records as $id => $record) {
            $mine = $guests[$id] ?? [];
            $attending = count(array_filter($mine, fn ($g) => $g['attending']));
            $totals['invitations']++;
            $totals['seats'] += $record['passes'];
            $totals['attending'] += $attending;
            $totals['declined'] += count($mine) - $attending;
            $totals['empty'] += max(0, $record['passes'] - count($mine));
            $list[] = $this->present($slug, $event, $record, $mine, $opens[$id]['count'] ?? 0, $plan['reminders'] !== null, $plan['links'][$id] ?? null);
        }

        return [
            'version' => $this->version($slug),
            'brand' => $this->brandOf($slug, $event, withCard: true),
            'event' => [
                'slug' => $slug,
                'title' => $event['title'],
                'celebrant' => $event['celebrant'],
                'starts_at' => $event['starts_at'],
                'timezone' => $event['timezone'],
                'published' => $event['published'],
            ],
            'rsvp' => $this->rsvp($slug, $event),
            'reminders' => $plan['reminders'],
            'summary' => $totals,
            'invitations' => $list,
            'dedications' => $this->dedicationList($slug, $records, $event['timezone']),
            'trivia' => $this->triviaPanel($slug, $event, $records),
            'album' => $this->album->panel($slug, $event, $records),
            'max_passes' => InvitationStore::MAX_PASSES,
        ];
    }

    /**
     * Para la entrada al panel: el título grande ("XV de Nat"), el tema, los colores y las
     * fuentes de la invitación. Sin sesión, nada de fotos ni datos del evento.
     *
     * @return array<string, mixed>
     *
     * @throws LayoutException
     */
    public function brand(string $slug): array
    {
        return $this->brandOf($slug, $this->event($slug), withCard: false);
    }

    /**
     * La marca con la tarjeta para WhatsApp de una invitación que todavía no se publica (el
     * borrador del gestor): sus datos salen de `$value` en lugar de lo publicado.
     *
     * @param  array<string, mixed>  $event  config armado del borrador
     * @param  callable(string): ?string  $value  valor de "evento" en el borrador
     * @return array<string, mixed>
     */
    public function brandFrom(string $slug, array $event, callable $value): array
    {
        return $this->brandOf($slug, $event, withCard: true, value: $value);
    }

    /**
     * Lo que el panel toma de la invitación para verse como ella. Con sesión, además lo que
     * lleva la imagen para WhatsApp: subtítulo, nombre, fecha, salón, archivos del evento y,
     * de la invitación, su fondo y su frase (`tarjeta_fondo`, `tarjeta_frase`, `tarjeta_texto`).
     *
     * @param  (callable(string): ?string)|null  $value  de dónde salen esas claves (por defecto, lo publicado)
     * @return array<string, mixed>
     */
    private function brandOf(string $slug, array $event, bool $withCard, ?callable $value = null): array
    {
        $value ??= fn (string $key) => $this->events->eventValue($slug, $key);
        $brand = [
            'title' => $this->panelTitle($slug, $event, $value),
            'theme' => $event['theme'],
            'palette' => $event['palette'],
            'fonts' => $event['fonts'],
        ];
        if (! $withCard) {
            return $brand;
        }

        return $brand + [
            'subtitle' => $event['subtitle'],
            'celebrant' => $event['celebrant'],
            'starts_at' => $event['starts_at'],
            'timezone' => $event['timezone'],
            'venue' => ['name' => $event['venue']['display_name'], 'city' => $event['venue']['city']],
            'assets' => $event['assets'],
            'card' => [
                'background' => $value('tarjeta_fondo'),
                'phrase' => $value('tarjeta_frase'),
                'text' => $value('tarjeta_texto'),
            ] + $this->frameOf($value),
        ];
    }

    /**
     * Marco de la tarjeta (`tarjeta_marco`, `tarjeta_sello` y la zona del papel interior en %
     * de la imagen). Solo sale lo que el evento define: sin marco, la tarjeta no cambia.
     *
     * @param  callable(string): ?string  $value
     * @return array<string, mixed>
     */
    private function frameOf(callable $value): array
    {
        $zone = [];
        foreach (['top' => 'arriba', 'right' => 'derecha', 'bottom' => 'abajo', 'left' => 'izquierda'] as $side => $name) {
            $raw = str_replace(',', '.', trim((string) $value('tarjeta_zona_'.$name)));
            if ($raw !== '' && is_numeric($raw) && $raw >= 0 && $raw <= 45) {
                $zone[$side] = (float) $raw;
            }
        }

        return array_filter([
            'frame' => $value('tarjeta_marco'),
            'seal' => $value('tarjeta_sello'),
            'frame_zone' => $zone === [] ? null : $zone,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * "titulo_panel" de la invitación; si no hay, "XV de Nat" en unos XV, "Graduación de Diego"
     * en una graduación, o el título del evento.
     */
    public static function titleFor(string $slug, array $event, ?string $panelTitle): string
    {
        $name = $event['celebrant']['short_name'] ?? '';
        $name = $name !== '' ? $name : ($event['celebrant']['full_name'] ?? '');

        return $panelTitle
            ?? match (true) {
                $event['type'] === 'xv' && $name !== '' => "XV de {$name}",
                $event['type'] === 'graduacion' && $name !== '' => "Graduación de {$name}",
                default => $event['title'] ?: $slug,
            };
    }

    /** @param  callable(string): ?string  $value */
    private function panelTitle(string $slug, array $event, callable $value): string
    {
        return self::titleFor($slug, $event, $value('titulo_panel'));
    }

    /**
     * Las dedicatorias, la más reciente primero, con el nombre de su invitación.
     *
     * @param  array<string, array{label: string}>  $records
     * @return list<array<string, mixed>>
     */
    private function dedicationList(string $slug, array $records, string $timezone): array
    {
        $list = [];
        foreach ($this->dedications->all($slug) as $id => $d) {
            $label = $records[$id]['label'] ?? '';
            $list[] = [
                'invitation' => (string) $id,
                'label' => $label !== '' ? $label : null,
                'name' => $d['name'],
                'message' => $d['message'],
                'sent_at' => $this->iso($d['sent_at'], $timezone),
            ];
        }
        usort($list, fn ($a, $b) => strcmp((string) $b['sent_at'], (string) $a['sent_at']));

        return $list;
    }

    /**
     * La trivia del evento: cuántas preguntas tiene, cuándo cierra y el ranking (más
     * aciertos primero y, en empate, menos segundos). null si el evento no tiene trivia.
     *
     * @param  array<string, array{label: string}>  $records
     * @return array{total: int, closes_at: ?string, ranking: list<array<string, mixed>>}|null
     */
    private function triviaPanel(string $slug, array $event, array $records): ?array
    {
        $section = $this->events->design($slug)?->first('trivia');
        $total = count(TriviaQuiz::questions($section));
        if ($section === null || ! $section->visible() || $total === 0) {
            return null;
        }
        $closes = TriviaQuiz::closesAt($section, $event['timezone']) ?? ($event['starts_at'] ? CarbonImmutable::parse($event['starts_at']) : null);

        $ranking = [];
        foreach ($this->trivia->all($slug) as $id => $t) {
            $label = $records[$id]['label'] ?? '';
            $ranking[] = [
                'invitation' => (string) $id,
                'label' => $label !== '' ? $label : null,
                'name' => $t['name'],
                'correct' => $t['correct'],
                'total' => $total,
                'seconds' => $t['seconds'],
                'sent_at' => $this->iso($t['sent_at'], $event['timezone']),
            ];
        }
        usort($ranking, fn ($a, $b) => [$b['correct'], $a['seconds'], (string) $a['sent_at']] <=> [$a['correct'], $b['seconds'], (string) $b['sent_at']]);
        foreach ($ranking as $i => &$row) {
            $row = ['rank' => $i + 1] + $row;
        }
        unset($row);

        return ['total' => $total, 'closes_at' => $closes?->setTimezone($event['timezone'])->toIso8601String(), 'ranking' => $ranking];
    }

    /**
     * El ranking de la trivia como CSV para Excel (UTF-8 con BOM, CRLF).
     *
     * @throws RsvpException 404 si el evento no tiene trivia
     */
    public function triviaCsv(string $slug): string
    {
        $event = $this->event($slug);
        $trivia = $this->triviaPanel($slug, $event, $this->invitations->all($slug))
            ?? throw new RsvpException('Este evento no tiene trivia.', 404);

        $handle = fopen('php://temp', 'w+b');
        fwrite($handle, "\xEF\xBB\xBF");
        $put = fn (array $cells) => fputcsv($handle, $cells, ',', '"', '', "\r\n");
        $put(['lugar', 'nombre', 'invitacion', 'aciertos', 'total', 'segundos', 'fecha']);
        foreach ($trivia['ranking'] as $r) {
            $put(array_map(CsvFile::safe(...), [
                (string) $r['rank'],
                $r['name'],
                $r['label'] ?? '#'.$r['invitation'],
                (string) $r['correct'],
                (string) $r['total'],
                (string) $r['seconds'],
                $r['sent_at'] ? CarbonImmutable::parse($r['sent_at'])->format('Y-m-d H:i:s') : '',
            ]));
        }
        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }

    /**
     * @return array<string, mixed>
     */
    public function createInvitation(string $slug, int $passes, string $label, ?string $phone = null): array
    {
        $event = $this->event($slug);
        $now = CarbonImmutable::now($event['timezone']);
        // Sin la función encendida el teléfono se ignora; con ella, uno inválido se rechaza.
        $enabled = $this->reminders->enabled($slug);
        $record = $this->invitations->create($slug, $passes, $label, $now, $enabled ? $this->normalizePhone($phone) : '');
        $link = $this->reminders->evaluate($slug, $event, $now)['links'][$record['id']] ?? null;

        return $this->present($slug, $event, $record, [], 0, $enabled, $link);
    }

    /**
     * Guarda (o quita) el teléfono de una invitación y devuelve el panel actualizado.
     *
     * @return array<string, mixed>
     *
     * @throws RsvpException 403 función apagada · 404 no existe · 422 teléfono inválido
     */
    public function updatePhone(string $slug, string $id, ?string $phone): array
    {
        $event = $this->event($slug);
        $this->requireReminders($slug);
        $normalized = $this->normalizePhone($phone);
        if ($this->invitations->setPhone($slug, $id, $normalized, CarbonImmutable::now($event['timezone'])) === null) {
            throw new RsvpException("La invitación #{$id} no existe o ya se eliminó.", 404);
        }

        return $this->overview($slug);
    }

    /**
     * Cada cuántos días se recuerda y el permiso del dueño. Quitar el permiso apaga los
     * recordatorios.
     *
     * @return array<string, mixed>
     *
     * @throws RsvpException 403 función apagada · 422 sin permiso
     */
    public function updateReminders(string $slug, int $everyDays, bool $consent): array
    {
        $event = $this->event($slug);
        $this->requireReminders($slug);
        if ($everyDays > 0 && ! $consent) {
            throw new RsvpException('Confirma que tienes permiso de tus invitados para escribirles por WhatsApp.', 422, 'consent');
        }

        $now = CarbonImmutable::now($event['timezone']);
        $current = $this->reminders->settings($slug);
        $this->settings->put($this->events->path($slug), [
            'recordatorio_cada_dias' => $consent && $everyDays > 0 ? (string) $everyDays : null,
            // La fecha del permiso es la primera vez; se borra al quitarlo.
            'recordatorio_permiso' => $consent ? ($current['consent_at'] ?? $now->format('Y-m-d H:i:s')) : null,
        ], $now, EventSettings::OWNER);
        $this->events->forget($slug);

        return $this->overview($slug);
    }

    /** @throws RsvpException 403 si el gestor no encendió los recordatorios */
    private function requireReminders(string $slug): void
    {
        if (! $this->reminders->enabled($slug)) {
            throw new RsvpException('Los recordatorios por WhatsApp no están activos en esta invitación.', 403);
        }
    }

    /**
     * "55 1234 5678" → "525512345678" (solo dígitos, con lada de país); vacío o null → ''.
     *
     * @throws RsvpException 422 si no es un teléfono
     */
    private function normalizePhone(?string $phone): string
    {
        if (trim((string) $phone) === '') {
            return '';
        }
        $normalized = QuoteStore::normalizePhone((string) $phone);
        if ($normalized === null) {
            throw new RsvpException('Escribe un teléfono de 10 dígitos o con lada internacional (+…).', 422, 'phone');
        }

        return ltrim($normalized, '+');
    }

    /**
     * Elige, quita o rechaza fotos del álbum y devuelve el panel actualizado.
     *
     * @param  list<string>  $ids
     * @param  'choose'|'unchoose'|'reject'  $action
     * @return array<string, mixed>
     *
     * @throws RsvpException 404 sin álbum · 409 si ya se borró
     */
    public function decideAlbum(string $slug, array $ids, string $action): array
    {
        $event = $this->event($slug);
        $this->album->decide($slug, $ids, $action, CarbonImmutable::now($event['timezone']));

        return $this->overview($slug);
    }

    /**
     * Elimina una invitación con sus invitados y su dedicatoria, y devuelve el panel
     * actualizado. Primero se marca la invitación (el enlace deja de abrir y ya no acepta
     * nombres); después se quitan sus personas y su dedicatoria, que quedan en los archivos
     * de eliminados.
     *
     * @return array<string, mixed>
     *
     * @throws RsvpException 404 si no existe o ya se había eliminado
     */
    public function deleteInvitation(string $slug, string $id): array
    {
        $event = $this->event($slug);
        $now = CarbonImmutable::now($event['timezone']);
        if ($this->invitations->delete($slug, $id, $now) === null) {
            throw new RsvpException("La invitación #{$id} no existe o ya se eliminó.", 404);
        }
        $this->responses->removeInvitation($slug, $id, $now);
        $this->dedications->removeInvitation($slug, $id, $now);
        $this->trivia->removeInvitation($slug, $id, $now);
        $this->album->removeInvitation($slug, $id, $now);

        return $this->overview($slug);
    }

    /**
     * @return array<string, mixed> la sección rsvp ya con la fecha nueva
     *
     * @throws RsvpException 422 fecha inválida · 409 sin cambios disponibles
     */
    public function changeDeadline(string $slug, string $date): array
    {
        $event = $this->event($slug);
        $today = CarbonImmutable::now($event['timezone'])->format('Y-m-d');
        $eventDay = CarbonImmutable::parse($event['starts_at'])->format('Y-m-d');

        if ($date < $today) {
            throw new RsvpException('La fecha límite no puede ser antes de hoy.', 422, 'deadline');
        }
        if ($date > $eventDay) {
            throw new RsvpException('La fecha límite no puede ser después del evento.', 422, 'deadline');
        }
        if ($date === $event['rsvp']['deadline']) {
            throw new RsvpException('Esa ya es la fecha límite.', 422, 'deadline');
        }

        $this->settings->changeDeadline($this->events->path($slug), $date, $event['rsvp']['deadline'], CarbonImmutable::now($event['timezone']));
        $this->events->forget($slug);

        return $this->rsvp($slug, $this->event($slug));
    }

    /**
     * Huella de los archivos del evento: cambia en cuanto alguien abre o confirma una
     * invitación, o el dueño cambia algo. El panel la consulta cada pocos segundos y solo
     * vuelve a pedir todo cuando cambió (así se ve "en vivo" sin costo).
     */
    public function version(string $slug): string
    {
        $dir = $this->events->path($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
        $files = array_merge(glob($dir.'/*.csv') ?: [], glob($dir.'/'.LayoutReader::XLSX) ?: []);
        sort($files);

        $parts = [];
        foreach ($files as $file) {
            $parts[] = basename($file).':'.(hash_file('xxh128', $file) ?: '');
        }

        return hash('xxh128', implode('|', $parts));
    }

    /**
     * Asigna mesas y devuelve el panel actualizado.
     *
     * @param  list<array{invitation: string, slot: int, table: ?int}>  $assignments
     * @return array<string, mixed>
     */
    public function assignTables(string $slug, array $assignments): array
    {
        $event = $this->event($slug);
        $this->responses->assignTables($slug, $assignments, CarbonImmutable::now($event['timezone']));

        return $this->overview($slug);
    }

    /** @return array<string, mixed> */
    private function event(string $slug): array
    {
        return $this->events->find($slug) ?? throw new RsvpException('Evento no encontrado.', 404);
    }

    /** @return array<string, mixed> */
    private function rsvp(string $slug, array $event): array
    {
        $used = $this->settings->deadlineChanges($this->events->path($slug));

        return [
            'deadline' => $event['rsvp']['deadline'],
            'open' => InvitationService::closedReason($event) === null,
            'changes_used' => $used,
            'changes_left' => max(0, EventSettings::MAX_DEADLINE_CHANGES - $used),
            'max_changes' => EventSettings::MAX_DEADLINE_CHANGES,
        ];
    }

    /**
     * @param  array{id: string, token: string, passes: int, label: string, created_at: string, phone: string}  $record
     * @param  list<array{slot: int, name: string, attending: bool, responded_at: string}>  $guests
     * @param  array{status: string, sent: int, last_sent_at: ?string, next_at: ?string}|null  $reminder
     * @return array<string, mixed>
     */
    private function present(string $slug, array $event, array $record, array $guests, int $opens, bool $remindersOn, ?array $reminder): array
    {
        $url = rtrim((string) config('invitaciones.frontend_url'), '/').'/i/'.$record['token'];
        $template = $this->events->eventValue($slug, 'mensaje_whatsapp') ?? WhatsAppLink::DEFAULT_MESSAGE;
        $name = $record['label'] !== '' ? $record['label'] : '';
        $message = WhatsAppLink::message($template, $name, $record['passes'], $url);

        return [
            'id' => $record['id'],
            'label' => $name !== '' ? $name : null,
            'passes' => $record['passes'],
            'url' => $url,
            // El texto que acompaña a la imagen de la invitación (lleva el enlace).
            'message' => $message,
            'whatsapp_url' => WhatsAppLink::url($remindersOn ? $record['phone'] : '', $message),
            // El teléfono solo sale aquí, en el panel del dueño; nunca en la invitación pública.
            'phone' => $remindersOn && $record['phone'] !== '' ? $record['phone'] : null,
            'reminder' => $remindersOn ? $reminder : null,
            'guests' => array_map(fn ($g) => [
                'slot' => $g['slot'],
                'full_name' => $g['name'],
                'attending' => $g['attending'],
                'table' => $g['table'],
                'responded_at' => $this->iso($g['responded_at'], $event['timezone']),
            ], $guests),
            'opens' => $opens,
            'created_at' => $this->iso($record['created_at'], $event['timezone']),
        ];
    }

    private function iso(string $local, string $timezone): ?string
    {
        if ($local === '') {
            return null;
        }
        try {
            return CarbonImmutable::parse($local, $timezone)->toIso8601String();
        } catch (Throwable) {
            return null;
        }
    }
}
