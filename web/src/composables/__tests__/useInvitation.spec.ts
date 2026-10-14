import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

const { sendRsvp, sendDedication } = vi.hoisted(() => ({
  sendRsvp: vi.fn(),
  sendDedication: vi.fn(),
}))
vi.mock('@/services/invitationService', () => ({ sendRsvp, sendDedication }))

import {
  createInvitationContext,
  createPreviewInvitationContext,
  provideInvitation,
  provideInvitationContext,
  useInvitation,
} from '../useInvitation'

const payload = { attending: true, guests: [{ full_name: 'Ana' }], song: null, message: null }

describe('useInvitation', () => {
  it('al enviar, actualiza la invitación y el estado de "enviando"', async () => {
    let release: (v: unknown) => void = () => {}
    sendRsvp.mockReturnValue(new Promise((r) => (release = r)))
    const ctx = createInvitationContext('Abc123Def456')

    const pending = ctx.submit(payload)
    expect(ctx.sending.value).toBe(true)
    release({ status: 'confirmed' })
    await pending

    expect(sendRsvp).toHaveBeenCalledWith('Abc123Def456', payload)
    expect(ctx.invitation.value).toEqual({ status: 'confirmed' })
    expect(ctx.sending.value).toBe(false)
  })

  it('la dedicatoria también actualiza la invitación', async () => {
    const dedication = { name: 'Ana', message: 'Felicidades' }
    sendDedication.mockResolvedValue({ dedication })
    const ctx = createInvitationContext('Abc123Def456')
    await ctx.dedicate(dedication)
    expect(sendDedication).toHaveBeenCalledWith('Abc123Def456', dedication)
    expect(ctx.invitation.value).toEqual({ dedication })
    expect(ctx.sending.value).toBe(false)
  })

  it('si la API rechaza, deja de enviar y pasa el error al formulario', async () => {
    sendRsvp.mockRejectedValue(new Error('cerradas'))
    const ctx = createInvitationContext('Abc123Def456')
    await expect(ctx.submit(payload)).rejects.toThrow('cerradas')
    expect(ctx.sending.value).toBe(false)
    expect(ctx.invitation.value).toBeNull()
  })

  it('las secciones la leen si la página la provee, y null en la invitación general', () => {
    const seen: unknown[] = []
    const Child = defineComponent({
      setup: () => (seen.push(useInvitation()?.token ?? null), () => null),
    })
    const Page = defineComponent({
      setup: () => (provideInvitation('Abc123Def456'), () => h(Child)),
    })

    mount(Page)
    mount(Child)
    expect(seen).toEqual(['Abc123Def456', null])
  })

  it('la invitación de ejemplo de la vista previa confirma sin llamar al servidor', async () => {
    sendRsvp.mockClear()
    const start = {
      label: 'Familia Ejemplo',
      passes: 2,
      guests: [],
      remaining: 2,
      open: true,
      closed_message: null,
      deadline: null,
      dedication: null,
    }
    const ctx = createPreviewInvitationContext(start)

    const updated = await ctx.submit({ attending: true, guests: [{ full_name: 'Ana' }] })
    await ctx.dedicate({ name: 'Ana', message: 'Felicidades' })

    expect(sendRsvp).not.toHaveBeenCalled()
    expect(updated.guests[0]).toMatchObject({ slot: 1, full_name: 'Ana', attending: true })
    expect(ctx.invitation.value?.dedication).toMatchObject({ name: 'Ana', message: 'Felicidades' })

    let seen: unknown = null
    mount(
      defineComponent({
        setup() {
          provideInvitationContext(ctx)
          return () =>
            h(
              defineComponent({
                setup() {
                  seen = useInvitation()
                  return () => null
                },
              }),
            )
        },
      }),
    )
    expect(seen).toBe(ctx)
  })
})
