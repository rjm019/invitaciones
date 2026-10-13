import { describe, expect, it } from 'vitest'
import {
  confetti,
  flutterPieces,
  glints,
  motionTime,
  parallaxOffset,
  seededRandom,
  sparkles,
  splitLetters,
} from '../effectsService'

describe('parallaxOffset', () => {
  it('en el centro de la pantalla no se mueve; arriba y abajo se mueve en sentido contrario', () => {
    expect(parallaxOffset({ top: 300, height: 200 }, 800, 0.06)).toBe(0)
    expect(parallaxOffset({ top: 600, height: 200 }, 800, 0.06)).toBe(-18)
    expect(parallaxOffset({ top: 0, height: 200 }, 800, 0.06)).toBe(18)
  })

  it('nunca pasa del máximo', () => {
    expect(parallaxOffset({ top: 3000, height: 200 }, 800, 0.06)).toBe(-24)
  })
})

describe('splitLetters', () => {
  it('separa en palabras y numera las letras de corrido (acentos incluidos)', () => {
    const { words, count } = splitLetters(' Hoy  comienza el capítulo ')
    expect(words.map((w) => w.map((l) => l.char).join(''))).toEqual([
      'Hoy',
      'comienza',
      'el',
      'capítulo',
    ])
    expect(words[1][0]).toEqual({ char: 'c', index: 3 })
    expect(count).toBe(21)
  })
})

describe('destellos y confeti', () => {
  it('la misma semilla da siempre los mismos números (entre 0 y 1)', () => {
    const a = seededRandom('fecha')
    const b = seededRandom('fecha')
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(seededRandom('otra')()).not.toBe(first[0])
  })

  it('los destellos de una sección no cambian entre visitas y la mayoría va a las orillas', () => {
    const list = sparkles('countdown', 9)
    expect(sparkles('countdown', 9)).toEqual(list)
    expect(list).toHaveLength(9)
    const edges = list.filter((s) => s.left < 16 || s.left > 84)
    expect(edges.length).toBeGreaterThanOrEqual(6)
    expect(list.every((s) => s.top >= 4 && s.top <= 96 && s.delay <= 0)).toBe(true)
  })

  it('el confeti sale del centro, sube, cae y alterna formas y colores', () => {
    const pieces = confetti('sobre', 12, 4)
    expect(pieces).toHaveLength(12)
    expect(pieces.every((p) => p.x >= 42 && p.x <= 58 && p.rise < 0 && p.fall > 0)).toBe(true)
    expect(new Set(pieces.map((p) => p.shape))).toEqual(new Set(['petal', 'strip', 'dot']))
    expect(pieces.map((p) => p.color).slice(0, 5)).toEqual([0, 1, 2, 3, 0])
  })
})

describe('figuras de una decoración', () => {
  const parts = [
    { x: 0, y: 44, w: 27.1, h: 23.5 },
    { x: 92.3, y: 15, w: 7.7, h: 9.5 },
  ]

  it('recorta cada mariposa y la hace aletear alrededor de su centro', () => {
    const [a, b] = flutterPieces(parts, 'mariposas')
    expect(a!.clip).toBe('inset(44% 72.9% 32.5% 0%)')
    expect(a!.origin).toBe('13.6% 55.8%')
    expect(b!.clip).toBe('inset(15% 0% 75.5% 92.3%)')
    expect(flutterPieces(parts, 'mariposas')).toEqual([a, b])
    expect(a!.flap).toBeGreaterThanOrEqual(0.35)
    expect(a!.drift).toBeGreaterThanOrEqual(4.5)
  })

  it('pone un destello en el centro de cada estrella, con tamaño entre 5 % y 18 %', () => {
    const list = glints([{ x: 34, y: 29.5, w: 49.2, h: 44.5 }, ...parts], 'estrellas')
    expect(list.map((g) => [g.left, g.top, g.size])).toEqual([
      [58.6, 51.8, 18],
      [13.6, 55.8, 11.8],
      [96.1, 19.8, 5],
    ])
  })
})

describe('motionTime', () => {
  it('cada duración pasa por la velocidad de la invitación', () => {
    expect(motionTime(2.4)).toBe('calc(2.4s * var(--motion-scale))')
    expect(motionTime(120, 'ms')).toBe('calc(120ms * var(--motion-scale))')
  })
})
