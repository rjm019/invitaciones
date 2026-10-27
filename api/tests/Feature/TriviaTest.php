<?php

namespace Tests\Feature;

use App\Services\Invitations\TriviaStore;
use App\Services\Layout\EventRepository;
use Carbon\CarbonImmutable;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CopiesEventFixtures;
use Tests\TestCase;

class TriviaTest extends TestCase
{
    use CopiesEventFixtures;

    private const TOKEN_A = 'NuevaToken01';

    private const TOKEN_B = 'NuevaToken02';

    protected function setUp(): void
    {
        parent::setUp();
        $this->copyEventFixtures();
        CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
        $this->writeInvitations('nueva', [1 => [self::TOKEN_A, 2, 'Familia Nueva'], 2 => [self::TOKEN_B, 3]]);
        $this->addTrivia();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /** @param  list<string>  $extra  renglones de invitacion.csv de más (por ejemplo "cierra") */
    private function addTrivia(array $extra = []): void
    {
        $lines = [
            'trivia,,visible,SI',
            'trivia,,titulo,Trivia de Nue',
            ...$extra,
            'trivia,1,pregunta,¿Color favorito?',
            'trivia,1,opcion_1,Rojo',
            'trivia,1,opcion_2,Azul',
            'trivia,1,opcion_3,Verde',
            'trivia,1,correcta,2',
            'trivia,2,pregunta,¿Mascota?',
            'trivia,2,opcion_1,Perro',
            'trivia,2,opcion_2,Gato',
            'trivia,2,correcta,1',
        ];
        foreach ($lines as $line) {
            $this->appendLine('nueva', 'invitacion.csv', $line);
        }
    }

    private function start(string $token = self::TOKEN_A): TestResponse
    {
        return $this->postJson("/api/public/invitations/{$token}/trivia/start");
    }

    /** @param  list<int>  $answers */
    private function answer(string $token, string $name, array $answers): TestResponse
    {
        return $this->postJson("/api/public/invitations/{$token}/trivia", ['name' => $name, 'answers' => $answers]);
    }

    private function panelToken(): string
    {
        return $this->postJson('/api/admin/events/nueva/session', ['password' => 'clave-de-prueba-nueva'])->assertOk()->json('token');
    }

    public function test_the_correct_answer_never_appears_in_any_public_json_or_page(): void
    {
        $event = $this->getJson('/api/public/events/nueva')->assertOk();
        $section = collect($event->json('event.sections'))->firstWhere('type', 'trivia');
        $this->assertSame(
            [['text' => '¿Color favorito?', 'options' => ['Rojo', 'Azul', 'Verde']], ['text' => '¿Mascota?', 'options' => ['Perro', 'Gato']]],
            $section['questions'],
        );
        $this->assertSame('2026-11-28T17:00:00-06:00', $section['closes_at']);

        $personal = $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertOk();
        foreach ([$event->getContent(), $personal->getContent()] as $json) {
            $this->assertStringNotContainsString('correcta', $json);
            $this->assertStringNotContainsString('correct"', $json);
        }
        $personal->assertJsonPath('invitation.trivia', ['open' => true, 'closed_message' => null, 'result' => null]);

        $spa = storage_path('framework/testing/app-'.bin2hex(random_bytes(4)).'.html');
        file_put_contents($spa, '<!DOCTYPE html><html><head><title>Invitación</title></head><body><div id="app"></div></body></html>');
        config(['invitaciones.spa_path' => $spa]);
        $this->beforeApplicationDestroyed(fn () => @unlink($spa));
        foreach (['/e/nueva', '/i/'.self::TOKEN_A] as $page) {
            $html = $this->get($page)->assertOk()->getContent();
            $this->assertStringContainsString('¿Color favorito?', $html);
            $this->assertStringNotContainsString('correcta', $html);
            $this->assertStringNotContainsString('"correct"', $html);
        }
    }

    public function test_answers_are_graded_by_the_server_and_the_seconds_are_measured_there(): void
    {
        $this->start()->assertOk()->assertJsonPath('total', 2);
        CarbonImmutable::setTestNow('2026-10-13 12:00:42 America/Mexico_City');

        $this->answer(self::TOKEN_A, '  Ana   Prueba ', [2, 2])
            ->assertOk()
            ->assertJsonPath('result', ['name' => 'Ana Prueba', 'correct' => 1, 'total' => 2, 'seconds' => 42])
            ->assertJsonPath('invitation.trivia.open', false)
            ->assertJsonPath('invitation.trivia.result.correct', 1);

        $this->assertSame(
            [['invitacion' => '1', 'para' => 'Familia Nueva', 'nombre' => 'Ana Prueba', 'respuestas' => '2;2', 'aciertos' => '1', 'segundos' => '42', 'fecha' => '2026-10-13 12:00:42']],
            $this->readCsv('nueva', TriviaStore::FILE),
        );
        $raw = file_get_contents("{$this->eventos}/nueva/".TriviaStore::FILE);
        $this->assertStringStartsWith("\xEF\xBB\xBFinvitacion,para,nombre,respuestas,aciertos,segundos,fecha\r\n", $raw);

        // Al volver a abrir el enlace, el resultado ya está; la otra invitación sigue abierta.
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)->assertJsonPath('invitation.trivia.result.correct', 1);
        $this->getJson('/api/public/invitations/'.self::TOKEN_B)->assertJsonPath('invitation.trivia.result', null);
    }

