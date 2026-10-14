<?php

namespace Tests\Unit\Design;

use App\Services\Design\Design;
use App\Services\Design\DesignFile;
use App\Services\Design\DesignSection;
use Tests\TestCase;

class DesignFileTest extends TestCase
{
    private DesignFile $file;

    protected function setUp(): void
    {
        parent::setUp();
        $this->file = app(DesignFile::class);
    }

    private function fixture(): string
    {
        return base_path('tests/Fixtures/eventos/nueva/invitacion.csv');
    }

    public function test_reading_and_writing_gives_back_the_same_file(): void
    {
        [$design, $warnings] = $this->file->read($this->fixture());
        $this->assertSame([], $warnings);

        $tmp = tempnam(sys_get_temp_dir(), 'inv');
        $this->file->write($tmp, $design);
        [$again] = $this->file->read($tmp);
        $tmp2 = tempnam(sys_get_temp_dir(), 'inv');
        $this->file->write($tmp2, $again);

        $this->assertSame(file_get_contents($tmp), file_get_contents($tmp2));
        $this->assertEquals($design, $again);
        // UTF-8 con BOM y CRLF, como todos los CSV del sistema.
        $this->assertStringStartsWith("\xEF\xBB\xBFseccion,elemento,campo,valor\r\n", (string) file_get_contents($tmp));
        @unlink($tmp);
        @unlink($tmp2);
    }

    public function test_reads_blocks_sections_in_order_and_numbered_items(): void
    {
        [$design] = $this->file->read($this->fixture());

        $this->assertSame('Festejada Nueva', $design->event('festejada'));
        $this->assertSame('#2F4A7A', $design->colors['acento']);
        $this->assertSame('Great Vibes', $design->fonts['script']);
        $this->assertSame('acento', $design->texts['titulo_color']);
        $this->assertSame(['portada', 'bendicion', 'foto', 'itinerario', 'vestimenta', 'confirmacion'], array_map(fn ($s) => $s->id, $design->sections));
        $this->assertFalse($design->section('confirmacion')->visible());

        $itinerary = $design->section('itinerario');
        $this->assertSame(['hora' => '5:00 pm', 'actividad' => 'Recepción'], $itinerary->items[0]);
        $this->assertSame('corona.webp', $itinerary->items[1]['icono']);
        // Un valor de varias líneas (un nombre por línea).
        $this->assertSame("Persona Uno\nPersona Dos", $design->section('bendicion')->items[0]['nombres']);
    }

    public function test_accepts_aliases_ids_with_numbers_gaps_and_capitals(): void
    {
        $csv = "seccion,elemento,campo,valor\n"
            ."Sobre,,boton,Abre\n"
            ."Frase,,texto,Primera\n"
            ."frase-2,,texto,Segunda\n"
            ."Hoteles,5,Nombre,Hotel B\n"
            ."hoteles,2,nombre,Hotel A\n"
            ."frase-1,,efectos,aparecer\n";

        [$design, $warnings] = $this->file->parseCsv($csv);

        $this->assertSame([], $warnings);
        $this->assertSame(['portada', 'frase', 'frase-2', 'hospedaje'], array_map(fn ($s) => $s->id, $design->sections));
        // "frase-1" es la primera frase.
        $this->assertSame(['texto' => 'Primera', 'efectos' => 'aparecer'], $design->section('frase')->fields);
        // Los elementos se ordenan por número (los huecos no importan).
        $this->assertSame([['nombre' => 'Hotel A'], ['nombre' => 'Hotel B']], $design->section('hospedaje')->items);
    }

    public function test_warns_about_repeated_and_broken_rows_without_losing_the_rest(): void
    {
        $csv = "seccion,elemento,campo,valor\n"
            ."evento,,tema,uno\n"
            ."evento,,tema,dos\n"
            .",,titulo,sin sección\n"
            ."itinerario,x,hora,17:00\n"
            ."evento,1,tema,tres\n"
            ."inventada,,algo,valor\n";

        [$design, $warnings] = $this->file->parseCsv($csv);

        $this->assertSame('dos', $design->event('tema'));
        $this->assertCount(5, $warnings);
        $this->assertStringContainsString('fila 3: evento → tema está repetido', $warnings[0]);
        $this->assertStringContainsString('fila 4: falta la sección', $warnings[1]);
        $this->assertStringContainsString("fila 5: elemento 'x'", $warnings[2]);
        $this->assertStringContainsString('fila 6: evento no tiene elementos', $warnings[3]);
        $this->assertStringContainsString("'inventada': no es un tipo de sección conocido", $warnings[4]);
        // Lo desconocido se conserva.
        $this->assertSame(['algo' => 'valor'], $design->section('inventada')->fields);
    }

    public function test_reads_what_excel_saves_windows_1252_with_semicolons(): void
    {
        $csv = mb_convert_encoding("seccion;elemento;campo;valor\r\nevento;;festejada;Sofía Peña\r\nfrase;;texto;\"Uno; dos\"\r\n", 'Windows-1252', 'UTF-8');

        [$design] = $this->file->parseCsv($csv);

        $this->assertSame('Sofía Peña', $design->event('festejada'));
        $this->assertSame('Uno; dos', $design->section('frase')->field('texto'));
    }

    public function test_formulas_are_neutralized_in_the_file_and_restored_when_read(): void
    {
        $design = new Design(event: ['rsvp_whatsapp' => '+5217711234567', 'titulo' => '=HYPERLINK("x")']);
        $tmp = tempnam(sys_get_temp_dir(), 'inv');

        $this->file->write($tmp, $design);
        $this->assertStringContainsString("evento,,titulo,\"'=HYPERLINK(\"\"x\"\")\"", (string) file_get_contents($tmp));
        [$back] = $this->file->read($tmp);

        $this->assertSame('=HYPERLINK("x")', $back->event('titulo'));
        $this->assertSame('+5217711234567', $back->event('rsvp_whatsapp'));
        @unlink($tmp);
    }

    public function test_every_section_is_written_with_its_visible_row_even_without_fields(): void
    {
        $design = new Design(sections: [new DesignSection('clima'), new DesignSection('cierre', ['visible' => 'no'])]);

        $csv = $this->file->toCsv($design);

        $this->assertStringContainsString("clima,,visible,SI\r\ncierre,,visible,NO\r\n", $csv);
    }

    public function test_a_file_without_the_columns_is_not_an_invitation(): void
    {
        $this->expectExceptionMessage('faltan las columnas');

        $this->file->parseCsv("clave,valor\ntema,jardin-azul\n");
    }

    public function test_the_xlsx_version_reads_the_same_and_ignores_the_guide(): void
    {
        [$design] = $this->file->read($this->fixture());
        $tmp = sys_get_temp_dir().'/inv-'.bin2hex(random_bytes(4)).'.xlsx';

        $this->file->writeXlsx($tmp, $design);
        [$fromXlsx, $warnings] = $this->file->readXlsx($tmp);

        $this->assertSame([], $warnings);
        $this->assertEquals($design, $fromXlsx);
        $this->assertFalse(DesignFile::isLegacyWorkbook($tmp));
        @unlink($tmp);
    }
}
