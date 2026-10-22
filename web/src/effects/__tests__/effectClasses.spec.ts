import { describe, expect, it } from 'vitest'
import css from '../effects.css?raw'
import types from '@/types/event.ts?raw'

/** Los nombres de EffectName (types/event.ts). */
function effectNames(): string[] {
  const block = types.slice(types.indexOf('export type EffectName'), types.indexOf('/** Forma de las orillas'))
  return [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
}

describe('effects.css', () => {
  it('ninguna regla le da estilo directo a .fx-<efecto>: esa clase es de la sección entera', () => {
    // SectionShell pone fx-<efecto> en la sección; una regla ".fx-taxi { … }" movería la
    // sección completa (así pasó con el taxi). Las piezas de un efecto van con otro nombre
    // (fx-taxi-car) o como descendientes (.fx-float .decor-float).
    const names = effectNames()
    expect(names.length).toBeGreaterThan(10)
    const bare = names.filter((name) =>
      new RegExp(`(^|[,}\\s])\\.fx-${name}\\s*[,{]`, 'm').test(css),
    )
    expect(bare).toEqual([])
  })
})
