import { afterEach, describe, expect, it } from 'vitest'
import { bootTheme, setBoot, takeBoot } from '../bootService'

afterEach(() => setBoot(undefined))

describe('bootService', () => {
  it('entrega los datos de la página una sola vez, si son de lo que se pide', () => {
    setBoot({
      kind: 'event',
      key: 'natasha',
      data: { event: { slug: 'natasha', theme: 'jardin-azul' } },
    })
    expect(bootTheme()).toBe('jardin-azul')
    expect(takeBoot('event', 'otro')).toBeNull()
    expect(takeBoot('invitation', 'natasha')).toBeNull()
    expect(takeBoot('event', 'natasha')).toEqual({
      event: { slug: 'natasha', theme: 'jardin-azul' },
    })
    expect(takeBoot('event', 'natasha')).toBeNull() // la segunda vez, a la API
  })

  it('ignora lo que no tenga la forma esperada', () => {
    setBoot({ kind: 'otra-cosa', key: 'x', data: {} })
    expect(takeBoot('event', 'x')).toBeNull()
    setBoot('texto')
    expect(bootTheme()).toBeNull()
  })
})
