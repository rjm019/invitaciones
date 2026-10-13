import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../http', () => ({ http: { get, post } }))

import { getInvitation, sendDedication, sendRsvp } from '../invitationService'

describe('invitationService', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('pide la invitación por su token', async () => {
    get.mockResolvedValue({ data: { event: { slug: 'x' }, invitation: { passes: 2 } } })
    await expect(getInvitation('Abc123Def456')).resolves.toEqual({
      event: { slug: 'x' },
      invitation: { passes: 2 },
    })
    expect(get).toHaveBeenCalledWith('/public/invitations/Abc123Def456')
  })

  it('codifica el token (nunca arma rutas con lo que venga en la URL)', async () => {
    get.mockResolvedValue({ data: {} })
    await getInvitation('../x')
    expect(get).toHaveBeenCalledWith('/public/invitations/..%2Fx')
  })

  it('envía solo los nombres nuevos y devuelve la invitación actualizada', async () => {
    post.mockResolvedValue({ data: { invitation: { remaining: 1 } } })
    const payload = { attending: true, guests: [{ full_name: 'Ana' }] }
    await expect(sendRsvp('Abc123Def456', payload)).resolves.toEqual({ remaining: 1 })
    expect(post).toHaveBeenCalledWith('/public/invitations/Abc123Def456/rsvp', payload)
  })

  it('manda la dedicatoria del enlace y devuelve la invitación con ella', async () => {
    const dedication = { name: 'Ana', message: '¡Felicidades!' }
    post.mockResolvedValue({ data: { invitation: { dedication } } })
    await expect(sendDedication('Abc123Def456', dedication)).resolves.toEqual({ dedication })
    expect(post).toHaveBeenCalledWith('/public/invitations/Abc123Def456/dedication', dedication)
  })
})
