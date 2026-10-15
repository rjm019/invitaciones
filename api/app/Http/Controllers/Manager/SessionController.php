<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Manager\ManagerAuth;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/** Entrada al gestor: cada persona con su usuario y su clave; la primera cuenta, con la clave maestra. */
class SessionController extends Controller
{
    private const DISABLED = 'El gestor no está activado: falta la clave GESTOR_CLAVE (16 caracteres o más).';

    /** GET /api/manager/session → { enabled, setup } (setup: falta crear la primera cuenta). */
    public function status(ManagerAuth $auth): JsonResponse
    {
        return response()->json(['enabled' => $auth->enabled(), 'setup' => $auth->needsSetup()]);
    }

    /**
     * POST /api/manager/session — { username, password } → { token, expires_at, user }
     * 403 gestor apagado o cuenta sin acceso · 422 usuario o clave incorrectos · 429 demasiados intentos.
     */
    public function store(Request $request, ManagerAuth $auth): JsonResponse
    {
        if (! $auth->enabled()) {
            return response()->json(['message' => self::DISABLED], 403);
        }
        $data = $request->validate([
            'username' => ['required', 'string', 'max:60'],
            'password' => ['required', 'string', 'max:200'],
        ], [
            'username.*' => 'Escribe tu usuario.',
            'password.*' => 'Escribe tu clave.',
        ]);

        try {
            $session = $auth->attempt($data['username'], $data['password']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
        if ($session === null) {
            return response()->json([
                'message' => 'El usuario o la clave no son correctos.',
                'errors' => ['password' => ['El usuario o la clave no son correctos.']],
            ], 422);
        }

        return response()->json($session);
    }

    /**
     * POST /api/manager/setup — { master_password, name, username, password } → 201 { token, expires_at, user }
     * Solo mientras no hay ninguna cuenta: la primera administra. 409 si ya hay cuentas.
     */
    public function setup(Request $request, ManagerAuth $auth): JsonResponse
    {
        if (! $auth->enabled()) {
            return response()->json(['message' => self::DISABLED], 403);
        }
        $request->merge(['username' => ManagerUsers::normalize((string) $request->input('username'))]);
        $data = $request->validate([
            'master_password' => ['required', 'string', 'max:200'],
            'name' => ['required', 'string', 'max:60'],
            'username' => ['required', 'string', 'max:60', 'regex:'.ManagerUsers::USERNAME],
            'password' => ['required', 'string', 'min:'.ManagerUsers::MIN_PASSWORD, 'max:128'],
        ], self::messages() + ['master_password.*' => 'Escribe la clave maestra (GESTOR_CLAVE).']);

        if (! $auth->needsSetup()) {
            return response()->json(['message' => 'Ya hay cuentas en el gestor: entra con la tuya.'], 409);
        }
        try {
            $session = $auth->setup($data['master_password'], $data['username'], $data['name'], $data['password']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => ['password' => [$e->getMessage()]]], 422);
        }
        if ($session === null) {
            return response()->json([
                'message' => 'La clave maestra no es correcta.',
                'errors' => ['master_password' => ['La clave maestra no es correcta.']],
            ], 422);
        }

        return response()->json($session, 201);
    }

    /** GET /api/manager/me → { user } */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => ManagerUsers::present($request->attributes->get(ManagerAuth::ATTRIBUTE))]);
    }

    /**
     * PUT /api/manager/me/password — { current_password, password } → { token, expires_at, user }
     * La sesión anterior deja de servir (en todas las ventanas): se devuelve una nueva.
     */
    public function password(Request $request, ManagerAuth $auth, ManagerUsers $users): JsonResponse
    {
        $user = $request->attributes->get(ManagerAuth::ATTRIBUTE);
        $data = $request->validate([
            'current_password' => ['required', 'string', 'max:200'],
            'password' => ['required', 'string', 'min:'.ManagerUsers::MIN_PASSWORD, 'max:128'],
        ], self::messages() + ['current_password.*' => 'Escribe tu clave actual.']);

        if (! Hash::check($data['current_password'], $user['clave'])) {
            return response()->json([
                'message' => 'Tu clave actual no es correcta.',
                'errors' => ['current_password' => ['Tu clave actual no es correcta.']],
            ], 422);
        }
        if ($data['password'] === $data['current_password']) {
            return response()->json([
                'message' => 'La clave nueva debe ser distinta de la actual.',
                'errors' => ['password' => ['La clave nueva debe ser distinta de la actual.']],
            ], 422);
        }
        try {
            $updated = $users->update($user['usuario'], ['password' => $data['password']], CarbonImmutable::now());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => ['password' => [$e->getMessage()]]], 422);
        }

        return response()->json($auth->issue($updated));
    }

    /** @return array<string, string> */
    private static function messages(): array
    {
        return [
            'name.*' => 'Escribe tu nombre (hasta 60 caracteres).',
            'username.regex' => 'El usuario lleva de 3 a 60 minúsculas, números o . _ @ - (por ejemplo ana o ana@correo.com).',
            'username.*' => 'Escribe un usuario.',
            'password.min' => 'La clave lleva al menos '.ManagerUsers::MIN_PASSWORD.' caracteres.',
            'password.*' => 'Escribe una clave de '.ManagerUsers::MIN_PASSWORD.' a 128 caracteres.',
        ];
    }
}
