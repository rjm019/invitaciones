<?php

namespace Tests\Feature;

use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class EventMusicTest extends TestCase
{
    use CopiesEventFixtures;

    private const PLAYLIST = 'https://open.spotify.com/intl-es/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        config(['app.debug' => true]);
    }

    public function test_without_settings_the_music_is_the_event_mp3(): void
    {
        $this->getJson('/api/public/events/prueba')
            ->assertOk()
            ->assertJsonPath('event.music', ['source' => 'file', 'audio_url' => null, 'spotify_url' => null]);
    }

    public function test_with_a_playlist_and_no_mp3_the_playlist_plays_when_the_envelope_opens(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'spotify,'.self::PLAYLIST);
        $this->appendLine('prueba', 'secciones.csv', '4,playlist,Mi playlist,,,,,SI,mitad,');

        $music = $this->getJson('/api/public/events/prueba')->assertOk()->json('event.music');

        $this->assertSame('spotify', $music['source']);
        $this->assertSame(self::PLAYLIST, $music['spotify_url']);
        $this->assertSame('spotify', $this->getJson('/api/public/events/prueba')->json('event.sections.3.type'));
    }

    public function test_the_owner_chooses_the_source_explicitly(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'spotify,'.self::PLAYLIST);
        $this->appendLine('prueba', 'evento.csv', 'musica_audio,cancion.mp3');
        $this->appendLine('prueba', 'secciones.csv', '4,musica,Dale play,,,,,SI,,');

        $this->getJson('/api/public/events/prueba')->assertJsonPath('event.music.source', 'file');

        $this->appendLine('prueba', 'evento.csv', 'musica_fuente,Spotify');
        $this->getJson('/api/public/events/prueba')->assertJsonPath('event.music.source', 'spotify');
    }

    public function test_the_layout_explains_what_is_missing_for_spotify(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'musica_fuente,spotify');
        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');
        $this->assertStringContainsString('agrega el enlace de la playlist en la clave spotify', $errors[0]);

        $this->appendLine('prueba', 'evento.csv', 'spotify,'.self::PLAYLIST);
        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');
        $this->assertStringContainsString('agrega la sección playlist o musica', $errors[0]);
    }

    public function test_a_link_that_is_not_from_spotify_is_a_layout_error(): void
    {
        $this->appendLine('prueba', 'evento.csv', 'spotify,https://youtube.com/watch?v=1');
        $this->appendLine('prueba', 'evento.csv', 'musica_fuente,radio');

        $errors = $this->getJson('/api/public/events/prueba')->assertStatus(503)->json('errors');

        $this->assertStringContainsString('evento → spotify', $errors[0]);
        $this->assertStringContainsString("musica_fuente: 'radio' no existe", $errors[1]);
    }
}
