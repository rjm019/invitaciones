<?php

namespace App\Services\Design;

/**
 * Un invitacion.csv ya leído: sus bytes y, solo si alguien lo pide, el diseño descifrado.
 * Así cada operación (abrir, guardar, publicar) lee un archivo una sola vez, y para saber
 * si cambió le basta la huella de los bytes, sin descifrarlo.
 */
final class StoredDesign
{
    private ?string $hash = null;

    private ?string $contentHash = null;

    /**
     * @param  array{0: Design, 1: list<string>}|null  $parsed
     */
    private function __construct(
        private readonly DesignFile $file,
        public readonly string $bytes,
        private ?array $parsed = null,
    ) {}

    public static function fromBytes(DesignFile $file, string $bytes): self
    {
        return new self($file, $bytes);
    }

    /**
     * Un diseño que no viene de un invitacion.csv (la conversión del formato anterior).
     *
     * @param  list<string>  $warnings
     */
    public static function fromDesign(DesignFile $file, Design $design, array $warnings = []): self
    {
        return new self($file, $file->toCsv($design), [$design, $warnings]);
    }

    /** Huella de los bytes: cambia con cualquier cambio del archivo. */
    public function hash(): string
    {
        return $this->hash ??= hash('xxh128', $this->bytes);
    }

    /**
     * Huella del contenido: igual para dos archivos con la misma invitación aunque estén
     * escritos distinto (uno guardado desde Excel, por ejemplo). En los que escribe el
     * sistema es la misma que hash().
     */
    public function contentHash(): string
    {
        return $this->contentHash ??= $this->file->hash($this->design());
    }

    /**
     * El diseño descifrado (una sola vez). Es el mismo objeto en cada llamada: quien lo
     * quiera cambiar, que lo lea por su cuenta (DesignStore::current()).
     */
    public function design(): Design
    {
        return $this->parsed()[0];
    }

    /** @return list<string> */
    public function warnings(): array
    {
        return $this->parsed()[1];
    }

    /** @return array{0: Design, 1: list<string>} */
    private function parsed(): array
    {
        return $this->parsed ??= $this->file->parseCsv($this->bytes);
    }
}
