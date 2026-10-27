import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { providePreview, type PreviewOptions } from '@/composables/usePreview'
import { sectionVariants } from '@/components/sectionVariants'
import type { EventConfig, ResolvedSection } from '@/types/event'
import HeroCenterEnvelope from '../HeroCenterEnvelope.vue'

function reduceMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    addEventListener() {},
    removeEventListener() {},
  }))
}

function render(preview: PreviewOptions | null, decor: Record<string, string | null> = {}) {
  const section = { decor, button: 'Toca para abrir' }
  const event = {
    title: 'Boda de Ana y Luis',
    subtitle: 'nos casamos',
    celebrant: { short_name: 'Ana y Luis', full_name: 'Ana y Luis' },
    venue: { name: 'Hacienda', city: 'San Miguel' },
  }
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        providePreview(() => preview)
        return () => h(HeroCenterEnvelope, { section: section as unknown as ResolvedSection })
      },
    }),
  )
}

describe('portada sobre-central', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('es un diseño de portada registrado', () => {
    expect(sectionVariants['hero-envelope']['sobre-central']).toBeTypeOf('function')
  })

  it('cerrado: costura con perla, dos mitades y la tarjeta adentro con el nombre', () => {
    reduceMotion(false)
    const wrapper = render(null)
    expect(wrapper.find('.ce-hero').classes()).toContain('ce-hero--closed')
    expect(wrapper.find('.ce-hero__top').exists()).toBe(true)
    expect(wrapper.find('.ce-hero__bottom').exists()).toBe(true)
    expect(wrapper.find('.ce-hero__pearl').exists()).toBe(true)
    expect(wrapper.find('.ce-hero__name').text()).toBe('Ana y Luis')
    expect(wrapper.find('.ce-hero__call').text()).toBe('Toca para abrir')
  })

  it('con lacre en la ranura usa su imagen en vez de la perla', () => {
    reduceMotion(false)
    const wrapper = render(null, { seal: '/lacre.svg' })
    expect(wrapper.find('.ce-hero__seal img').attributes('src')).toBe('/lacre.svg')
    expect(wrapper.find('.ce-hero__pearl').exists()).toBe(false)
  })

  it('al tocar empieza a abrir (la mitad de arriba gira); con "reducir movimiento" ya llega abierto', async () => {
    reduceMotion(false)
    const guest = render(null)
    await guest.find('.ce-hero__call').trigger('click')
    expect(guest.find('.ce-hero').classes()).toContain('ce-hero--opening')

    reduceMotion(true)
    const calm = render(null)
    expect(calm.find('.ce-hero').classes()).toContain('ce-hero--open')
    expect(calm.find('.ce-hero__top').exists()).toBe(false)
    expect(calm.find('.ce-hero__name').exists()).toBe(true)
  })

  it('en el gestor se ve cerrado en "Ver como invitado" y abre sin animación', async () => {
    reduceMotion(true)
    const wrapper = render({ envelopeOpen: false, muted: true })
    expect(wrapper.find('.ce-hero').classes()).toContain('ce-hero--closed')
    await wrapper.find('.ce-hero__call').trigger('click')
    await nextTick()
    expect(wrapper.find('.ce-hero').classes()).toContain('ce-hero--open')

    expect(render({ envelopeOpen: true, muted: true }).find('.ce-hero').classes()).toContain(
      'ce-hero--open',
    )
  })
})
