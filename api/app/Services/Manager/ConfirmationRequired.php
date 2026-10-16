<?php

namespace App\Services\Manager;

use RuntimeException;

/** Eliminar una invitación que ya se compartió pide escribir su dirección (EventTrash). */
final class ConfirmationRequired extends RuntimeException {}
