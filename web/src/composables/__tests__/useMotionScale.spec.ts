import { afterEach, describe, expect, it } from 'vitest'
import { motionScale } from '../useMotionScale'

afterEach(() => document.documentElement.style.removeProperty('--motion-scale'))

describe('motionScale', () => {
  it('lee la velocidad de los efectos del token', () => {
    document.documentElement.style.setProperty('--motion-scale', '1.1')
    expect(motionScale()).toBe(1.1)
  })

  it('sin token, o con un valor inválido, los efectos van a su velocidad original', () => {
    expect(motionScale()).toBe(1)
    document.documentElement.style.setProperty('--motion-scale', 'rápido')
    expect(motionScale()).toBe(1)
  })
})
