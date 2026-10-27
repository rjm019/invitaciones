<?php

namespace Tests\Feature;

use App\Services\Album\AlbumService;
use App\Services\Invitations\InvitationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

/** Álbum de los invitados (fase 9 §6): evento "nueva", día del evento = 28-nov-2026 (America/Mexico_City). */
class AlbumTest extends TestCase
{
    use CopiesEventFixtures;

    private const TOKEN_A = 'NuevaToken01';

    private const TOKEN_B = 'NuevaToken02';

    private const BEFORE = '2026-11-27 23:59:59 America/Mexico_City';

    private const EVENT_DAY = '2026-11-28 00:00:00 America/Mexico_City';

    /** Último segundo del día 5 (el 3-dic): todavía abierto. */
    private const LAST_MOMENT = '2026-12-03 23:59:59 America/Mexico_City';

    private const CLOSED = '2026-12-04 00:00:00 America/Mexico_City';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        $this->writeInvitations('nueva', [1 => [self::TOKEN_A, 2, 'Familia Nueva'], 2 => [self::TOKEN_B, 3]]);
        $this->addAlbum();
        $this->at(self::EVENT_DAY);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function at(string $when): void
    {
        CarbonImmutable::setTestNow($when);
    }

    /** @param  list<string>  $extra */
    private function addAlbum(array $extra = []): void
    {
        foreach (['album,,visible,SI', 'album,,titulo,Álbum de Nue', ...$extra] as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }
    }

    private function photo(string $name = 'f.jpg', int $w = 1200, int $h = 900): UploadedFile
    {
        return UploadedFile::fake()->image($name, $w, $h);
    }

    private function upload(string $token = self::TOKEN_A, ?UploadedFile $file = null): TestResponse
    {
        return $this->post("/api/public/invitations/{$token}/album", ['photo' => $file ?? $this->photo()], ['Accept' => 'application/json']);
    }

    private function panelToken(): string
    {
        return $this->postJson('/api/admin/events/nueva/session', ['password' => 'clave-de-prueba-nueva'])->assertOk()->json('token');
    }

    private function decide(string $token, array $ids, string $action): TestResponse
    {
        return $this->putJson('/api/admin/events/nueva/album', ['ids' => $ids, 'action' => $action], ['Authorization' => "Bearer {$token}"]);
    }

    /** @return list<array<string, string>> */
    private function rows(): array
    {
        return $this->readCsv('nueva', AlbumService::FILE);
    }

    public function test_before_the_event_day_nothing_can_be_uploaded(): void
    {
        $this->at(self::BEFORE);

        $this->upload()->assertStatus(409)->assertJsonPath('message', 'Todavía no es el día de la fiesta. ¡Ese día podrás subir tus fotos aquí!');
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertOk()
            ->assertJsonPath('invitation.album.state', 'before')
            ->assertJsonPath('invitation.album.can_upload', false);
        $this->assertSame([], $this->rows());
        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/album");
    }

    public function test_on_the_event_day_a_photo_is_recoded_with_a_thumbnail_and_stays_private(): void
    {
        $this->upload(file: $this->photo('grande.jpg', 3200, 2400))->assertCreated()
            ->assertJsonPath('album.state', 'event_day')
            ->assertJsonPath('album.used', 1)
            ->assertJsonPath('album.remaining', 1);

        $row = $this->rows()[0];
        $this->assertSame('pendiente', $row['estado']);
        $this->assertSame('1', $row['invitacion']);
        $this->assertSame('Familia Nueva', $row['para']);
        $this->assertSame('1600', $row['ancho']);
        $this->assertSame('1200', $row['alto']);
        $file = "{$this->eventos}/nueva/album/{$row['archivo']}";
        $this->assertFileExists($file);
        $this->assertSame(IMAGETYPE_WEBP, getimagesize($file)[2]);
        $this->assertSame([1600, 1200], array_slice(getimagesize($file), 0, 2));
        $thumb = "{$this->eventos}/nueva/album/".str_replace('.webp', '-480.webp', $row['archivo']);
        $this->assertSame(480, getimagesize($thumb)[0]);
        $this->assertStringNotContainsString('EXIF', (string) file_get_contents($file));
        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/media/album");
    }

