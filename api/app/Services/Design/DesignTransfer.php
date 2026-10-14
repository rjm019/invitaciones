<?php

namespace App\Services\Design;

use App\Services\Layout\EventRepository;
use App\Services\Layout\LayoutReader;
use Illuminate\Support\Facades\File;
use RuntimeException;
use ZipArchive;

/**
 * Desarmar y volver a armar una invitación:
 *
 * - Exportar: invitacion.csv, invitacion.xlsx (con la hoja "guia") o un paquete .zip con la
 *   invitación y todos sus archivos de media/. Nunca lleva la clave del panel ni los datos
 *   de los invitados.
 * - Importar: cualquiera de esos, o un Excel del formato anterior (se convierte). Lo
 *   importado siempre cae en el borrador: se revisa en la vista previa y luego se publica.
 */
final class DesignTransfer
{
    public const MAX_ZIP_FILES = 300;

    public const MAX_ZIP_BYTES = 200 * 1024 * 1024;

    public function __construct(
        private readonly EventRepository $events,
        private readonly DesignStore $store,
        private readonly DesignFile $file,
        private readonly LayoutReader $reader,
        private readonly LegacyLayoutConverter $converter,
    ) {}

    /**
     * @param  'csv'|'xlsx'|'zip'  $format
     * @return array{path: string, name: string, type: string} archivo temporal listo para descargar
     */
    public function export(string $slug, string $format): array
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
        $design = $this->exportable($this->store->current($slug)['design']);
        $tmp = tempnam(sys_get_temp_dir(), 'inv');

