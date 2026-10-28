import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { providePreview } from '@/composables/usePreview'
import type { EventConfig, ResolvedSection } from '@/types/event'
import GiftsFlip from '../GiftsFlip.vue'
import ItinerarySeal from '../ItinerarySeal.vue'
import LocationStationery from '../LocationStationery.vue'
import StoryTimeline from '../StoryTimeline.vue'

const envelope = {
  title: 'Transferencia',
  text: '',
  bank: 'Banco Ejemplo',
  account: '123456789012345678',
  holder: 'Isabella Ruiz',
  box: false,
  hidden: false,
  private: true,
}

const baseEvent = {
  title: 'Isabella & Mateo',
  celebrant: { full_name: 'Isabella & Mateo', short_name: 'Isabella & Mateo', monogram: 'I M' },
  starts_at: '2027-10-23T17:00:00-06:00',
  timezone: 'America/Mexico_City',
  venue: { name: 'Hacienda', display_name: 'Hacienda', city: '', address: '', maps_url: '' },
  itinerary: [
    { time: '17:00', label: 'Ceremonia religiosa' },
    { time: '22:00', label: 'Primer baile' },
    { time: '2:00', label: 'Tornaboda' },
  ],
  locations: [
    {
      label: 'Ceremonia',
      name: 'Parroquia',
      time: '17:00',
      address: '',
      maps_url: '',
      photo: null,
      kind: 'religious',
    },
    {
      label: 'Recepción',
      name: 'Hacienda',
      time: '19:00',
      address: '',
      maps_url: '',
      photo: null,
      kind: 'reception',
    },
  ],
  gifts: {
    stores: [
      {
        store: 'liverpool',
        name: 'Liverpool',
        note: '',
        url: 'https://example.com',
        event_number: '51234567',
      },
      { store: 'amazon', name: 'Amazon', note: '', url: '', event_number: 'ABC123' },
    ],
    envelope,
  },
  sections: [],
}

function render(component: Component, section: Partial<ResolvedSection>, event = baseEvent) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => (path ? `/${path}` : null)),
          sections: computed(() => [] as ResolvedSection[]),
        })
        providePreview(() => null)
        return () =>
          h(component, {
            section: { id: 's', decor: {}, effects: [], ...section } as ResolvedSection,
          })
      },
    }),
    { attachTo: document.body },
  )
}

describe('piezas interactivas del tema lacre', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('la historia en línea de tiempo cambia de momento con clic y con las flechas', async () => {
    const wrapper = render(StoryTimeline, {
      type: 'story',
      title: 'Nuestra historia',
      moments: [
        { year: '2017', title: 'El libro' },
        { year: '2020', title: 'Canelo' },
        { year: '2026', title: 'La pregunta' },
      ],
    })
    const tabs = () => wrapper.findAll('[role="tab"]')
    expect(tabs()).toHaveLength(3)
    expect(tabs()[0]!.attributes('aria-selected')).toBe('true')
    await tabs()[1]!.trigger('click')
    expect(tabs()[1]!.attributes('aria-selected')).toBe('true')
    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'End' })
    expect(tabs()[2]!.attributes('aria-selected')).toBe('true')
    const panels = wrapper.findAll('[role="tabpanel"]')
    expect(panels[2]!.attributes('inert')).toBeUndefined()
    expect(panels[0]!.attributes('inert')).toBeDefined()
    wrapper.unmount()
  })

  it('las tarjetas de regalo esconden los datos hasta que se voltean', async () => {
    const wrapper = render(GiftsFlip, { type: 'gifts', title: 'Mesa de regalos' })
    const toggle = wrapper.find('.gf__toggle')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('.gf__face--back').attributes('inert')).toBeDefined()
    expect(wrapper.text()).toContain('Número de lista')
    await toggle.trigger('click')
    await nextTick()
    expect(wrapper.find('.gf__card').classes()).toContain('is-open')
    expect(wrapper.find('.gf__toggle').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.gf__face--back').attributes('inert')).toBeUndefined()
    wrapper.unmount()
  })

  it('por el enlace general la transferencia no se voltea', () => {
    const hidden = {
      ...baseEvent,
      gifts: {
        ...baseEvent.gifts,
        envelope: { ...envelope, bank: '', account: '', holder: '', hidden: true },
      },
    }
    const wrapper = render(GiftsFlip, { type: 'gifts' }, hidden)
    const wide = wrapper.find('.gf__item--wide')
    expect(wide.find('.gf__toggle').exists()).toBe(false)
    expect(wide.text()).toContain('invitación personal')
    wrapper.unmount()
  })

  it('el itinerario con sello pone un dibujo por momento y el lacre en el hilo', () => {
    const wrapper = render(ItinerarySeal, { type: 'itinerary', title: 'Itinerario' })
    expect(wrapper.findAll('.isl__stop')).toHaveLength(3)
    expect(wrapper.findAll('.isl__drawing')).toHaveLength(3)
    expect(wrapper.find('.isl__seal .seal').exists()).toBe(true)
    wrapper.unmount()
  })

  it('con dibujo_vivo la ubicación pinta la iglesia y la hacienda en línea', () => {
    const wrapper = render(LocationStationery, {
      type: 'location',
      layout: 'side',
      effects: ['living-drawing'],
    })
    expect(wrapper.findAll('svg.ll')).toHaveLength(2)
    expect(wrapper.findAll('.ll-bell').length).toBeGreaterThan(0)
    const still = render(LocationStationery, { type: 'location' })
    expect(still.findAll('svg.ll')).toHaveLength(0)
    wrapper.unmount()
    still.unmount()
  })
})
