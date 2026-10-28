import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDedicationWall, MAX_WALL_ENTRIES, parseWall } from '../dedicationWallService'
import { http } from '../http'

describe('parseWall', () => {
  it('deja solo nombre y mensaje bien formados', () => {
    expect(
      parseWall({
        dedications: [
          { name: ' Ana ', message: 'Hola', token: 'secreto' },
          { name: 'Sin mensaje', message: '  ' },
          { name: 3, message: 'x' },
          null,
        ],
      }),
    ).toEqual([{ name: 'Ana', message: 'Hola' }])
  })

  it('acepta cualquier cosa sin romperse y acota el total', () => {
    expect(parseWall(null)).toEqual([])
    expect(parseWall({ dedications: 'x' })).toEqual([])
    const many = Array.from({ length: MAX_WALL_ENTRIES + 10 }, (_, i) => ({ name: `N${i}`, message: 'm' }))
    expect(parseWall({ dedications: many })).toHaveLength(MAX_WALL_ENTRIES)
  })
})

describe('getDedicationWall', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('pide por el enlace personal si hay token, si no por el evento', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: { dedications: [{ name: 'A', message: 'm' }] } })
    expect(await getDedicationWall('nat', 'Tok')).toHaveLength(1)
    expect(get).toHaveBeenLastCalledWith('/public/invitations/Tok/dedications')
    await getDedicationWall('nat')
    expect(get).toHaveBeenLastCalledWith('/public/events/nat/dedications')
  })

  it('con 404 (muro apagado) o sin conexión, lista vacía', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('404'))
    expect(await getDedicationWall('nat')).toEqual([])
  })
})
