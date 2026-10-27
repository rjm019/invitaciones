<?php

namespace App\Services\Design;

use Carbon\CarbonImmutable;

/**
 * Lo que dice la sección "trivia" de invitacion.csv: sus preguntas (con la respuesta
 * correcta, que solo conoce el servidor) y cuándo cierra. El builder lo usa para armar el
 * config público (sin `correcta`) y para avisar de errores; TriviaService, para calificar.
 */
final class TriviaQuiz
{
    public const MAX_QUESTIONS = 10;

    public const MIN_OPTIONS = 2;

    public const MAX_OPTIONS = 4;

    /**
     * Las opciones de una pregunta, en orden y sin las vacías del final.
     *
     * @param  array<string, string>  $item
     * @return list<string>
     */
    public static function options(array $item): array
    {
        $options = [];
        for ($n = 1; $n <= self::MAX_OPTIONS; $n++) {
            $options[] = trim($item["opcion_{$n}"] ?? '');
        }
        while ($options !== [] && end($options) === '') {
            array_pop($options);
        }

        return $options;
    }

    /** Número de la opción correcta (1 a 4), o null si no es un número válido. */
    public static function correct(array $item): ?int
    {
        $value = trim($item['correcta'] ?? '');

        return preg_match('/^[1-4]$/', $value) ? (int) $value : null;
    }

    /**
     * Las preguntas completas, con `correct` (1 a N) para calificar. Las filas vacías, con
     * menos de 2 opciones, con huecos entre opciones o sin respuesta correcta válida se
     * saltan (el builder las reporta como error); máximo 10.
     *
     * @return list<array{text: string, options: list<string>, correct: int}>
     */
    public static function questions(?DesignSection $section): array
    {
        $out = [];
        foreach ($section?->items ?? [] as $item) {
            $text = trim($item['pregunta'] ?? '');
            $options = self::options($item);
            $correct = self::correct($item);
            if ($text === '' || count($options) < self::MIN_OPTIONS || in_array('', $options, true) || $correct === null || $correct > count($options)) {
                continue;
            }
            $out[] = ['text' => $text, 'options' => $options, 'correct' => $correct];
            if (count($out) === self::MAX_QUESTIONS) {
                break;
            }
        }

        return $out;
    }

    /** `cierra` (una fecha sola cierra al terminar ese día); null si no hay o no es válida. */
    public static function closesAt(?DesignSection $section, string $timezone): ?CarbonImmutable
    {
        $value = $section?->field('cierra');
        if ($value === null) {
            return null;
        }
        $date = Normalizer::dateTime($value, $timezone);
        if ($date !== null && Normalizer::date($value) === trim($value)) {
            $date = $date->endOfDay();
        }

        return $date;
    }
}