    public function test_opening_again_does_not_restart_the_clock(): void
    {
        $this->start()->assertOk();
        CarbonImmutable::setTestNow('2026-10-13 12:00:30 America/Mexico_City');
        $this->start()->assertOk();
        CarbonImmutable::setTestNow('2026-10-13 12:01:00 America/Mexico_City');

        $this->answer(self::TOKEN_A, 'Ana', [2, 1])->assertOk()->assertJsonPath('result.seconds', 60)->assertJsonPath('result.correct', 2);
    }

    public function test_a_second_answer_from_the_same_link_is_rejected_and_the_first_stays(): void
    {
        $this->answer(self::TOKEN_A, 'Ana', [2, 1])->assertOk();
        $this->answer(self::TOKEN_A, 'Luis', [1, 2])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Ya respondiste la trivia. ¡Gracias por participar!');
        $this->start()->assertStatus(409);

        $rows = $this->readCsv('nueva', TriviaStore::FILE);
        $this->assertCount(1, $rows);
        $this->assertSame('Ana', $rows[0]['nombre']);
    }

    public function test_after_it_closes_nothing_is_accepted(): void
    {
        CarbonImmutable::setTestNow('2026-11-28 17:00:01 America/Mexico_City');

        $this->start()->assertStatus(409)->assertJsonPath('message', 'La trivia ya cerró.');
        $this->answer(self::TOKEN_A, 'Ana', [2, 1])->assertStatus(409)->assertJsonPath('message', 'La trivia ya cerró.');
        $this->assertSame([], $this->readCsv('nueva', TriviaStore::FILE));
        $this->getJson('/api/public/invitations/'.self::TOKEN_A)
            ->assertJsonPath('invitation.trivia.open', false)
            ->assertJsonPath('invitation.trivia.closed_message', 'La trivia ya cerró.');
    }

    public function test_cierra_overrides_the_event_start(): void
    {
        $this->appendLine('nueva', 'invitacion.csv', 'trivia,,cierra,2026-10-12');

        $this->answer(self::TOKEN_A, 'Ana', [2, 1])->assertStatus(409);

        $this->appendLine('nueva', 'invitacion.csv', 'trivia,,cierra,2026-10-13');
        app(EventRepository::class)->forget('nueva');
        $this->answer(self::TOKEN_A, 'Ana', [2, 1])->assertOk();
    }

    public function test_the_data_is_validated(): void
    {
        $this->answer(self::TOKEN_A, '', [2, 1])
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Escribe tu nombre.');
        $this->answer(self::TOKEN_A, 'Ana', [2])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Responde todas las preguntas.');
        $this->answer(self::TOKEN_A, 'Ana', [2, 3])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Elige una de las opciones de cada pregunta.');
        $this->answer(self::TOKEN_A, str_repeat('a', TriviaStore::MAX_NAME + 1), [2, 1])
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Tu nombre es muy largo (máximo 80 letras).');

        $this->answer('NoExiste0000', 'Ana', [2, 1])->assertNotFound();
        $this->start('NoExiste0000')->assertNotFound();
        $this->assertSame([], $this->readCsv('nueva', TriviaStore::FILE));
    }

    public function test_a_demo_grades_but_writes_nothing(): void
    {
        $this->appendLine('nueva', 'ajustes.csv', 'demo,SI');

        $this->start()->assertOk();
        $this->answer(self::TOKEN_A, 'Ana', [2, 1])
            ->assertOk()
            ->assertJsonPath('result.correct', 2)
            ->assertJsonPath('invitation.trivia.result.correct', 2);

        $this->assertFileDoesNotExist("{$this->eventos}/nueva/".TriviaStore::FILE);
        $this->assertFileDoesNotExist("{$this->eventos}/nueva/".TriviaStore::STARTS);
        // Se puede volver a probar.
        $this->answer(self::TOKEN_A, 'Ana', [1, 1])->assertOk()->assertJsonPath('result.correct', 1);
    }

