import { describe, expect, it } from 'vitest'
import {
  MAX_TRIVIA_NAME,
  allAnswered,
  cleanTriviaName,
  formatSeconds,
  isTriviaClosed,
  playableQuestions,
  toTriviaPayload,
  triviaErrorMessage,
  triviaMode,
  triviaNameError,
  triviaProgress,
  triviaScore,
} from '../triviaService'

const questions = [
  { text: '¿Color?', options: ['Rojo', 'Azul'] },
  { text: '¿Mascota?', options: ['Perro', 'Gato', 'Pez'] },
]

describe('triviaService', () => {
  it('limpia el nombre y avisa si falta o es muy largo', () => {
    expect(cleanTriviaName('  Ana   Prueba ')).toBe('Ana Prueba')
    expect(triviaNameError('   ')).toBe('Escribe tu nombre.')
    expect(triviaNameError('a'.repeat(MAX_TRIVIA_NAME + 1))).toBe(
      'Tu nombre es muy largo (máximo 80 letras).',
    )
    expect(triviaNameError('Ana')).toBe('')
  })

  it('solo muestra preguntas con texto y de 2 a 4 opciones', () => {
    const list = [
      ...questions,
      { text: '', options: ['a', 'b'] },
      { text: 'Una sola', options: ['a'] },
      { text: 'Cinco', options: ['a', 'b', 'c', 'd', 'e'] },
    ]
    expect(playableQuestions(list)).toEqual(questions)
    expect(playableQuestions(undefined)).toEqual([])
  })

  it('la barra avanza al responder cada pregunta', () => {
    expect(triviaProgress(0, 4, false)).toBe(0)
    expect(triviaProgress(0, 4, true)).toBe(25)
    expect(triviaProgress(3, 4, true)).toBe(100)
    expect(triviaProgress(9, 4, true)).toBe(100)
    expect(triviaProgress(0, 0, true)).toBe(0)
  })

  it('exige una opción válida en cada pregunta', () => {
    expect(allAnswered([2, 3], questions)).toBe(true)
    expect(allAnswered([2, null], questions)).toBe(false)
    expect(allAnswered([2], questions)).toBe(false)
    expect(allAnswered([3, 1], questions)).toBe(false)
    expect(allAnswered([], [])).toBe(false)
  })

  it('arma lo que se envía: nombre limpio y número de opción', () => {
    expect(toTriviaPayload('  Ana  P ', [2, 1])).toEqual({ name: 'Ana P', answers: [2, 1] })
  })

  it('muestra "7 de 10" y el tiempo', () => {
    expect(triviaScore({ correct: 7, total: 10 })).toBe('7 de 10')
    expect(formatSeconds(45)).toBe('45 s')
    expect(formatSeconds(125)).toBe('2 min 05 s')
    expect(formatSeconds(-3)).toBe('0 s')
  })

  it('sabe si ya cerró', () => {
    const closes = '2026-11-28T17:00:00-06:00'
    expect(isTriviaClosed(closes, Date.parse('2026-11-28T16:59:59-06:00'))).toBe(false)
    expect(isTriviaClosed(closes, Date.parse('2026-11-28T17:00:01-06:00'))).toBe(true)
    expect(isTriviaClosed(undefined, Date.now())).toBe(false)
  })

  it('el servidor manda: resultado, cerrada o a jugar', () => {
    const now = Date.parse('2026-10-13T12:00:00-06:00')
    const result = { name: 'Ana', correct: 7, total: 10, seconds: 30 }
    expect(triviaMode({ open: false, closed_message: null, result }, null, now)).toBe('done')
    expect(triviaMode({ open: false, closed_message: 'x', result: null }, null, now)).toBe('closed')
    expect(triviaMode({ open: true, closed_message: null, result: null }, null, now)).toBe('play')
    // Sin estado (invitación general o vista previa): manda la fecha de cierre.
    expect(triviaMode(null, '2026-10-01T00:00:00-06:00', now)).toBe('closed')
    expect(triviaMode(undefined, '2026-12-01T00:00:00-06:00', now)).toBe('play')
  })

  it('toma el mensaje del servidor', () => {
    expect(triviaErrorMessage({ name: ['Escribe tu nombre.'] })).toBe('Escribe tu nombre.')
    expect(triviaErrorMessage({ answers: ['Responde todas las preguntas.'] })).toBe(
      'Responde todas las preguntas.',
    )
    expect(triviaErrorMessage([])).toBe('')
  })
})
