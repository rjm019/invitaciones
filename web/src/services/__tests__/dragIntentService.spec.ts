import { describe, expect, it } from 'vitest'
import { createDragIntent } from '../dragIntentService'

describe('createDragIntent (arrastrar desde Elegir)', () => {
  it('un toque sin mover es un clic: elige', () => {
    const i = createDragIntent<string>(4)
    i.start(10, 10, 'titulo')
    expect(i.move(12, 11)).toBeNull()
    expect(i.end()).toBe(true)
  })

  it('pasar de 4 px devuelve el elemento una sola vez y ya no es un clic', () => {
    const i = createDragIntent<string>(4)
    i.start(10, 10, 'titulo')
    expect(i.move(13, 10)).toBeNull()
    expect(i.move(16, 10)).toBe('titulo')
    expect(i.move(40, 40)).toBeNull()
    expect(i.end()).toBe(false)
  })

  it('cancelar (touchcancel) no cuenta como clic y sin gesto no hace nada', () => {
    const i = createDragIntent<string>()
    expect(i.end()).toBe(false)
    i.start(0, 0, 'x')
    expect(i.pending).toBe(true)
    expect(i.end(true)).toBe(false)
    expect(i.pending).toBe(false)
    expect(i.move(50, 50)).toBeNull()
  })
})
