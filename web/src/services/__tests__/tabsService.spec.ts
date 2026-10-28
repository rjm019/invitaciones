import { describe, expect, it } from 'vitest'
import { swipeStep, tabTarget } from '../tabsService'

describe('tabTarget', () => {
  it('las flechas avanzan y regresan dando la vuelta', () => {
    expect(tabTarget('ArrowRight', 0, 3)).toBe(1)
    expect(tabTarget('ArrowRight', 2, 3)).toBe(0)
    expect(tabTarget('ArrowLeft', 0, 3)).toBe(2)
    expect(tabTarget('ArrowDown', 1, 3)).toBe(2)
    expect(tabTarget('ArrowUp', 1, 3)).toBe(0)
  })

  it('Inicio y Fin van a las orillas; otra tecla no hace nada', () => {
    expect(tabTarget('Home', 2, 3)).toBe(0)
    expect(tabTarget('End', 0, 3)).toBe(2)
    expect(tabTarget('Enter', 1, 3)).toBeNull()
    expect(tabTarget('ArrowRight', 0, 0)).toBeNull()
  })
})

describe('swipeStep', () => {
  it('a la izquierda avanza y a la derecha regresa', () => {
    expect(swipeStep(-80, 5)).toBe(1)
    expect(swipeStep(90, -10)).toBe(-1)
  })

  it('ignora los toques cortos y el scroll vertical', () => {
    expect(swipeStep(-20, 0)).toBe(0)
    expect(swipeStep(-60, 120)).toBe(0)
  })
})
