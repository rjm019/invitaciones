<?php

namespace App\Services\Design;

use Closure;

/**
 * Lo que hay en disco de una invitación en un momento: el borrador (si hay) y la versión
 * publicada (o, en el formato anterior, su conversión). De aquí salen lo que el gestor
 * tiene enfrente, su versión y si hay cambios sin publicar, sin volver a leer nada. La
 * publicada se lee hasta que alguien la pide (con borrador, la versión no la necesita).
 */
final class DesignState
{
    private ?StoredDesign $published = null;

    /** @var array<string, string> */
    private array $legacySettings = [];

    /**
     * $loadPublished lee la publicada y, en el formato anterior, la clave y "publicado" del
     * Excel; $legacy dice si el evento sigue en ese formato (sin invitacion.csv).
     *
     * @param  Closure(): array{0: StoredDesign, 1: array<string, string>}  $loadPublished
     */
    public function __construct(
        public readonly string $dir,
        public readonly ?StoredDesign $draft,
        public readonly bool $legacy,
        private readonly Closure $loadPublished,
    ) {}

    public function published(): StoredDesign
    {
        if ($this->published === null) {
            [$this->published, $this->legacySettings] = ($this->loadPublished)();
        }

        return $this->published;
    }

    /** @return array<string, string> */
    public function legacySettings(): array
    {
        $this->published();

        return $this->legacySettings;
    }

    /** Lo que el gestor tiene enfrente: el borrador; si no hay, la publicada. */
    public function current(): StoredDesign
    {
        return $this->draft ?? $this->published();
    }

    /** @return 'draft'|'live'|'legacy' */
    public function source(): string
    {
        return $this->draft !== null ? 'draft' : ($this->legacy ? 'legacy' : 'live');
    }

    /** Huella de lo que el gestor tiene enfrente: cambia con cualquier cambio guardado. */
    public function version(): string
    {
        $prefix = ['draft' => 'b', 'live' => 'p', 'legacy' => 'a'][$this->source()];

        return $prefix.'-'.$this->current()->hash();
    }

    /** ¿El borrador es distinto de lo publicado? */
    public function pending(): bool
    {
        if ($this->draft === null) {
            return false;
        }
        if ($this->draft->hash() === $this->published()->hash()) {
            return false;
        }

        return $this->draft->contentHash() !== $this->published()->contentHash();
    }

    /** El mismo estado con otro borrador (el que se acaba de guardar). */
    public function withDraft(StoredDesign $draft): self
    {
        $state = new self($this->dir, $draft, $this->legacy, $this->loadPublished);
        $state->published = $this->published;
        $state->legacySettings = $this->legacySettings;

        return $state;
    }
}
