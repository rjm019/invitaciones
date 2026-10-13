<?php

namespace App\Console\Commands;

use App\Services\Csv\CsvFile;
use App\Services\Layout\EventRepository;
use App\Services\Panel\PanelService;
use Illuminate\Console\Command;

/**
 * ¿Cómo van las confirmaciones? Imprime los totales (lo mismo que el panel) y escribe
 * resumen.csv con una fila por invitación. resumen.csv es derivado: se rehace cada vez.
 */
class InvitationSummary extends Command
{
    protected $signature = 'invitaciones:resumen {slug : Carpeta del evento en eventos/}';

    protected $description = 'Totales de confirmaciones y resumen.csv por invitación';

    public const FILE = 'resumen.csv';

    public function handle(PanelService $panel, EventRepository $events, CsvFile $csv): int
    {
        $slug = (string) $this->argument('slug');
        $dir = $events->path($slug);
        if ($dir === null) {
            $this->error("No existe eventos/{$slug}/");

            return self::FAILURE;
        }
        $data = $panel->overview($slug);

        $rows = array_map(fn ($inv) => [
            'invitacion' => $inv['id'],
            'para' => CsvFile::safe((string) $inv['label']),
            'invitados' => $inv['passes'],
            'asistiran' => count(array_filter($inv['guests'], fn ($g) => $g['attending'])),
            'no_asistiran' => count(array_filter($inv['guests'], fn ($g) => ! $g['attending'])),
            'sin_llenar' => $inv['passes'] - count($inv['guests']),
            'nombres' => implode('; ', array_map(fn ($g) => CsvFile::safe($g['full_name']), $inv['guests'])),
            'aperturas' => $inv['opens'],
            'enlace' => $inv['url'],
        ], $data['invitations']);

        $headers = ['invitacion', 'para', 'invitados', 'asistiran', 'no_asistiran', 'sin_llenar', 'nombres', 'aperturas', 'enlace'];
        $csv->write($dir.'/'.self::FILE, $headers, $rows);

        $s = $data['summary'];
        $this->table(['', 'Total'], [
            ['Invitaciones', $s['invitations']],
            ['Lugares', $s['seats']],
            ['Asistirán', $s['attending']],
            ['No asistirán', $s['declined']],
            ['Sin llenar', $s['empty']],
        ]);
        $this->line('Confirmaciones '.($data['rsvp']['open'] ? 'abiertas' : 'cerradas')." (fecha límite: {$data['rsvp']['deadline']}).");
        $this->line("Detalle por invitación: eventos/{$slug}/".self::FILE);

        return self::SUCCESS;
    }
}
