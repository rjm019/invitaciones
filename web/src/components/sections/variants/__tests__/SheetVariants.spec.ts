import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { sectionVariants } from '@/components/sectionVariants'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import EnvelopeRainSheet from '../EnvelopeRainSheet.vue'
import QuoteSheet from '../QuoteSheet.vue'

function render(component: unknown, section: Record<string, unknown>, event: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        return () => h(component as never, { section: { decor: {}, effects: [], ...section } as unknown as ResolvedSection })
      },
    }),
  )
}

describe('variantes lamina', () => {
  it('están registradas', () => {
    expect(sectionVariants.quote.lamina).toBeTypeOf('function')
    expect(sectionVariants['envelope-rain'].lamina).toBeTypeOf('function')
  })

  it('la frase va dentro de la lámina con su zona segura', () => {
    const w = render(QuoteSheet, {
      text: 'Hoy comienza',
      decor: { sheet: '/papel.webp' },
      sheet: { aspect: 0.7, top: 25 },
    })
    expect(w.find('img').attributes('src')).toBe('/papel.webp')
    expect(w.find('[data-text="text"]').text()).toBe('Hoy comienza')
    expect(w.find('.sheet').attributes('style')).toContain('--sheet-top: 25%')
  })

  it('la frase sin imagen cae a la tarjeta lisa', () => {
    const w = render(QuoteSheet, { text: 'Hola' })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.sheet--plain').exists()).toBe(true)
  })

  it('la lluvia de sobres lleva el título en la lámina y la cuenta fuera', () => {
    const w = render(
      EnvelopeRainSheet,
      { decor: { sheet: '/papel.webp' } },
      { envelope: { title: 'Lluvia', text: 'Gracias', bank: 'BBVA', account: '012345678901234567', holder: 'Ana', box: true } },
    )
    const sheet = w.find('.sheet')
    expect(sheet.find('[data-text="title"]').text()).toBe('Lluvia')
    expect(sheet.find('[data-text="text"]').text()).toBe('Gracias')
    expect(sheet.find('[data-text="account"]').exists()).toBe(false)
    expect(w.find('[data-text="account"]').text()).toContain('0123 4567 8901 2345 67')
    expect(w.text()).toContain('caja para sobres')
  })

  it('sin cuenta avisa que viene en la invitación personal', () => {
    const w = render(EnvelopeRainSheet, {}, { envelope: { title: 'Lluvia', hidden: true } })
    expect(w.text()).toContain('invitación personal')
  })
})
