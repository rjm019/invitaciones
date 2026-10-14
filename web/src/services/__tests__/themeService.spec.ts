import { describe, expect, it } from 'vitest'
import {
  extraFonts,
  fontVars,
  googleFontsUrl,
  paletteVars,
  resolveFonts,
  sectionStyleVars,
} from '../themeService'

describe('themeService', () => {
  it('la paleta del layout se vuelve --color-*; lo inválido se ignora', () => {
    expect(
      paletteVars({ primary: '#96792C', lino: '#F0EDE8', accent: 'azul', 'mal token': '#000' }),
    ).toEqual({
      '--color-primary': '#96792C',
      '--color-lino': '#F0EDE8',
    })
  })

  it('una fuente sustituida en el layout reutiliza los pesos que el tema conoce', () => {
    const fonts = resolveFonts(
      {
        serif: { family: 'EB Garamond', weights: [400, 600] },
        display: { family: 'Playfair Display', weights: [400, 700] },
      },
      { display: 'EB Garamond', script: 'Great Vibes' },
    )
    expect(fonts.display).toEqual({ family: 'EB Garamond', weights: [400, 600] })
    expect(fonts.script).toEqual({ family: 'Great Vibes' })
  })

  it('una sola URL de Google Fonts, sin familias repetidas y sin pedir pesos inexistentes', () => {
    expect(
      googleFontsUrl([
        { family: 'Pinyon Script' },
        { family: 'EB Garamond', weights: [600, 400] },
        { family: 'EB Garamond', weights: [400] },
      ]),
    ).toBe(
      'https://fonts.googleapis.com/css2?family=Pinyon+Script&family=EB+Garamond:wght@400;600&display=swap',
    )
    expect(googleFontsUrl([])).toBeNull()
  })

  it('variables de fuente con respaldo por rol', () => {
    expect(
      fontVars({ script: { family: 'Pinyon Script' }, serif: { family: 'EB Garamond' } }),
    ).toEqual({
      '--font-script': '"Pinyon Script", cursive',
      '--font-serif': '"EB Garamond", serif',
    })
  })

  it('los colores propios de una sección se vuelven --color-* solo para ella', () => {
    expect(
      sectionStyleVars({
        colors: { text: '#FFFFFF', primary: 'accent', accent: 'accent', 'mal token': '#000' },
      }),
    ).toEqual({
      '--color-text': '#FFFFFF',
      '--color-primary': 'var(--color-accent)',
    })
  })

  it('cada bloque de texto tiene su letra, color y tamaño; lo inválido se ignora', () => {
    expect(
      sectionStyleVars({
        text_styles: {
          title: { font: 'Great Vibes', color: 'accent-strong', size: 1.3 },
          time: { color: '#2F4A7A', size: 4 },
          text: { font: "Lora'; background:url(x)" },
        },
      }),
    ).toEqual({
      '--t-title-font': '"Great Vibes", serif',
      '--t-title-color': 'var(--color-accent-strong)',
      '--t-title-size': '1.3',
      '--t-time-color': '#2F4A7A',
    })
    expect(sectionStyleVars({})).toEqual({})
  })

  it('las fuentes de los textos se piden una vez y sin pesos', () => {
    expect(extraFonts(['Great Vibes', 'Lora', 'Great Vibes', 'mala"fuente'])).toEqual([
      { family: 'Great Vibes' },
      { family: 'Lora' },
    ])
    expect(extraFonts(undefined)).toEqual([])
  })
})
