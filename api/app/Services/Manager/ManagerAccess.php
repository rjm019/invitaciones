<?php

namespace App\Services\Manager;

use App\Services\Layout\EventRepository;

/**
 * Quién ve qué en el gestor: quien administra ve todas las invitaciones; quien edita, solo
 * las que creó o las que le asignaron (ajustes.csv → personas_gestor: "ana, beto"). Las
 * plantillas son de todos: cualquiera las ve, las usa y las edita.
 */
final class ManagerAccess
{
    /** En ajustes.csv del evento: los usuarios que lo ven en el gestor, separados por coma. */
    public const SETTING = 'personas_gestor';

    public function __construct(private readonly EventRepository $events) {}

    /** @param  array<string, string>  $user  la persona (un renglón de usuarios.csv) */
    public function can(array $user, string $slug): bool
    {
        return ($user['rol'] ?? '') === 'admin'
            || $this->events->isTemplate($slug)
            || in_array($user['usuario'] ?? '', $this->people($slug), true);
    }

    /** @return list<string> los usuarios asignados al evento */
    public function people(string $slug): array
    {
        return self::parse($this->events->settings($slug)[self::SETTING] ?? '');
    }

    /** @return list<string> */
    public static function parse(string $value): array
    {
        $out = [];
        foreach (preg_split('/[\s,;]+/', mb_strtolower($value)) ?: [] as $username) {
            if ($username !== '' && ! in_array($username, $out, true)) {
                $out[] = $username;
            }
        }

        return $out;
    }

    /** @param  list<string>  $usernames */
    public static function format(array $usernames): string
    {
        return implode(', ', self::parse(implode(',', $usernames)));
    }
}
