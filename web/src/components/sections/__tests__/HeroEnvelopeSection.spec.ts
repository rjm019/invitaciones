import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { providePreview, type PreviewOptions } from '@/composables/usePreview'
import type { EventConfig, ResolvedSection } from '@/types/event'
import HeroEnvelopeSection from '../HeroEnvelopeSection.vue'

/** "Reducir movimiento" del sistema, como lo lee useReducedMotion. */
function reduceMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    addEventListener() {},
    removeEventListener() {},
  }))
}

function render(preview: PreviewOptions | null) {
  const section = { decor: { envelope: '/sobre.webp' }, button: 'Toca para abrir' }
  const event = {
    title: 'XV de Ana',
    subtitle: null,
    celebrant: { short_name: 'Ana', full_name: 'Ana' },
    venue: { name: '', city: '' },
  }
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        providePreview(() => preview)
        return () => h(HeroEnvelopeSection, { section: section as unknown as ResolvedSection })
      },
    }),
  )
}

describe('HeroEnvelopeSection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('a un invitado con "reducir movimiento" el sobre ya le llega abierto', () => {
    reduceMotion(true)
    expect(render(null).find('.hero').classes()).toContain('hero--open')
  })

  it('en el gestor ("Ver como invitado") el sobre se ve cerrado y abre sin animación', async () => {
    reduceMotion(true)
    const wrapper = render({ envelopeOpen: false, muted: true })
    expect(wrapper.find('.hero').classes()).toContain('hero--closed')

    await wrapper.find('.hero__open').trigger('click')
    await nextTick()
    expect(wrapper.find('.hero').classes()).toContain('hero--open')
  })

  it('sin "reducir movimiento" abre con su animación; en el editor ya está abierto', async () => {
    reduceMotion(false)
    const guest = render(null)
    expect(guest.find('.hero').classes()).toContain('hero--closed')
    await guest.find('.hero__open').trigger('click')
    expect(guest.find('.hero').classes()).toContain('hero--opening')

    expect(render({ envelopeOpen: true, muted: true }).find('.hero').classes()).toContain(
      'hero--open',
    )
  })
})
