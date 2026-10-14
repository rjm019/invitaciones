<?php

namespace Tests\Feature\Manager;

use App\Services\Design\DesignFile;
use Illuminate\Http\UploadedFile;
use Tests\Concerns\ActsAsManager;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;
use ZipArchive;

class TransferTest extends TestCase
{
    use ActsAsManager;
    use CopiesEventFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
    }

    private function newEvent(string $slug): void
    {
        $this->asManager()->postJson('/api/manager/events', ['slug' => $slug, 'source' => 'blank'])->assertCreated();
    }

    private function import(string $slug, string $path, string $name)
    {
        return $this->post("/api/manager/events/{$slug}/import", ['file' => new UploadedFile($path, $name, null, null, true)], ['Accept' => 'application/json']);
    }

    public function test_the_csv_never_carries_the_panel_key(): void
    {
        file_put_contents("{$this->eventos}/nueva/invitacion.csv", file_get_contents("{$this->eventos}/nueva/invitacion.csv")."evento,,clave_panel,secreta-123456\r\n");

        $csv = $this->asManager()->get('/api/manager/events/nueva/export?format=csv')->assertOk()->streamedContent();

        $this->assertStringContainsString('evento,,festejada,"Festejada Nueva"', $csv);
        $this->assertStringNotContainsString('secreta-123456', $csv);
    }

    public function test_the_package_takes_apart_and_puts_back_together_the_same_invitation(): void
    {
        $zip = $this->asManager()->get('/api/manager/events/nueva/export?format=zip')->assertOk()->streamedContent();
        $path = tempnam(sys_get_temp_dir(), 'zip');
        file_put_contents($path, $zip);
        $this->newEvent('armada');

        $this->import('armada', $path, 'invitacion-nueva.zip')->assertOk()->assertJsonPath('source', 'draft');

        $this->assertFileEquals("{$this->eventos}/nueva/media/salon.webp", "{$this->eventos}/armada/media/salon.webp");
        $file = app(DesignFile::class);
        $this->assertSame(
            $file->toCsv($file->read("{$this->eventos}/nueva/invitacion.csv")[0]),
            $file->toCsv($file->read("{$this->eventos}/armada/borrador/invitacion.csv")[0]),
        );
    }

    public function test_the_excel_round_trip_lands_in_the_draft(): void
    {
        $xlsx = $this->asManager()->get('/api/manager/events/nueva/export?format=xlsx')->assertOk()->streamedContent();
        $path = tempnam(sys_get_temp_dir(), 'xls').'.xlsx';
        file_put_contents($path, $xlsx);

        $this->import('nueva', $path, 'invitacion.xlsx')->assertOk()->assertJsonPath('design.event.festejada', 'Festejada Nueva');
    }

    public function test_an_old_format_excel_is_converted(): void
    {
        $this->artisan('layout:xlsx', ['slug' => 'prueba'])->assertSuccessful();
        $this->newEvent('desde-excel');

        $imported = $this->import('desde-excel', "{$this->eventos}/prueba/layout.xlsx", 'layout.xlsx')->assertOk()->json();

        $this->assertSame('Festejada Prueba', $imported['design']['event']['festejada']);
        $this->assertStringContainsString('formato anterior', $imported['import']['warnings'][0]);
    }

    public function test_a_package_with_something_else_is_rejected(): void
    {
        $this->enableManager();
        foreach (['../../evil.php' => '<?php echo 1;', 'media/dibujo.svg' => '<svg/>', 'media/sub/x.webp' => 'x'] as $entry => $content) {
            $path = tempnam(sys_get_temp_dir(), 'zip');
            $zip = new ZipArchive;
            $zip->open($path, ZipArchive::OVERWRITE);
            $zip->addFromString('invitacion.csv', "seccion,elemento,campo,valor\r\nevento,,tema,jardin-azul\r\n");
            $zip->addFromString($entry, $content);
            $zip->close();

            $this->asManager()->post('/api/manager/events/nueva/import', ['file' => new UploadedFile($path, 'paquete.zip', null, null, true)], ['Accept' => 'application/json'])
                ->assertStatus(422);
        }
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/borrador/invitacion.csv");
        $this->assertFileDoesNotExist(dirname($this->eventos).'/evil.php');
    }

    public function test_a_media_file_with_the_same_name_but_other_content_is_renamed(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'zip');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('invitacion.csv', "seccion,elemento,campo,valor\r\nevento,,tema,jardin-azul\r\nevento,,inicia,2026-11-28 17:00\r\nevento,,salon_foto,salon.webp\r\n");
        $zip->addFromString('media/salon.webp', 'otra imagen');
        $zip->close();

        $imported = $this->asManager()->post('/api/manager/events/nueva/import', ['file' => new UploadedFile($path, 'paquete.zip', null, null, true)], ['Accept' => 'application/json'])
            ->assertOk()->json();

        $renamed = $imported['design']['event']['salon_foto'];
        $this->assertMatchesRegularExpression('/^salon-[0-9a-f]{4}\.webp$/', $renamed);
        $this->assertSame('otra imagen', file_get_contents("{$this->eventos}/nueva/media/{$renamed}"));
        $this->assertNotSame('otra imagen', file_get_contents("{$this->eventos}/nueva/media/salon.webp"));
    }

    public function test_the_same_from_the_terminal(): void
    {
        $out = sys_get_temp_dir().'/inv-'.bin2hex(random_bytes(3)).'.zip';
        $this->artisan('invitacion:exportar', ['slug' => 'nueva', '--formato' => 'zip', '--salida' => $out])->assertSuccessful();
        $this->newEvent('por-terminal');

        $this->artisan('invitacion:importar', ['slug' => 'por-terminal', 'archivo' => $out, '--publicar' => true])
            ->expectsOutputToContain('por-terminal: publicada.')
            ->assertSuccessful();

        $this->assertFileEquals("{$this->eventos}/nueva/media/salon.webp", "{$this->eventos}/por-terminal/media/salon.webp");
        $this->artisan('invitacion:validar', ['slug' => 'por-terminal'])->expectsOutputToContain('está lista')->assertSuccessful();
    }
}
