import { describe, expect, it } from 'vitest'
import { seededRandom } from '@/services/effectsService'
import {
  monogramInitials,
  monogramLayout,
  waxBlobPath,
  waxEdgePath,
  wreathPaths,
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

describe('wreathPaths', () => {
  it('da hojas, bayas y perlas (relleno) y tallos con volutas (trazo), simétricos', () => {
    const w = wreathPaths(50, 50, 23, 23)
    expect(w.fill).toMatch(/^M/)
    expect(w.stroke).toMatch(/^M/)
    expect(w.fill.split('M').length).toBeGreaterThan(60)
    expect(wreathPaths(50, 50, 23, 23)).toEqual(w)
  })
})
