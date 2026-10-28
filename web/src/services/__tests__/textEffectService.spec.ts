import { describe, expect, it } from 'vitest'
import { LETTER_EFFECTS, letterStep, textEffect } from '../textEffectService'

describe('textEffectService', () => {
  it('elige el efecto de texto de la sección, en orden de preferencia', () => {
    expect(textEffect(['reveal', 'calligraphy', 'stamp'])).toBe('stamp')
    expect(textEffect(['reveal', 'ink'])).toBeNull()
    expect(textEffect(undefined)).toBeNull()
  })

  it('con `allow` solo considera los permitidos', () => {
    expect(textEffect(['stamp', 'calligraphy'], ['calligraphy'])).toBe('calligraphy')
    expect(textEffect(['stamp'], ['gold-leaf'])).toBeNull()
  })

  it('el paso entre letras no deja que un título largo tarde de más', () => {
    expect(letterStep('typewriter-title', 10)).toBe(70)
    expect(letterStep('typewriter-title', 60)).toBe(30)
    expect(letterStep('ink-dry', 200)).toBe(18)
    expect(LETTER_EFFECTS).toContain('stamp')
  })
})