    public function test_a_tall_photo_is_limited_by_its_longest_side(): void
    {
        $this->upload(file: $this->photo('alta.jpg', 2400, 3200))->assertCreated();
        $row = $this->rows()[0];
        $this->assertSame(['1200', '1600'], [$row['ancho'], $row['alto']]);
    }

    public function test_the_third_photo_is_rejected_and_a_rejection_frees_the_place(): void
    {
        $this->upload()->assertCreated();
        $this->upload()->assertCreated()->assertJsonPath('album.remaining', 0)->assertJsonPath('album.can_upload', false);
        $this->upload()->assertStatus(422)->assertJsonPath('message', 'Ya subiste tus 2 fotos. ¡Gracias por compartirlas!');
        $this->assertCount(2, $this->rows());
        // Otra invitación tiene sus propios 2 lugares.
        $this->upload(self::TOKEN_B)->assertCreated();

        $first = $this->rows()[0];
        $this->decide($this->panelToken(), [$first['id']], 'reject')->assertOk()->assertJsonPath('album.counts.pending', 2);
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/album/{$first['archivo']}");
        $this->assertSame('rechazada', $this->rows()[0]['estado']);

        $this->upload()->assertCreated()->assertJsonPath('album.used', 2);
    }

    public function test_an_invalid_or_oversized_photo_is_rejected_without_processing(): void
    {
        $this->upload(file: UploadedFile::fake()->create('nota.txt', 4, 'text/plain'))->assertStatus(422);
        $this->upload(file: UploadedFile::fake()->create('enorme.jpg', 9000, 'image/jpeg'))->assertStatus(422)
            ->assertJsonPath('message', 'La foto pesa más de 8 MB. Elige otra o reduce su tamaño.');
        $this->upload(file: $this->photo('ancha.png', 4200, 100))->assertStatus(422)
            ->assertJsonPath('errors.photo.0', 'La foto es demasiado grande (más de 4096 píxeles). Elige otra o reduce su tamaño.');
        $this->assertSame([], $this->rows());
    }

    public function test_the_event_cap_answers_507_with_a_friendly_message(): void
    {
        $this->addAlbum(['album,,album_max_mb,10']);
        mkdir("{$this->eventos}/nueva/album", 0775, true);
        file_put_contents("{$this->eventos}/nueva/album/relleno.bin", str_repeat('x', 10 * 1024 * 1024 + 1));

        $this->upload()->assertStatus(507)->assertJsonPath('message', 'El álbum ya está lleno y no recibe más fotos. ¡Gracias por querer compartir!');
        $this->assertSame([], $this->rows());

        $panel = $this->getJson('/api/admin/events/nueva', ['Authorization' => 'Bearer '.$this->panelToken()])->assertOk();
        $panel->assertJsonPath('album.near_limit', true)->assertJsonPath('album.percent', 100);
    }

