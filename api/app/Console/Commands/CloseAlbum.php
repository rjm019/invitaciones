<?php

namespace App\Console\Commands;

use App\Services\Album\AlbumService;
use App\Services\Layout\EventRepository;
use Illuminate\Console\Command;

/**
 * Borra el álbum de un evento si ya terminó su último día (lo mismo que hace solo la primera
 * petición después del cierre). Idempotente: correrlo otra vez no hace nada.
 */
class CloseAlbum extends Command
{
    protected $signature = 'album:cerrar {slug : Carpeta del evento en eventos/}';

    protected $description = 'Borra el álbum de los invitados si ya terminaron sus días (se anota en album.csv)';

    public function handle(AlbumService $album, EventRepository $events): int
    {
        $slug = (string) $this->argument('slug');
        if ($events->path($slug) === null) {
            $this->error("No existe eventos/{$slug}");

            return self::FAILURE;
        }
        $window = $album->windowFor($slug);
        if ($window === null) {
            $this->info('Este evento no tiene álbum (o no se sabe cuándo es).');

            return self::SUCCESS;
        }
        if ($album->closeIfDue($slug)) {
            $this->info('Álbum borrado. Quedó anotado en album.csv.');
        } elseif ($window['state'] === 'closed') {
            $this->info('El álbum ya estaba borrado.');
        } else {
            $this->info("Todavía no toca: se borra al terminar el {$window['last_day']} (estado: {$window['state']}).");
        }

        return self::SUCCESS;
    }
}
