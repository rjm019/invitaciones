import { afterEach, describe, expect, it } from 'vitest'
import { bootTheme, setBoot, takeBoot } from '../bootService'

afterEach(() => setBoot(undefined))

describe('bootService', () => {
  it('entrega los datos de la página una sola vez, si son de lo que se pide', () => {
    setBoot({
      kind: 'event',
      key: 'nat',
      data: { event: { slug: 'nat', theme: 'jardin-azul' } },
    })
    expect(bootTheme()).toBe('jardin-azul')
    expect(takeBoot('event', 'otro')).toBeNull()
    expect(takeBoot('invitation', 'nat')).toBeNull()
    expect(takeBoot('event', 'nat')).toEqual({
      event: { slug: 'nat', theme: 'jardin-azul' },
    })
    expect(takeBoot('event', 'nat')).toBeNull() // la segunda vez, a la API
  })

  it('en el panel trae sus colores, y su tema empieza a cargar de inmediato', () => {
    setBoot({
      kind: 'panel',
      key: 'nat',
      data: { brand: { title: 'XV de Nat', theme: 'jardin-azul' } },
    })
    expect(bootTheme()).toBe('jardin-azul')
    expect(takeBoot('panel', 'nat')).toEqual({
      brand: { title: 'XV de Nat', theme: 'jardin-azul' },
    })
  })

  it('ignora lo que no tenga la forma esperada', () => {
    setBoot({ kind: 'otra-cosa', key: 'x', data: {} })
    expect(takeBoot('event', 'x')).toBeNull()
    setBoot('texto')
    expect(bootTheme()).toBeNull()
  })
})
