import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import HeroBow from '../HeroBow.vue'
import MusicMobile from '../MusicMobile.vue'

// La música se simula: un estado que cambia con toggle().
const playing = ref(false)
vi.mock('@/composables/useMusic', () => ({
  useMusic: () => ({
    state: computed(() => ({
      available: true,
      playing: playing.value,
      current: 0,
      duration: 0,
      error: null,
    })),
    play: async () => {
      playing.value = true
    },
    toggle: async () => {
      playing.value = !playing.value
    },
    playerInView: ref(false),
    spotifyHost: () => null,
    attachSpotify: () => {},
  }),
}))

const event = {
  title: 'Baby shower de Emilia',
  subtitle: 'baby shower',
  timezone: 'America/Mexico_City',
  starts_at: '2099-02-20T16:00:00-06:00',
  celebrant: { short_name: 'Emilia', full_name: 'Emilia' },
  venue: { name: 'Jardín', city: 'Querétaro', display_name: 'Jardín' },
  family: [],
  media: { portrait: null },
  locations: [],
  itinerary: [],
  dress_code: { colors: [] },
  gifts: { stores: [], envelope: null },
  music: { spotify_url: null },
  sections: [],
} as unknown as EventConfig

function section(extra: Partial<ResolvedSection>): ResolvedSection {
  return {
    type: 'hero-envelope',
    effects: [],
    visible: true,
    id: 'x',
    decor: {},
    panel: true,
    desktop: 'full',
    ...extra,
  } as ResolvedSection
}

function render(component: Component, s: ResolvedSection) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event),
          resolveAsset: computed(() => (path?: string | null) => (path ? `/m/${path}` : null)),
          sections: computed(() => []),
        })
        return () => h(component, { section: s })
      },
    }),
  )
}

function reduceMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    addEventListener() {},
    removeEventListener() {},
  }))
}

describe('diseños de arrullo (variantes A)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    playing.value = false
  })

  it('portada: cerrada es un medallón amarrado y al tocar empieza a abrir', async () => {
    reduceMotion(false)
    const w = render(HeroBow, section({ title: 'Baby shower', text: 'Te esperamos' }))
    expect(w.find('.hb').classes()).toContain('hb--closed')
    expect(w.find('.hb__title').text()).toBe('Baby shower')
    expect(w.find('.hb__name').text()).toBe('Emilia')
    // el día y la hora salen de la fecha del evento
    expect(w.find('.hb__side--day').text().toLowerCase()).toContain('feb')
    expect(w.find('.hb__side--hour').text().toLowerCase()).toContain('4:00')
    expect(w.findAll('.hb__band')).toHaveLength(4)
    expect(w.find('.hb__bow').exists()).toBe(true)
    expect(w.find('.hb__tap').text()).toBe('Toca el moño')
    await w.find('.hb__tap').trigger('click')
    expect(w.find('.hb').classes()).toContain('hb--opening')
    expect(w.find('.hb__tap').exists()).toBe(false)
    expect(playing.value).toBe(true)
  })

  it('portada: la apertura pasa por sus pasos y termina abierta', async () => {
    reduceMotion(false)
    vi.useFakeTimers()
    const w = render(HeroBow, section({ title: 'Baby shower' }))
    await w.find('.hb__tap').trigger('click')
    expect(w.find('.hb').classes()).toContain('is-untied')
    expect(w.find('.hb').classes()).not.toContain('is-pram')
    await vi.advanceTimersByTimeAsync(3500)
    expect(w.find('.hb').classes()).toContain('is-pram')
    await vi.advanceTimersByTimeAsync(4000)
    expect(w.find('.hb').classes()).toContain('hb--open')
    expect(w.find('.hb__bands').exists()).toBe(false)
  })

  it('portada: con menos movimiento llega abierta, sin bandas ni moño', () => {
    reduceMotion(true)
    const w = render(HeroBow, section({ title: 'Baby shower' }))
    expect(w.find('.hb').classes()).toContain('hb--open')
    expect(w.find('.hb').classes()).toContain('is-goose')
    expect(w.find('.hb__bands').exists()).toBe(false)
    expect(w.find('.hb__tap').exists()).toBe(false)
    expect(w.find('.hb__name').text()).toBe('Emilia')
  })

  it('música: la luna es un botón con aria-pressed que alterna y el móvil gira al sonar', async () => {
    const w = render(MusicMobile, section({ type: 'music-player', title: 'Arrullo', text: 'Canción de cuna' }))
    const moon = w.find('.mb__moon')
    expect(moon.attributes('aria-pressed')).toBe('false')
    expect(moon.attributes('aria-label')).toBe('Reproducir')
    expect(w.find('.cm').classes()).not.toContain('is-playing')
    await moon.trigger('click')
    expect(moon.attributes('aria-pressed')).toBe('true')
    expect(moon.attributes('aria-label')).toBe('Pausar')
    expect(w.find('.cm').classes()).toContain('is-playing')
    expect(w.find('.mb__title').text()).toBe('Arrullo')
    expect(w.find('.mb__song').text()).toBe('Canción de cuna')
  })
})
