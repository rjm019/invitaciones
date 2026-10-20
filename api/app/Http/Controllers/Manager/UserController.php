<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Manager\ManagerAuth;
use App\Services\Manager\ManagerUsers;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Las personas del gestor (solo quien administra): la lista, agregar con una clave temporal,
 * cambiar nombre o rol, darle otra clave (generada o escrita por quien administra) y quitar
 * o devolver el acceso. La clave se muestra una sola vez; si es temporal, la persona la
 * cambia al entrar.
 */
class UserController extends Controller
{
    public function __construct(private readonly ManagerUsers $users) {}

    /** GET /api/manager/users → { users } */
    public function index(): JsonResponse
    {
        $users = array_map(ManagerUsers::present(...), $this->users->all());
        usort($users, fn ($a, $b) => [! $a['active'], $a['name']] <=> [! $b['active'], $b['name']]);

        return response()->json(['users' => $users]);
    }

    /** POST /api/manager/users — { name, username, role } → 201 { user, password } · 409 si el usuario ya existe. */
    public function store(Request $request): JsonResponse
    {
        $request->merge(['username' => ManagerUsers::normalize((string) $request->input('username'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'username' => ['required', 'string', 'max:60', 'regex:'.ManagerUsers::USERNAME],
            'role' => ['required', Rule::in(ManagerUsers::ROLES)],
        ], [
            'name.*' => 'Escribe el nombre de la persona (hasta 60 caracteres).',
            'username.regex' => 'El usuario lleva de 3 a 60 minúsculas, números o . _ @ - (por ejemplo ana o ana@correo.com).',
            'username.*' => 'Escribe su usuario.',
            'role.*' => 'Elige si administra o solo edita.',
        ]);
        if ($this->users->find($data['username']) !== null) {
            return response()->json([
                'message' => 'Ya hay una persona con ese usuario.',
                'errors' => ['username' => ['Ya hay una persona con ese usuario.']],
            ], 409);
        }

        $password = ManagerUsers::temporaryPassword();
        try {
            $user = $this->users->create($data['username'], $data['name'], $data['role'], $password, true, CarbonImmutable::now());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['user' => ManagerUsers::present($user), 'password' => $password], 201);
    }

    /**
     * PUT /api/manager/users/{username} — { name?, role?, active?, reset_password?, password?, temporary? }
     * → { user, password? } (password solo si su clave cambió: la temporal que se generó o la
     * que escribió quien administra). Con password, temporary (por omisión true) le pide
     * cambiarla al entrar. Nadie se quita a sí mismo el acceso ni el rol, y siempre queda
     * alguien que administre.
     */
    public function update(Request $request, string $username): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:60'],
            'role' => ['sometimes', Rule::in(ManagerUsers::ROLES)],
            'active' => ['sometimes', 'boolean'],
            'reset_password' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'string', 'min:'.ManagerUsers::MIN_PASSWORD, 'max:128'],
            'temporary' => ['sometimes', 'boolean'],
        ], [
            'name.*' => 'Escribe el nombre de la persona (hasta 60 caracteres).',
            'role.*' => 'Elige si administra o solo edita.',
            'password.*' => 'La clave lleva de '.ManagerUsers::MIN_PASSWORD.' a 128 caracteres, sin espacios.',
            'temporary.*' => 'Elige si tendrá que cambiarla al entrar.',
        ]);
        if ($this->users->find($username) === null) {
            return response()->json(['message' => 'No existe esa persona.'], 404);
        }
        $self = ManagerAuth::actor($request)['usuario'] === ManagerUsers::normalize($username);
        if ($self && (($data['active'] ?? true) === false || (isset($data['role']) && $data['role'] !== 'admin'))) {
            return response()->json(['message' => 'No puedes quitarte el acceso ni dejar de administrar tú; pídeselo a otra persona que administre.'], 422);
        }
        if ($self && (($data['reset_password'] ?? false) || array_key_exists('password', $data))) {
            return response()->json(['message' => 'Para cambiar tu clave usa "Cambiar mi clave".'], 422);
        }

        $changes = array_intersect_key($data, array_flip(['name', 'role', 'active']));
        $password = null;
        if (array_key_exists('password', $data)) {
            $password = $data['password'];
            $changes += ['password' => $password, 'temporary' => $data['temporary'] ?? true];
        } elseif ($data['reset_password'] ?? false) {
            $password = ManagerUsers::temporaryPassword();
            $changes += ['password' => $password, 'temporary' => true];
        }
        try {
            $user = $this->users->update($username, $changes, CarbonImmutable::now());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(array_filter(['user' => ManagerUsers::present($user), 'password' => $password]));
    }
}