    public function test_pending_photos_are_never_public_and_only_chosen_ones_are_served(): void
    {
        $this->upload()->assertCreated();
        $id = $this->rows()[0]['id'];
        $name = $this->rows()[0]['archivo'];
        $panelToken = $this->panelToken();

        // Pendiente: ni en el config público, ni en /media, ni sin sesión del panel.
        foreach (['/api/public/events/nueva', '/api/public/invitations/'.self::TOKEN_A] as $url) {
            $this->assertStringNotContainsString($id, $this->getJson($url)->assertOk()->getContent());
        }
        $this->get("/media/nueva/album/{$name}")->assertNotFound();
        $this->get("/api/admin/events/nueva/album/{$id}/photo")->assertUnauthorized();
        $this->get("/api/admin/events/nueva/album/{$id}/thumb", ['Authorization' => "Bearer {$panelToken}"])->assertOk();

        // Elegida: se copia a media/album y sale en el config.
        $this->decide($panelToken, [$id], 'choose')->assertOk()->assertJsonPath('album.counts.chosen', 1);
        $this->assertFileExists("{$this->eventos}/nueva/media/album/{$name}");
        $this->get("/media/nueva/album/{$name}")->assertOk();
        $photos = collect($this->getJson('/api/public/events/nueva')->json('event.sections'))->firstWhere('type', 'guest-album')['photos'];
        $this->assertCount(1, $photos);
        $this->assertStringEndsWith("/media/nueva/album/{$name}", $photos[0]['photo']);
        $this->assertSame(5, collect($this->getJson('/api/public/events/nueva')->json('event.sections'))->firstWhere('type', 'guest-album')['days']);

        // Quitar la regresa a pendiente y la saca de lo público.
        $this->decide($panelToken, [$id], 'unchoose')->assertOk()->assertJsonPath('album.counts.pending', 1);
        $this->get("/media/nueva/album/{$name}")->assertNotFound();
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/album/{$name}");
        // Nada de otros archivos con "../" o nombres que no son de una foto.
        $this->get('/media/nueva/album/..%2Falbum.csv')->assertNotFound();
    }

