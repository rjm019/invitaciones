import { describe, expect, it } from 'vitest'
import { shouldReveal } from '../reveal'

const entry = (ratio: number, visibleHeight: number) => ({
  isIntersecting: ratio > 0,
  intersectionRatio: ratio,
  intersectionRect: { height: visibleHeight } as DOMRectReadOnly,
})

describe('shouldReveal', () => {
  it('una sección corta aparece en cuanto se ve una quinta parte (aunque esté al final de la página)', () => {
    expect(shouldReveal(entry(1, 45), 844)).toBe(true)
    expect(shouldReveal(entry(0.1, 10), 844)).toBe(false)
  })

  it('una sección más alta que la pantalla aparece cuando ocupa el 15 % de la pantalla', () => {
    expect(shouldReveal(entry(0.05, 200), 844)).toBe(true)
    expect(shouldReveal(entry(0.02, 80), 844)).toBe(false)
  })

  it('fuera de la pantalla nunca', () => {
    expect(shouldReveal(entry(0, 0), 844)).toBe(false)
  })
})
