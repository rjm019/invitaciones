<?php

namespace Tests\Unit\Csv;

use App\Services\Csv\CsvFile;
use PHPUnit\Framework\TestCase;

class CsvFileTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir().'/csvfile-'.bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        foreach (array_diff(scandir($this->dir) ?: [], ['.', '..']) as $name) {
            unlink($this->dir.'/'.$name);
        }
        rmdir($this->dir);
        parent::tearDown();
    }

    public function test_a_log_that_gains_a_column_keeps_its_old_rows(): void
    {
        $csv = new CsvFile;
        $path = $this->dir.'/bitacora.csv';
        $csv->append($path, ['fecha', 'origen'], ['fecha' => '2026-10-01 10:00:00', 'origen' => 'borrador']);

        $csv->append($path, ['fecha', 'origen', 'usuario'], ['fecha' => '2026-10-02 11:00:00', 'origen' => 'borrador', 'usuario' => 'ana']);
        // Un renglón con las columnas en otro orden cae en su lugar.
        $csv->append($path, ['usuario', 'fecha', 'origen'], ['usuario' => 'beto', 'fecha' => '2026-10-03 12:00:00', 'origen' => 'nueva']);

        $this->assertSame([
            ['fecha' => '2026-10-01 10:00:00', 'origen' => 'borrador', 'usuario' => ''],
            ['fecha' => '2026-10-02 11:00:00', 'origen' => 'borrador', 'usuario' => 'ana'],
            ['fecha' => '2026-10-03 12:00:00', 'origen' => 'nueva', 'usuario' => 'beto'],
        ], $csv->read($path));
        $raw = (string) file_get_contents($path);
        $this->assertStringStartsWith("\xEF\xBB\xBFfecha,origen,usuario\r\n", $raw);
        $this->assertSame(1, substr_count($raw, 'fecha,origen'));
    }
}
