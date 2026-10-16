import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useSectionComponents } from '../useSectionComponents'

const Base = defineComponent({ name: 'BaseSection', render: () => null })
const Ticket = defineComponent({ name: 'TicketSection', render: () => null })
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useSectionComponents', () => {
  it('descarga el diseño alterno una sola vez y espera a tenerlo', async () => {
    const load = vi.fn(() => Promise.resolve({ default: Ticket }))
    const sections = ref([
      { type: 'save-the-date', variant: 'boleto' },
      { type: 'save-the-date', variant: 'boleto' },
      { type: 'quote', variant: null },
    ])
    const { ready, componentFor } = useSectionComponents(
      () => sections.value,
      { 'save-the-date': { boleto: load } },
      { 'save-the-date': Base, quote: Base },
    )
    expect(ready.value).toBe(false)
    // Mientras tanto, el de siempre.
    expect(componentFor(sections.value[0])).toBe(Base)
    await flush()
    expect(ready.value).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
    expect(componentFor(sections.value[0])).toBe(Ticket)
    expect(componentFor(sections.value[2])).toBe(Base)
  })

  it('una variante sin diseño alterno, o que no se pudo descargar, usa el de siempre', async () => {
    const { ready, componentFor } = useSectionComponents(
      () => [
        { type: 'quote', variant: 'clasica' },
        { type: 'save-the-date', variant: 'boleto' },
      ],
      { 'save-the-date': { boleto: () => Promise.reject(new Error('sin red')) } },
      { 'save-the-date': Base, quote: Base },
    )
    await flush()
    expect(ready.value).toBe(true)
    expect(componentFor({ type: 'quote', variant: 'clasica' })).toBe(Base)
    expect(componentFor({ type: 'save-the-date', variant: 'boleto' })).toBe(Base)
  })
})
