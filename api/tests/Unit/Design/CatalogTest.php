<?php

namespace Tests\Unit\Design;

use App\Services\Design\Catalog;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    /** Los tipos que pinta la web (web/src/components/sectionRegistry.ts). */
    private const WEB_TYPES = [
        'hero-envelope', 'music-player', 'blessing', 'save-the-date', 'photo-arch', 'location',
        'quote', 'itinerary', 'dress-code', 'no-kids', 'countdown', 'weather', 'hotels', 'spotify',
        'rsvp', 'dedications', 'closing',
    ];

    public function test_every_section_maps_to_a_section_the_web_paints(): void
    {
        $types = array_map(fn ($kind) => Catalog::type($kind), Catalog::kinds());

        $this->assertEqualsCanonicalizing(self::WEB_TYPES, $types);
    }

    public function test_aliases_point_to_known_sections_and_slots_and_texts_are_complete(): void
    {
        foreach (Catalog::ALIASES as $alias => $kind) {
            $this->assertNotNull(Catalog::section($kind), "alias {$alias}");
        }
        foreach (Catalog::kinds() as $kind) {
            foreach (Catalog::slots($kind) as $key => $slot) {
                $this->assertNotSame('', $slot['slot'], "{$kind} → {$key}");
            }
            $blocks = Catalog::textBlocks($kind);
            $this->assertNotEmpty($blocks, $kind);
            // Dos bloques de una sección nunca van al mismo nombre del contrato.
            $this->assertSame(count($blocks), count(array_unique(array_column($blocks, 'block'))), $kind);
        }
    }

    public function test_the_editor_gets_the_whole_catalog(): void
    {
        $catalog = Catalog::toArray();

        $this->assertCount(17, $catalog['sections']);
        $itinerary = collect($catalog['sections'])->firstWhere('id', 'itinerario');
        $this->assertSame('itinerary', $itinerary['type']);
        $this->assertSame(['hora', 'actividad', 'icono'], array_column($itinerary['list']['fields'], 'key'));
        $this->assertContains(['key' => 'hora', 'block' => 'time', 'label' => 'Horas'], $itinerary['texts']);
        $this->assertSame(['min' => 50, 'max' => 250], $catalog['text_size']);
        $this->assertSame('reveal', collect($catalog['effects'])->firstWhere('key', 'aparecer')['effect']);
        $this->assertSame('bg', collect($catalog['colors'])->firstWhere('key', 'fondo')['token']);
    }
}
