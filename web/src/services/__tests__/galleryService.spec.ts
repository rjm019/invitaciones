import { describe, expect, it } from 'vitest'
import { stepIndex, swipeAction } from '../galleryService'

describe('stepIndex', () => {
  it('avanza y retrocede', () => {
    expect(stepIndex(1, 1, 5)).toBe(2)
    expect(stepIndex(3, -1, 5)).toBe(2)
  })

  it('da la vuelta en los extremos', () => {
    expect(stepIndex(4, 1, 5)).toBe(0)
    expect(stepIndex(0, -1, 5)).toBe(4)
  })

  it('con una sola foto o ninguna se queda en 0', () => {
    expect(stepIndex(0, 1, 1)).toBe(0)
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})

describe('swipeAction', () => {
  it('izquierda es la siguiente y derecha la anterior', () => {
    expect(swipeAction(-120, 10)).toBe('next')
    expect(swipeAction(120, -10)).toBe('prev')
  })

  it('hacia abajo cierra; hacia arriba no hace nada', () => {
    expect(swipeAction(5, 140)).toBe('close')
    expect(swipeAction(5, -140)).toBeNull()
  })

  it('un movimiento corto no cuenta', () => {
    expect(swipeAction(20, 30)).toBeNull()
  })
})
