import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import HeroBow from '../HeroBow.vue'
import MusicMobile from '../MusicMobile.vue'
import BlessingMedallion from '../BlessingMedallion.vue'
import QuoteCloud from '../QuoteCloud.vue'
import SaveTheDateBalloons from '../SaveTheDateBalloons.vue'
import CountdownBlocks from '../CountdownBlocks.vue'

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
  family: [
    { role: 'Mis papás', names: ['Sofía', 'Andrés'] },
    { role: 'Mis padrinos', names: ['Lucía'] },
  ],
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

  it('bendición: el medallón lleva el moñito, el texto y los grupos', () => {
    const w = render(BlessingMedallion, section({ type: 'blessing', title: 'Con amor', text: 'Gracias' }))
    expect(w.find('.bm__bow').exists()).toBe(true)
    expect(w.find('.bm__title').text()).toBe('Con amor')
    expect(w.find('.bm__text').text()).toBe('Gracias')
    expect(w.findAll('.bm__group')).toHaveLength(2)
    expect(w.find('.bm__role').text()).toBe('Mis papás')
    expect(w.find('.bm').classes()).not.toContain('bm--long')
  })

  it('bendición: con muchos grupos el óvalo se alarga', () => {
    const w = render(BlessingMedallion, section({ type: 'blessing', text: 'Gracias' }))
    expect(w.find('.bm').classes()).not.toContain('bm--long')
    event.family.push({ role: 'Abuelos', names: ['A'] } as never)
    const long = render(BlessingMedallion, section({ type: 'blessing' }))
    expect(long.find('.bm').classes()).toContain('bm--long')
    event.family.pop()
  })

  it('frase: va dentro de la nube con sus nubes y estrellas', () => {
    const w = render(QuoteCloud, section({ type: 'quote', text: 'Un nuevo capítulo', title: 'Sofía' }))
    expect(w.find('.qc__text').text()).toBe('Un nuevo capítulo')
    expect(w.find('.qc__author').text()).toBe('Sofía')
    expect(w.findAll('.qc__puff').length).toBeGreaterThanOrEqual(2)
    expect(w.findAll('.qc__star').length).toBeGreaterThanOrEqual(2)
    expect(w.findAll('.qc__lobe').length).toBeGreaterThan(4)
  })

  it('fecha: el día va en el globo grande, el mes y la hora en los otros', () => {
    const w = render(SaveTheDateBalloons, section({ type: 'save-the-date', title: 'Guarda la fecha' }))
    expect(w.find('.sb__balloon--day .sb__day').text()).toBe('20')
    expect(w.find('.sb__balloon--month').text().toLowerCase()).toBe('feb')
    expect(w.find('.sb__balloon--hour').text().toLowerCase()).toContain('4:00')
    expect(w.findAll('.sb__string path')).toHaveLength(3)
    expect(w.find('.calendar').exists()).toBe(true)
    expect(w.find('.sb__add').attributes('href')).toContain('calendar')
  })

  it('cuenta regresiva: el cubo que cambia recibe la clase de giro', async () => {
    reduceMotion(false)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-02-19T10:00:00-06:00'))
    const w = render(CountdownBlocks, section({ type: 'countdown', title: 'Falta poco' }))
    expect(w.findAll('.cb__cube')).toHaveLength(4)
    expect(w.findAll('.cb__cube.is-turning')).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1000)
    // cambian los segundos: solo el último cubo gira
    expect(w.findAll('.cb__cube')[3]!.classes()).toContain('is-turning')
    expect(w.findAll('.cb__cube')[0]!.classes()).not.toContain('is-turning')
    expect(w.findAll('.cb__cube')[3]!.find('.cb__spin').attributes('style')).toContain('--turn: 1')
    await vi.advanceTimersByTimeAsync(900)
    expect(w.findAll('.cb__cube')[3]!.classes()).not.toContain('is-turning')
  })
})
