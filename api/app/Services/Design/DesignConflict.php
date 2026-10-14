<?php

namespace App\Services\Design;

use RuntimeException;

/**
 * La invitación cambió desde que el editor la abrió (otra pestaña u otra persona). Lleva
 * la versión actual para que el editor ofrezca cargarla o quedarse con la suya.
 */
final class DesignConflict extends RuntimeException
{
    public function __construct(public readonly string $version)
    {
        parent::__construct('La invitación cambió en otra ventana.');
    }
}
