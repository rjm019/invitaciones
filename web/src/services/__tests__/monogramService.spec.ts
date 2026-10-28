import { describe, expect, it } from 'vitest'
import { seededRandom } from '@/services/effectsService'
import {
  monogramInitials,
  monogramLayout,
  waxBlobPath,
  waxEdgePath,
  cartouchePaths,
  sealDetail,
} from '../monogramService'

describe('monogramInitials', () => {
  it('usa las iniciales que escribió la invitación (solo letras, hasta tres)', () => {
    expect(monogramInitials('i m')).toEqual(['I', 'M'])
    expect(monogramInitials('A & B & C & D')).toEqual(['A', 'B', 'C'])
    expect(monogramInitials('é.n')).toEqual(['É', 'N'])
  })

  it('las deriva de una pareja en el nombre corto', () => {
    expect(monogramInitials('', 'Isabella & Mateo')).toEqual(['I', 'M'])
    expect(monogramInitials(undefined, 'Ana y Luis')).toEqual(['A', 'L'])
    expect(monogramInitials('', 'Sofía + Álvaro')).toEqual(['S', 'Á'])
  })

  it('con un solo nombre y una pareja, la inicial de cada uno', () => {
    expect(monogramInitials('', 'Nat', null, 'Luis')).toEqual(['N', 'L'])
  })

  it('con un solo nombre, su inicial; con nombre completo, primera y última palabra', () => {
    expect(monogramInitials('', 'Nat')).toEqual(['N'])
    expect(monogramInitials('', '', 'Ana María López')).toEqual(['A', 'L'])
  })

  it('sin datos no hay iniciales', () => {
    expect(monogramInitials('', '', '')).toEqual([])
    expect(monogramInitials(null, null, null)).toEqual([])
  })
})

describe('monogramLayout', () => {
  it('acomoda una, dos y tres letras (la del centro más grande) y el "&" solo con dos', () => {
    expect(monogramLayout(['N']).letters).toHaveLength(1)
    const two = monogramLayout(['I', 'M'], true)
    expect(two.letters.map((l) => l.char)).toEqual(['I', 'M'])
    expect(two.ampersand?.char).toBe('&')
    const three = monogramLayout(['A', 'B', 'C'], true)
    expect(three.letters[1].size).toBeGreaterThan(three.letters[0].size)
    expect(three.ampersand).toBeNull()
    expect(monogramLayout([]).letters).toEqual([])
  })
})

describe('waxEdgePath', () => {
  it('es repetible con la misma semilla, cerrado y distinto con otra', () => {
    const a = waxEdgePath(seededRandom('lacre'))
    expect(a).toBe(waxEdgePath(seededRandom('lacre')))
    expect(a).not.toBe(waxEdgePath(seededRandom('otro')))
    expect(a.startsWith('M')).toBe(true)
    expect(a.endsWith('Z')).toBe(true)
  })
})

describe('waxBlobPath', () => {
  it('es repetible con la misma semilla, cerrado, suave y alrededor del centro', () => {
    const a = waxBlobPath(seededRandom('lacre'), 44, 44)
    expect(a).toBe(waxBlobPath(seededRandom('lacre'), 44, 44))
    expect(a).not.toBe(waxBlobPath(seededRandom('otro'), 44, 44))
    expect(a).toMatch(/^M[^Z]*C[^Z]*Z$/)
    const xs = [...a.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
    // la orilla tiembla pero no se sale de la caja de 100
    expect(Math.min(...xs)).toBeGreaterThan(0)
    expect(Math.max(...xs)).toBeLessThan(100)
  })
})

describe('sealDetail', () => {
  it('quita detalle en lacres chicos; sin medir, completo', () => {
    expect(sealDetail(0)).toBe('full')
    expect(sealDetail(160)).toBe('full')
    expect(sealDetail(80)).toBe('mid')
    expect(sealDetail(40)).toBe('low')
  })
})

describe('cartouchePaths', () => {
  it('da una cartela simétrica con trazos de varios grosores, hojas y perlas', () => {
    const full = cartouchePaths('full')
    expect(full.heavy).toMatch(/^M/)
    expect(full.medium).toMatch(/^M/)
    expect(full.fine).toMatch(/^M/)
    expect(full.beads.split('M').length - 1).toBe(96)
    expect(cartouchePaths('full')).toEqual(full)
    // simétrica: cada x de la mitad derecha tiene su reflejo
    const xs = [...full.heavy.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs)).toBeCloseTo(-Math.min(...xs), 1)
    // todo cabe en el fondo (radio 50, contando los puntos de control)
    const all = [...(full.fill + full.heavy).matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)]
    expect(Math.max(...all.map((m) => Math.hypot(Number(m[1]), Number(m[2]))))).toBeLessThan(45)
  })

  it('en lacres chicos se simplifica: sin perlas, filete ni ramas', () => {
    const full = cartouchePaths('full')
    const mid = cartouchePaths('mid')
    const low = cartouchePaths('low')
    expect(mid.beads).toBe('')
    expect(mid.fine).toBe('')
    expect(mid.fill.length).toBeLessThan(full.fill.length)
    expect(low.fill.length).toBeLessThan(mid.fill.length)
    expect(low.heavy).toBe(full.heavy)
  })
})