    public function test_the_panel_downloads_the_chosen_photos_as_a_zip_through_the_last_day(): void
    {
        $this->upload()->assertCreated();
        $this->upload(self::TOKEN_B)->assertCreated();
        $token = $this->panelToken();
        $this->getJson('/api/admin/events/nueva/album.zip', ['Authorization' => "Bearer {$token}"])->assertNotFound();
        $ids = array_column($this->rows(), 'id');
        $this->decide($token, $ids, 'choose')->assertOk();

        $this->at(self::LAST_MOMENT);
        $token = $this->panelToken(); // la sesión del panel dura 12 h
        $response = $this->get('/api/admin/events/nueva/album.zip', ['Authorization' => "Bearer {$token}"])->assertOk();
        $this->assertSame('application/zip', $response->headers->get('Content-Type'));
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($response->baseResponse->getFile()->getPathname()));
        $this->assertSame(2, $zip->numFiles);
        $this->assertSame('001-familia-nueva.webp', $zip->getNameIndex(0));
        $zip->close();
        // Todavía se sube en el último día.
        $this->upload()->assertCreated();
    }

    public function test_the_day_after_the_window_the_event_answers_410_and_the_album_is_deleted_but_the_panel_stays(): void
    {
        $this->upload()->assertCreated();
        $this->upload(self::TOKEN_B)->assertCreated();
        $token = $this->panelToken();
        $this->decide($token, [$this->rows()[0]['id']], 'choose')->assertOk();
        $this->assertDirectoryExists("{$this->eventos}/nueva/media/album");

        $this->at(self::CLOSED);
        $message = 'Este evento ya terminó. ¡Gracias por acompañarnos!';
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertStatus(410)
            ->assertJsonPath('message', $message)
            ->assertJsonPath('ended', true)
            ->assertJsonPath('brand.theme', 'jardin-azul');
        $this->getJson('/api/public/events/nueva')->assertStatus(410)->assertJsonPath('message', $message);
        $this->postJson('/api/public/invitations/'.self::TOKEN_A.'/rsvp', ['attending' => true, 'guests' => []])->assertStatus(410);
        $this->upload()->assertStatus(410);

        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/album");
        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/media/album");
        $rows = $this->rows();
        $this->assertCount(2, $rows);
        $this->assertSame(['borrada', 'borrada'], array_column($rows, 'estado'));

        // El panel y los demás CSV se quedan.
        $token = $this->panelToken();
        $panel = $this->getJson('/api/admin/events/nueva', ['Authorization' => "Bearer {$token}"])->assertOk();
        $panel->assertJsonPath('album.state', 'closed')->assertJsonPath('album.photos', []);
        $panel->assertJsonPath('summary.invitations', 2);
        $this->assertFileExists("{$this->eventos}/nueva/invitaciones.csv");
        $this->get('/api/admin/events/nueva/album.zip', ['Authorization' => "Bearer {$token}"])->assertStatus(409);
        $this->decide($token, ['0123456789abcdef'], 'choose')->assertStatus(409);

        // Idempotente: otra petición no vuelve a anotar nada.
        $before = file_get_contents("{$this->eventos}/nueva/album.csv");
        $this->getJson('/api/public/events/nueva')->assertStatus(410);
        $this->assertSame($before, file_get_contents("{$this->eventos}/nueva/album.csv"));
    }

    public function test_the_artisan_command_closes_only_when_due_and_is_idempotent(): void
    {
        $this->upload()->assertCreated();
        $this->artisan('album:cerrar', ['slug' => 'nueva'])->expectsOutputToContain('Todavía no toca')->assertSuccessful();
        $this->assertDirectoryExists("{$this->eventos}/nueva/album");

        $this->at(self::CLOSED);
        $this->artisan('album:cerrar', ['slug' => 'nueva'])->expectsOutputToContain('Álbum borrado')->assertSuccessful();
        $this->artisan('album:cerrar', ['slug' => 'nueva'])->expectsOutputToContain('ya estaba borrado')->assertSuccessful();
        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/album");
        $this->artisan('album:cerrar', ['slug' => 'no-existe'])->assertFailed();
    }

    public function test_the_days_are_clamped_by_the_server_between_5_and_20(): void
    {
        $this->assertSame(5, AlbumService::clampDays(null));
        $this->assertSame(5, AlbumService::clampDays('2'));
        $this->assertSame(7, AlbumService::clampDays('7'));
        $this->assertSame(20, AlbumService::clampDays('99'));

        // Con 99 en el CSV, la sección dice 20 y cierra al terminar el día 20 (18-dic).
        $this->addAlbum(['album,,album_dias,99']);
        $section = collect($this->getJson('/api/public/events/nueva')->json('event.sections'))->firstWhere('type', 'guest-album');
        $this->assertSame(20, $section['days']);
        $this->at('2026-12-18 23:59:59 America/Mexico_City');
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertOk()->assertJsonPath('invitation.album.state', 'after');
        $this->at('2026-12-19 00:00:00 America/Mexico_City');
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertStatus(410);
    }

    public function test_deleting_an_invitation_removes_its_photos(): void
    {
        $this->upload()->assertCreated();
        $this->upload(self::TOKEN_B)->assertCreated();
        $token = $this->panelToken();
        $mine = $this->rows()[0];
        $this->decide($token, [$mine['id']], 'choose')->assertOk();

        $this->deleteJson('/api/admin/events/nueva/invitations/1', [], ['Authorization' => "Bearer {$token}"])->assertOk()
            ->assertJsonPath('album.counts.pending', 1)->assertJsonPath('album.counts.chosen', 0);
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/album/{$mine['archivo']}");
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/media/album/{$mine['archivo']}");
        $this->assertCount(1, $this->rows());
        $this->assertSame($mine['id'], $this->readCsv('nueva', AlbumService::DELETED)[0]['id']);
    }

    public function test_the_version_changes_when_a_photo_is_uploaded(): void
    {
        $token = $this->panelToken();
        $version = fn () => $this->getJson('/api/admin/events/nueva/version', ['Authorization' => "Bearer {$token}"])->json('version');
        $before = $version();
        $this->upload()->assertCreated();
        $this->assertNotSame($before, $version());
    }

    public function test_uploads_are_throttled_to_six_per_minute_per_ip_and_token(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->upload(file: UploadedFile::fake()->create('nota.txt', 1, 'text/plain'))->assertStatus(422);
        }
        $this->upload(file: UploadedFile::fake()->create('nota.txt', 1, 'text/plain'))->assertStatus(429);
        // Otro enlace no comparte el cupo.
        $this->upload(self::TOKEN_B)->assertCreated();
    }

    public function test_an_album_without_start_date_or_section_does_nothing(): void
    {
        $this->assertNull(app(AlbumService::class)->windowFor('prueba'));
        $this->upload('NoExisteToken')->assertNotFound();
    }

    public function test_the_window_math_around_midnight_and_dst(): void
    {
        $start = CarbonImmutable::parse('2026-11-28 17:00', 'America/Mexico_City');
        $at = fn (string $now, int $days = 5) => AlbumService::window($start, 'America/Mexico_City', $days, CarbonImmutable::parse($now, 'America/Mexico_City'))['state'];
        $this->assertSame('before', $at('2026-11-27 23:59:59'));
        $this->assertSame('event_day', $at('2026-11-28 00:00:00'));
        $this->assertSame('event_day', $at('2026-11-28 23:59:59'));
        $this->assertSame('after', $at('2026-11-29 00:00:00'));
        $this->assertSame('after', $at('2026-12-03 23:59:59'));
        $this->assertSame('closed', $at('2026-12-04 00:00:00'));
        $window = AlbumService::window($start, 'America/Mexico_City', 5, CarbonImmutable::parse('2026-11-28 10:00', 'America/Mexico_City'));
        $this->assertSame('2026-12-03', $window['last_day']);
        $this->assertSame('2026-12-04T00:00:00-06:00', $window['closes_at']);
    }

    public function test_peak_memory_of_a_12_megapixel_upload_stays_under_200_mb(): void
    {
        $image = imagecreatetruecolor(4000, 3000);
        for ($y = 0; $y < 3000; $y += 50) {
            imagefilledrectangle($image, 0, $y, 3999, $y + 49, imagecolorallocate($image, ($y / 12) % 255, 120, 255 - ($y / 12) % 255));
        }
        for ($i = 0; $i < 300; $i++) {
            imagefilledellipse($image, ($i * 97) % 4000, ($i * 53) % 3000, 150, 90, imagecolorallocate($image, ($i * 7) % 255, ($i * 13) % 255, ($i * 29) % 255));
        }
        $source = tempnam(sys_get_temp_dir(), 'foto').'.jpg';
        imagejpeg($image, $source, 85);
        unset($image);
        $this->assertLessThan(8 * 1024 * 1024, filesize($source));

        $invitation = app(InvitationService::class)->find(self::TOKEN_A);
        $album = app(AlbumService::class);
        memory_reset_peak_usage();
        $album->upload($invitation, new UploadedFile($source, 'doce.jpg', 'image/jpeg', null, true));
        $peak = memory_get_peak_usage(true);
        @unlink($source);

        fwrite(STDERR, sprintf("\n[album] pico de memoria de una subida de 12 MP: %.1f MB\n", $peak / 1048576));
        $this->assertLessThan(200 * 1024 * 1024, $peak);
        $this->assertSame(['1600', '1200'], [$this->rows()[0]['ancho'], $this->rows()[0]['alto']]);
    }

    public function test_a_demo_shows_sample_photos_and_never_writes_or_closes(): void
    {
        $this->appendLine('nueva', 'ajustes.csv', 'demo,SI');
        $this->addAlbum(['album,1,foto,salon.webp', 'album,2,foto,salon.webp']);
        // Mucho después del evento: una muestra no cierra.
        $this->at('2027-06-01 12:00:00 America/Mexico_City');

        $event = $this->getJson('/api/public/events/nueva')->assertOk();
        $section = collect($event->json('event.sections'))->firstWhere('type', 'guest-album');
        $this->assertCount(2, $section['photos']);
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertOk()
            ->assertJsonPath('invitation.album.state', 'after')
            ->assertJsonPath('invitation.album.used', 0);

        $this->upload()->assertCreated()->assertJsonPath('album.used', 0);
        $this->assertSame([], $this->rows());
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/album.csv");
        $this->assertDirectoryDoesNotExist("{$this->eventos}/nueva/album");
        $this->assertFileExists("{$this->eventos}/nueva/media/salon.webp");
    }
}