        switch ($format) {
            case 'csv':
                file_put_contents($tmp, $this->file->toCsv($design));

                return ['path' => $tmp, 'name' => "invitacion-{$slug}.csv", 'type' => 'text/csv; charset=UTF-8'];
            case 'xlsx':
                $xlsx = $tmp.'.xlsx';
                $this->file->writeXlsx($xlsx, $design);
                @unlink($tmp);

                return ['path' => $xlsx, 'name' => "invitacion-{$slug}.xlsx", 'type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            case 'zip':
                $zip = new ZipArchive;
                if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
                    throw new RuntimeException('No se pudo armar el paquete.');
                }
                $zip->addFromString(DesignFile::FILE, $this->file->toCsv($design));
                foreach (scandir($dir.'/media') ?: [] as $name) {
                    if (EventRepository::isMediaName($name) && is_file("{$dir}/media/{$name}")) {
                        $zip->addFile("{$dir}/media/{$name}", "media/{$name}");
                    }
                }
                $zip->close();

                return ['path' => $tmp, 'name' => "invitacion-{$slug}.zip", 'type' => 'application/zip'];
            default:
                throw new RuntimeException('Formato desconocido.');
        }
    }

    /**
     * Lee un archivo (csv, xlsx o zip) y lo deja como borrador del evento.
     *
     * @return array{warnings: list<string>, media: list<string>} avisos y archivos que llegaron
     *
     * @throws RuntimeException con el motivo en español
     */
    public function import(string $slug, string $path, string $originalName): array
    {
        $dir = $this->events->path($slug) ?? throw new RuntimeException('Evento no encontrado.');
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $media = [];

        [$design, $warnings] = match ($extension) {
            'csv' => $this->file->parseCsv((string) file_get_contents($path)),
            'xlsx' => $this->readWorkbook($path),
            'zip' => $this->readZip($path, $dir, $media),
            default => throw new RuntimeException('Sube un archivo .csv, .xlsx o .zip.'),
        };

        $design = $this->exportable($design);
        $this->store->saveDraft($slug, $design, $this->store->version($slug));

        return ['warnings' => $warnings, 'media' => $media];
    }

    /** Sin lo privado (la clave del panel y "publicado" van en ajustes.csv). */
    private function exportable(Design $design): Design
    {
        $copy = clone $design;
        unset($copy->event['clave_panel'], $copy->event['publicado']);

        return $copy;
    }

    /** @return array{0: Design, 1: list<string>} */
    private function readWorkbook(string $path): array
    {
        if (! DesignFile::isLegacyWorkbook($path)) {
            return $this->file->readXlsx($path);
        }
        // Excel del formato anterior: se lee como siempre y se convierte.
        $tmp = sys_get_temp_dir().'/layout-'.bin2hex(random_bytes(4));
        mkdir($tmp);
        try {
            copy($path, $tmp.'/'.LayoutReader::XLSX);
            $converted = $this->converter->convert($this->reader->read($tmp));
        } finally {
            File::deleteDirectory($tmp);
        }

        return [$converted['design'], ['Excel del formato anterior: se convirtió al formato nuevo.', ...$converted['warnings']]];
    }

    /**
     * Un paquete: la invitación (invitacion.csv, invitacion.xlsx o layout.xlsx) y media/.
     * Un archivo de media con el nombre de uno que ya existe y es distinto se guarda con otro
     * nombre, y la invitación se corrige para usarlo.
     *
     * @param  list<string>  $media  archivos que llegaron
     * @return array{0: Design, 1: list<string>}
     */
    private function readZip(string $path, string $dir, array &$media): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('El paquete no se pudo abrir (¿es un .zip?).');
        }
        try {
            if ($zip->numFiles > self::MAX_ZIP_FILES) {
                throw new RuntimeException('El paquete tiene demasiados archivos.');
            }
            $designEntry = null;
            $mediaEntries = [];
            $total = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $name = (string) ($stat['name'] ?? '');
                $total += (int) ($stat['size'] ?? 0);
                if ($total > self::MAX_ZIP_BYTES) {
                    throw new RuntimeException('El paquete es demasiado grande (más de 200 MB).');
                }
                if (str_ends_with($name, '/') || str_starts_with($name, '__MACOSX/') || basename($name) === '.DS_Store') {
                    continue;
                }
                if (in_array($name, [DesignFile::FILE, 'invitacion.xlsx', LayoutReader::XLSX], true)) {
                    $designEntry ??= $name;
                    $designEntry = $name === DesignFile::FILE ? $name : $designEntry;

                    continue;
                }
                // Solo media/<archivo> de un nivel, con un nombre seguro y un tipo permitido.
                if (preg_match('#^media/([^/\\\\]+)$#', $name, $m) && EventRepository::isMediaName($m[1]) && ! preg_match('/\.svg$/i', $m[1])) {
                    $mediaEntries[$i] = $m[1];

                    continue;
                }
                throw new RuntimeException("El paquete trae algo que no es de una invitación: {$name}");
            }
            if ($designEntry === null) {
                throw new RuntimeException('El paquete no trae invitacion.csv.');
            }

            $tmp = sys_get_temp_dir().'/paquete-'.bin2hex(random_bytes(4));
            mkdir($tmp);
            try {
                $designPath = $tmp.'/'.basename($designEntry);
                file_put_contents($designPath, (string) $zip->getFromName($designEntry));
                [$design, $warnings] = str_ends_with($designEntry, '.csv')
                    ? $this->file->read($designPath)
                    : $this->readWorkbook($designPath);

                $renames = [];
                if (! is_dir($dir.'/media')) {
                    mkdir($dir.'/media', 0775, true);
                }
                foreach ($mediaEntries as $index => $name) {
                    $bytes = (string) $zip->getFromIndex($index);
                    $target = $name;
                    if (is_file("{$dir}/media/{$name}")) {
                        if (hash_file('xxh128', "{$dir}/media/{$name}") === hash('xxh128', $bytes)) {
                            continue;
                        }
                        $target = pathinfo($name, PATHINFO_FILENAME).'-'.bin2hex(random_bytes(2)).'.'.pathinfo($name, PATHINFO_EXTENSION);
                        $renames[$name] = $target;
                    }
                    file_put_contents("{$dir}/media/{$target}", $bytes);
                    $media[] = $target;
                }
                if ($renames !== []) {
                    $this->rename($design, $renames);
                    $warnings[] = count($renames).' archivo(s) ya existían con otro contenido: se guardaron con otro nombre.';
                }
            } finally {
                File::deleteDirectory($tmp);
            }

            return [$design, $warnings];
        } finally {
            $zip->close();
        }
    }

    /** @param  array<string, string>  $renames  nombre viejo → nuevo */
    private function rename(Design $design, array $renames): void
    {
        $swap = fn (array $values) => array_map(fn ($v) => $renames[$v] ?? $v, $values);
        $design->event = $swap($design->event);
        $design->page = $swap($design->page);
        foreach ($design->sections as $section) {
            $section->fields = $swap($section->fields);
            $section->items = array_map($swap, $section->items);
        }
    }
}
