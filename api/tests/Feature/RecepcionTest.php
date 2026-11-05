<?php

namespace Tests\Feature;

use Tests\TestCase;

class RecepcionTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir().'/recepcion-'.bin2hex(random_bytes(4));
        config(['invitaciones.eventos_path' => $this->dir, 'invitaciones.recepcion_clave' => 'secreta']);
    }

    protected function tearDown(): void
    {
        foreach (array_diff(@scandir($this->dir.'/_recepcion') ?: [], ['.', '..']) as $f) {
            unlink($this->dir.'/_recepcion/'.$f);
        }
        @rmdir($this->dir.'/_recepcion');
        @rmdir($this->dir);
        parent::tearDown();
    }

    private function lista(): array
    {
        return [
            'categorias' => [['id' => 'adulto', 'etiqueta' => 'Adultos']],
            'invitados' => [
                ['id' => 1, 'mesa' => 1, 'nombre' => 'Ana', 'categoria' => 'adulto'],
                ['id' => 2, 'mesa' => 1, 'nombre' => 'Luis', 'categoria' => 'adulto'],
            ],
        ];
    }

    public function test_empty_state_is_public(): void
    {
        $this->getJson('/api/public/recepcion')->assertOk()->assertJson(['rev' => 0, 'invitados' => []]);
    }

    public function test_loading_the_list_needs_the_key(): void
    {
        $this->putJson('/api/public/recepcion/lista', $this->lista())->assertStatus(401);
        $this->putJson('/api/public/recepcion/lista', $this->lista(), ['X-Recepcion-Key' => 'mala'])->assertStatus(401);
        $this->getJson('/api/public/recepcion')->assertJson(['invitados' => []]);
    }

    public function test_without_configured_key_nobody_can_load(): void
    {
        config(['invitaciones.recepcion_clave' => '']);
        $this->putJson('/api/public/recepcion/lista', $this->lista(), ['X-Recepcion-Key' => ''])->assertStatus(503);
    }

    public function test_session_check(): void
    {
        $this->postJson('/api/public/recepcion/sesion', [], ['X-Recepcion-Key' => 'secreta'])->assertOk();
        $this->postJson('/api/public/recepcion/sesion', [], ['X-Recepcion-Key' => 'x'])->assertStatus(401);
    }

    public function test_admin_loads_and_anyone_reads_and_marks_arrivals(): void
    {
        $this->putJson('/api/public/recepcion/lista', $this->lista(), ['X-Recepcion-Key' => 'secreta'])
            ->assertOk()->assertJson(['rev' => 1]);

        $this->getJson('/api/public/recepcion')->assertJsonCount(2, 'invitados');

        $this->postJson('/api/public/recepcion/cambios', [
            'invitados' => [['id' => 2, 'mesa' => 1, 'nombre' => 'Luis', 'categoria' => 'adulto', 'llego' => true, 'hora' => '20:15']],
        ])->assertOk()->assertJson(['rev' => 2]);

        $state = $this->getJson('/api/public/recepcion')->json();
        $this->assertTrue($state['invitados'][1]['llego']);
        $this->assertFalse($state['invitados'][0]['llego']);
        $this->assertSame('Adultos', $state['categorias'][0]['etiqueta']);
    }

    public function test_polling_with_current_rev_returns_unchanged(): void
    {
        $this->putJson('/api/public/recepcion/lista', $this->lista(), ['X-Recepcion-Key' => 'secreta']);
        $this->getJson('/api/public/recepcion?rev=1')->assertExactJson(['rev' => 1, 'igual' => true]);
        $this->getJson('/api/public/recepcion?rev=0')->assertJsonCount(2, 'invitados');
    }

    public function test_changes_are_validated(): void
    {
        $this->postJson('/api/public/recepcion/cambios', ['invitados' => [['nombre' => 'sin id']]])->assertStatus(422);
    }
}