    public function test_a_question_with_problems_is_reported_by_the_builder(): void
    {
        $this->appendLine('nueva', 'invitacion.csv', 'trivia,3,pregunta,¿Sin respuesta?');
        $this->appendLine('nueva', 'invitacion.csv', 'trivia,3,opcion_1,Uno');
        $this->appendLine('nueva', 'invitacion.csv', 'trivia,3,correcta,5');

        $errors = $this->getJson('/api/public/events/nueva')->assertStatus(503)->json('errors');
        $this->assertContains('trivia, elemento 3 → opcion_2: cada pregunta necesita al menos 2 opciones', $errors);
        $this->assertContains('trivia, elemento 3 → correcta: elige cuál opción es la correcta (el número de la opción)', $errors);
    }

    public function test_answering_is_throttled(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->answer(self::TOKEN_B, '', [])->assertStatus(422);
        }
        $this->answer(self::TOKEN_B, 'Ana', [2, 1])->assertStatus(429);
    }

    public function test_the_panel_ranks_by_correct_answers_then_by_time_and_downloads_a_csv(): void
    {
        $this->writeInvitations('nueva', [1 => [self::TOKEN_A, 2, 'Familia Nueva'], 2 => [self::TOKEN_B, 3], 3 => ['NuevaToken03', 1, '=Tía']]);
        foreach ([[self::TOKEN_A, 'Ana', [2, 1], 50], [self::TOKEN_B, 'Beto', [2, 1], 20], ['NuevaToken03', '=Carla', [1, 1], 5]] as [$token, $name, $answers, $secs]) {
            CarbonImmutable::setTestNow('2026-10-13 12:00:00 America/Mexico_City');
            $this->start($token)->assertOk();
            CarbonImmutable::setTestNow(CarbonImmutable::now()->addSeconds($secs));
            $this->answer($token, $name, $answers)->assertOk();
        }

        $headers = ['Authorization' => 'Bearer '.$this->panelToken()];
        $trivia = $this->getJson('/api/admin/events/nueva', $headers)->assertOk()->json('trivia');
        $this->assertSame(2, $trivia['total']);
        $this->assertSame('2026-11-28T17:00:00-06:00', $trivia['closes_at']);
        $this->assertSame(['Beto', 'Ana', '=Carla'], array_column($trivia['ranking'], 'name'));
        $this->assertSame([1, 2, 3], array_column($trivia['ranking'], 'rank'));
        $this->assertSame([20, 50, 5], array_column($trivia['ranking'], 'seconds'));
        $this->assertSame('Familia Nueva', $trivia['ranking'][1]['label']);

        $csv = $this->get('/api/admin/events/nueva/trivia.csv', $headers)->assertOk();
        $this->assertStringContainsString('attachment', $csv->headers->get('Content-Disposition'));
        $body = $csv->getContent();
        $this->assertStringStartsWith("\xEF\xBB\xBFlugar,nombre,invitacion,aciertos,total,segundos,fecha\r\n", $body);
        $this->assertStringContainsString("1,Beto,#2,2,2,20,\"2026-10-13 12:00:20\"\r\n", $body);
        $this->assertStringContainsString("3,'=Carla,'=Tía,1,2,5,", $body);

        $this->get('/api/admin/events/nueva/trivia.csv')->assertStatus(401);
    }

    public function test_the_panel_has_no_trivia_when_the_event_has_none(): void
    {
        $this->copyEventFixtures();
        config(['invitaciones.eventos_path' => $this->eventos]);
        $headers = ['Authorization' => 'Bearer '.$this->panelToken()];
        $this->getJson('/api/admin/events/nueva', $headers)->assertJsonPath('trivia', null);
        $this->get('/api/admin/events/nueva/trivia.csv', $headers)->assertStatus(404);
    }

    public function test_deleting_an_invitation_takes_its_trivia_with_it(): void
    {
        $this->answer(self::TOKEN_B, 'Beto', [2, 1])->assertOk();
        $headers = ['Authorization' => 'Bearer '.$this->panelToken()];

        $this->deleteJson('/api/admin/events/nueva/invitations/2', [], $headers)->assertOk();

        $this->assertSame([], $this->readCsv('nueva', TriviaStore::FILE));
        $this->assertSame('Beto', $this->readCsv('nueva', TriviaStore::DELETED)[0]['nombre']);
    }
}
