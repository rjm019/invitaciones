<?php

namespace App\Services\Design;

/**
 * Lo que sale de armar una invitación: el config y lo que hay que revisar. Cada aviso dice
 * dónde está (bloque o sección, elemento y campo) para que el editor marque el campo exacto.
 */
final class BuildResult
{
    /**
     * @param  array<string, mixed>  $config
     * @param  list<array{level: string, block: string, item: ?int, field: ?string, message: string}>  $issues
     */
    public function __construct(
        public readonly array $config,
        public readonly array $issues,
    ) {}

    public function hasErrors(): bool
    {
        return $this->errors() !== [];
    }

    /** @return list<string> */
    public function errors(): array
    {
        return $this->messages('error');
    }

    /** @return list<string> */
    public function warnings(): array
    {
        return $this->messages('warning');
    }

    /** @return list<string> */
    private function messages(string $level): array
    {
        return array_values(array_map(
            fn ($issue) => $issue['message'],
            array_filter($this->issues, fn ($issue) => $issue['level'] === $level),
        ));
    }
}
