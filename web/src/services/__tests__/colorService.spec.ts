import { describe, expect, it } from 'vitest'
import {
  contrast,
  derivePalette,
  hexToHsl,
  hexToHsv,
  hslToHex,
  hsvToHex,
  mix,
  normalizeHex,
  PALETTE_PRESETS,
  readableOn,
} from '../colorService'

describe('colorService', () => {
  it('normaliza y convierte colores sin perderlos', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC')
    expect(normalizeHex('#96792c')).toBe('#96792C')
    expect(normalizeHex('#96792CFF')).toBe('#96792C')
    expect(normalizeHex('dorado')).toBeNull()
    for (const hex of ['#96792C', '#8CC0E8', '#000000', '#FFFFFF', '#523C0B']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })

  it('contraste WCAG y texto legible sobre un color', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
    expect(contrast('#523C0B', '#F3F1EC')).toBeGreaterThan(7)
    expect(contrast('#E2C77A', '#F3F1EC')).toBeLessThan(3)
    expect(readableOn('#4A7194')).toBe('#FFFFFF')
    expect(readableOn('#F3F1EC')).toBe('#1E293B')
  })

  it('con el principal y el acento arma una paleta completa y legible', () => {
    const palette = derivePalette('#96792C', '#8CC0E8')
    expect(Object.keys(palette)).toEqual([
      'fondo',
      'texto',
      'primario',
      'primario_fuerte',
      'primario_claro',
      'acento',
      'acento_suave',
      'acento_fuerte',
      'superficie',
      'marco',
      'panel',
      'panel_alt',
      'panel_warm',
    ])
    expect(palette.primario).toBe('#96792C')
    expect(contrast(palette.texto, palette.fondo)).toBeGreaterThan(7)
    expect(contrast(palette.acento_fuerte, '#FFFFFF')).toBeGreaterThan(4.5)
    expect(Object.values(palette).every((c) => /^#[0-9A-F]{6}$/.test(c))).toBe(true)
  })

  it('las paletas sugeridas se leen bien y traen sus paneles', () => {
    for (const preset of PALETTE_PRESETS) {
      expect(contrast(preset.colors.texto, preset.colors.fondo), preset.id).toBeGreaterThan(7)
      expect(preset.colors.panel_alt, preset.id).toMatch(/^#[0-9A-F]{6}$/)
    }
  })
})
