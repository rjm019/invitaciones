import type { TriviaQuestion } from '@/types/event'
import type { InvitationTrivia, TriviaPayload, TriviaResult } from '@/types/invitation'

/**
 * Trivia, sin Vue. Repite las reglas del servidor solo para avisar antes de enviar: quien
 * califica, mide el tiempo y decide si ya cerró o ya respondió es la API. Aquí nunca hay
 * respuestas correctas.
 */

export const MAX_TRIVIA_NAME = 80

/** Nombre en una sola línea. */
export function cleanTriviaName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Mensaje si el nombre no sirve; '' si está bien. */
export function triviaNameError(name: string): string {
  const clean = cleanTriviaName(name)
  if (!clean) return 'Escribe tu nombre.'
  if (clean.length > MAX_TRIVIA_NAME)
    return `Tu nombre es muy largo (máximo ${MAX_TRIVIA_NAME} letras).`
  return ''
}

/** Las preguntas que sí se pueden mostrar: con texto y de 2 a 4 opciones. */
export function playableQuestions(questions: TriviaQuestion[] | undefined): TriviaQuestion[] {
  return (questions ?? []).filter(
    (q) => q.text.trim() !== '' && q.options.length >= 2 && q.options.length <= 4,
  )
}

/** Avance de la barra, de 0 a 100: la pregunta actual cuenta como hecha al responderla. */
export function triviaProgress(index: number, total: number, answered: boolean): number {
  if (total <= 0) return 0
  const done = Math.min(total, Math.max(0, index) + (answered ? 1 : 0))
  return Math.round((done / total) * 100)
}

/** ¿Está elegida una opción válida en cada pregunta? */
export function allAnswered(answers: (number | null)[], questions: TriviaQuestion[]): boolean {
  return (
    questions.length > 0 &&
    answers.length === questions.length &&
    questions.every((q, i) => {
      const a = answers[i]
      return typeof a === 'number' && a >= 1 && a <= q.options.length
    })
  )
}

/** Lo que se manda: el nombre limpio y el número de opción de cada pregunta. */
export function toTriviaPayload(name: string, answers: (number | null)[]): TriviaPayload {
  return { name: cleanTriviaName(name), answers: answers.map((a) => a ?? 0) }
}

/** "7 de 10". */
export function triviaScore(result: Pick<TriviaResult, 'correct' | 'total'>): string {
  return `${result.correct} de ${result.total}`
}

/** "45 s", "2 min 05 s". */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  const rest = String(total % 60).padStart(2, '0')
  return `${minutes} min ${rest} s`
}

/** ¿Ya cerró? Sin fecha de cierre, no. */
export function isTriviaClosed(closesAt: string | undefined | null, now: number): boolean {
  if (!closesAt) return false
  const at = Date.parse(closesAt)
  return Number.isFinite(at) && now > at
}

/** Qué ve el invitado según lo que dice el servidor: jugar, su resultado o "ya cerró". */
export function triviaMode(
  state: InvitationTrivia | null | undefined,
  closesAt: string | undefined | null,
  now: number,
): 'play' | 'done' | 'closed' {
  if (state?.result) return 'done'
  if (state ? !state.open : isTriviaClosed(closesAt, now)) return 'closed'
  return 'play'
}

/** Errores 422 de Laravel → el primer mensaje (del nombre o de las respuestas). */
export function triviaErrorMessage(errors: Record<string, string[]> | string[]): string {
  if (Array.isArray(errors)) return ''
  return errors.name?.[0] ?? errors.answers?.[0] ?? ''
}
