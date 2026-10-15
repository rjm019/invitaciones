<?php

namespace Tests\Unit\Design;

use App\Services\Design\DesignFile;
use App\Services\Design\DesignState;
use App\Services\Design\DesignStore;
use App\Services\Design\StoredDesign;
use LogicException;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/** Lo que hay en disco de una invitación, leído una vez: versión y "cambios sin publicar". */
class DesignStateTest extends TestCase
{
    use CopiesEventFixtures;

    private DesignFile $file;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->file = app(DesignFile::class);
    }

    public function test_the_version_of_a_file_written_by_the_system_is_the_same_as_before(): void
    {
        // Antes la versión salía de descifrar el archivo y volver a escribirlo; ahora, de sus
        // bytes. En lo que escribe el sistema es lo mismo: una ventana abierta no se entera.
        $path = "{$this->eventos}/nueva/invitacion.csv";
        [$design] = $this->file->read($path);
        $this->file->write($path, $design);

        $this->assertSame('p-'.$this->file->hash($design), app(DesignStore::class)->version('nueva'));
    }

    public function test_writing_returns_exactly_what_is_on_disk(): void
    {
        [$design] = $this->file->read("{$this->eventos}/nueva/invitacion.csv");
        $path = "{$this->eventos}/nueva/otra.csv";

        $bytes = $this->file->write($path, $design);

        $this->assertSame(file_get_contents($path), $bytes);
    }

    public function test_the_same_invitation_written_differently_is_not_a_pending_change(): void
    {
        $bytes = (string) file_get_contents("{$this->eventos}/nueva/invitacion.csv");
        // Lo mismo, guardado por otro programa: sin BOM y con saltos de línea de Mac.
        $excel = str_replace("\r\n", "\n", substr($bytes, 3));
        $live = StoredDesign::fromBytes($this->file, $bytes);

        $same = $this->state(StoredDesign::fromBytes($this->file, $excel), $live);
        $this->assertNotSame($same->draft?->hash(), $live->hash());
        $this->assertFalse($same->pending());

        [$design] = $this->file->parseCsv($bytes);
        $design->event['festejada'] = 'Otra Festejada';
        $this->assertTrue($this->state(StoredDesign::fromBytes($this->file, $this->file->toCsv($design)), $live)->pending());
    }

    public function test_with_a_draft_the_published_version_is_read_only_when_needed(): void
    {
        $draft = StoredDesign::fromBytes($this->file, (string) file_get_contents("{$this->eventos}/nueva/invitacion.csv"));
        $state = new DesignState('/no/importa', $draft, false, fn () => throw new LogicException('no hacía falta leerla'));

        $this->assertSame('draft', $state->source());
        $this->assertSame('b-'.$draft->hash(), $state->version());
    }

    public function test_saving_answers_with_the_state_it_left_without_reading_the_draft_again(): void
    {
        $store = app(DesignStore::class);
        $before = $store->state('nueva');
        $design = $before->current()->design();
        $design->event['festejada'] = 'Otra Festejada';

        $after = $store->saveDraft('nueva', $design, $before->version());

        $this->assertSame('draft', $after->source());
        $this->assertSame($store->version('nueva'), $after->version());
        $this->assertSame(file_get_contents("{$this->eventos}/nueva/borrador/invitacion.csv"), $after->draft?->bytes);
        $this->assertTrue($after->pending());
        $this->assertSame('Otra Festejada', $after->current()->design()->event('festejada'));
    }

    private function state(StoredDesign $draft, StoredDesign $live): DesignState
    {
        return new DesignState('/no/importa', $draft, false, fn () => [$live, []]);
    }
}
