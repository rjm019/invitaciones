<?php

namespace Tests\Concerns;

use App\Services\Csv\CsvFile;
use App\Services\Invitations\InvitationStore;
use Illuminate\Support\Facades\File;

/**
 * Las pruebas que escriben (invitaciones, respuestas, ajustes) trabajan sobre una copia de
 * tests/Fixtures/eventos: los fixtures del repo nunca cambian.
 */
trait CopiesEventFixtures
{
    protected string $eventos;

    protected function copyEventFixtures(): void
    {
        $this->eventos = storage_path('framework/testing/eventos-'.bin2hex(random_bytes(4)));
        File::copyDirectory(base_path('tests/Fixtures/eventos'), $this->eventos);
        config(['invitaciones.eventos_path' => $this->eventos]);
        $this->beforeApplicationDestroyed(fn () => File::deleteDirectory($this->eventos));
    }

    /** @param  array<string, array{0: string, 1: int, 2?: string}>  $invitations  id → [token, invitados, para] */
    protected function writeInvitations(string $slug, array $invitations): void
    {
        $rows = [];
        foreach ($invitations as $id => [$token, $passes]) {
            $rows[] = ['id' => (string) $id, 'token' => $token, 'invitados' => $passes, 'para' => $invitations[$id][2] ?? '', 'creada' => '2026-10-01 09:00'];
        }
        (new CsvFile)->write("{$this->eventos}/{$slug}/".InvitationStore::FILE, InvitationStore::HEADERS, $rows);
    }

    /** @return list<array<string, string>> */
    protected function readCsv(string $slug, string $file): array
    {
        return (new CsvFile)->read("{$this->eventos}/{$slug}/{$file}");
    }

    protected function appendLine(string $slug, string $file, string $line): void
    {
        file_put_contents("{$this->eventos}/{$slug}/{$file}", $line."\r\n", FILE_APPEND);
    }
}
