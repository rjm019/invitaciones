import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  createHistory,
  record,
  redo,
  undo,
  HISTORY_LIMIT,
} from '../designHistoryService'

describe('designHistoryService', () => {
  it('deshace y rehace; un cambio nuevo borra lo que se podía rehacer', () => {
    let h = createHistory('a')
    h = record(h, 'b', null, 0)
    h = record(h, 'c', null, 10)
    expect(canUndo(h)).toBe(true)
    h = undo(h)
    expect(h.present).toBe('b')
    h = redo(h)
    expect(h.present).toBe('c')
    h = undo(undo(h))
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)
    h = record(h, 'd', null, 20)
    expect(canRedo(h)).toBe(false)
    expect(undo(h).present).toBe('a')
  })

  it('lo que se escribe seguido en el mismo campo es un solo paso', () => {
    let h = createHistory('')
    h = record(h, 'H', 'titulo', 0)
    h = record(h, 'Ho', 'titulo', 300)
    h = record(h, 'Hol', 'titulo', 600)
    h = record(h, 'Hola', 'titulo', 900)
    expect(undo(h).present).toBe('')
    // Después de una pausa (o en otro campo) ya es otro paso.
    h = record(h, 'Hola!', 'titulo', 2500)
    expect(undo(h).present).toBe('Hola')
    h = record(h, 'x', 'texto', 2600)
    expect(undo(h).present).toBe('Hola!')
  })

  it('guarda como máximo 50 pasos', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 80; i++) h = record(h, i, null, i * 2000)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(30)
  })
})
