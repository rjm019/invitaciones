import { describe, expect, it } from 'vitest'
import { FONT_PAIRINGS, FONTS, sampleFontsUrl } from '../fontCatalog'

describe('fontCatalog', () => {
  it('las muestras piden solo las letras del ejemplo, sin fuentes repetidas ni raras', () => {
    expect(sampleFontsUrl(['Great Vibes', 'Lora', 'Great Vibes', 'mala"fuente'], 'Aaa b')).toBe(
      'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora&text=Aa%20b&display=swap',
    )
    expect(sampleFontsUrl([], 'x')).toBeNull()
  })

  it('cada combinación usa fuentes de la lista y cubre los roles principales', () => {
    const known = new Set(FONTS.map((f) => f.family))
    for (const pairing of FONT_PAIRINGS) {
      expect(Object.keys(pairing.fonts)).toEqual(
        expect.arrayContaining(['script', 'serif', 'caps', 'display']),
      )
      Object.values(pairing.fonts).forEach((family) => expect(known.has(family), family).toBe(true))
    }
  })
})
