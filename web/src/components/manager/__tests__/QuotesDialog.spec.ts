import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Quote } from '@/types/design'

// La sesión del gestor se lee al cargar su módulo: tiene que estar antes de los imports.
const api = vi.hoisted(() => {
  localStorage.setItem(
    'gestor:sesion',
    JSON.stringify({
      token: 'tok',
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      user: { username: 'ana', name: 'Ana', role: 'admin', active: true },
    }),
  )
  return {
    listQuotes: vi.fn(),
    updateQuote: vi.fn(),
    deleteQuote: vi.fn(),
    exportQuotes: vi.fn(),
  }
})
vi.mock('@/services/managerService', () => api)

import QuotesDialog from '../QuotesDialog.vue'

const quote = (over: Partial<Quote> = {}): Quote => ({
  id: '1',
  created_at: '2026-10-15T18:30:00-06:00',
  name: 'Valeria Ruiz',
  phone: '+525512345678',
  type: 'boda',
  event_date: '2027-03-20',
  idea: 'Muchas flores',
  page: '/invitaciones-digitales-boda',
  status: 'nueva',
  note: null,
  handled_by: null,
  updated_at: null,
  ...over,
})

describe('QuotesDialog', () => {
  beforeEach(() => Object.values(api).forEach((m) => m.mockReset()))

  it('lista las cotizaciones, escribe por WhatsApp y marca en qué va', async () => {
    api.listQuotes.mockResolvedValue({
      quotes: [quote(), quote({ id: '2', name: null, status: 'cerrada', type: 'xv' })],
      new: 1,
    })
    api.updateQuote.mockImplementation((_t: string, id: string, changes: object) =>
      Promise.resolve(quote({ id, ...changes, handled_by: 'ana' })),
    )
    const wrapper = mount(QuotesDialog, { props: { open: true }, attachTo: document.body })
    await flushPromises()

    // "En curso" esconde las cerradas.
    expect(wrapper.findAll('.quote')).toHaveLength(1)
    expect(wrapper.text()).toContain('Valeria Ruiz')
    expect(wrapper.text()).toContain('55 1234 5678 · Boda')
    expect(wrapper.emitted('changed')?.[0]).toEqual([1])

    const wa = wrapper.get('a[href^="https://wa.me/525512345678"]')
    await wa.trigger('click')
    await flushPromises()
    expect(api.updateQuote).toHaveBeenCalledWith('tok', '1', { status: 'contactada' })

    await wrapper.get('textarea').setValue('Quiere dorado')
    await wrapper.get('textarea').trigger('blur')
    await flushPromises()
    expect(api.updateQuote).toHaveBeenLastCalledWith('tok', '1', { note: 'Quiere dorado' })

    // "Todas" muestra también la cerrada.
    await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
    expect(wrapper.findAll('.quote')).toHaveLength(2)
    wrapper.unmount()
  })

  it('borra solo después de confirmar', async () => {
    api.listQuotes.mockResolvedValue({ quotes: [quote()], new: 1 })
    api.deleteQuote.mockResolvedValue(undefined)
    const wrapper = mount(QuotesDialog, { props: { open: true }, attachTo: document.body })
    await flushPromises()

    await wrapper.get('.quote__delete').trigger('click')
    expect(api.deleteQuote).not.toHaveBeenCalled()
    await wrapper.get('.g-btn--danger').trigger('click')
    await flushPromises()
    expect(api.deleteQuote).toHaveBeenCalledWith('tok', '1')
    expect(wrapper.findAll('.quote')).toHaveLength(0)
    wrapper.unmount()
  })
})
