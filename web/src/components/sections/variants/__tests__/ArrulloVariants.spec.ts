import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, ref, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import HeroBow from '../HeroBow.vue'
import MusicMobile from '../MusicMobile.vue'
import BlessingMedallion from '../BlessingMedallion.vue'
import QuoteCloud from '../QuoteCloud.vue'
import SaveTheDateBalloons from '../SaveTheDateBalloons.vue'
import CountdownBlocks from '../CountdownBlocks.vue'
import PhotoPortrait from '../PhotoPortrait.vue'
import GalleryMedallions from '../GalleryMedallions.vue'
import LocationPath from '../LocationPath.vue'
import ItineraryClothesline from '../ItineraryClothesline.vue'

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

  it('foto: el óvalo cuelga de un moño con su título y su texto', () => {
    const w = render(
      PhotoPortrait,
      section({ type: 'photo-arch', image: '/m/foto.jpg', title: 'Emilia', text: 'Ya casi llega' }),
    )
    expect(w.find('.pp__bow').exists()).toBe(true)
    expect(w.findAll('.pp__strap')).toHaveLength(2)
    expect(w.find('.pp__photo').attributes('src')).toBe('/m/foto.jpg')
    expect(w.find('.pp__title').text()).toBe('Emilia')
    expect(w.find('.pp__text').text()).toBe('Ya casi llega')
    // sin foto el óvalo queda vacío
    const empty = render(PhotoPortrait, section({ type: 'photo-arch' }))
    expect(empty.find('.pp__photo').exists()).toBe(false)
    expect(empty.find('.pp__oval').exists()).toBe(true)
  })

  it('galería: cada foto es un botón con etiqueta y tocarla abre el visor', async () => {
    const photos = [1, 2, 3].map((n) => ({ photo: `g${n}.jpg`, caption: `Foto ${n}` }))
    const w = render(
      GalleryMedallions,
      section({ type: 'gallery', title: 'Galería', photos } as Partial<ResolvedSection>),
    )
    const buttons = w.findAll('button.gm__oval')
    expect(buttons).toHaveLength(3)
    expect(buttons[1]!.attributes('aria-label')).toBe('Foto 2')
    expect(w.findAll('.gm__item')[0]!.classes()).toContain('is-short')
    expect(w.findAll('.gm__item')[1]!.classes()).toContain('is-long')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await buttons[1]!.trigger('click')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    w.unmount()
  })

  it('ubicación: un caminito y un botón "Ver ubicación" por lugar', async () => {
    const places = [
      { label: 'Ceremonia', name: 'Jardín', time: '16:00', address: 'Calle 1', maps_url: 'https://m/1' },
      { label: 'Recepción', name: 'Salón', time: '18:00', address: 'Calle 2', maps_url: 'https://m/2' },
    ]
    reduceMotion(true)
    const w = render(
      LocationPath,
      section({ type: 'location', title: 'Dónde', places } as Partial<ResolvedSection>),
    )
    expect(w.findAll('.lpa__place')).toHaveLength(2)
    expect(w.findAll('.lpa__road')).toHaveLength(2)
    expect(w.findAll('.lpa__pram')).toHaveLength(2)
    expect(w.findAll('a.lpa__button')).toHaveLength(2)
    expect(w.findAll('.lpa__name')[1]!.text()).toBe('Salón')
    expect(w.findAll('.lpa__time')[0]!.text()).toContain('4:00')
    // con menos movimiento el camino llega completo
    await nextTick()
    expect(w.findAll('.lpa__road')[0]!.classes()).toContain('is-done')
    expect(w.findAll('.lpa__dot').length).toBeGreaterThan(20)
  })

  it('itinerario: una prenda por momento, con sus pinzas y su etiqueta de hora', () => {
    const original = event.itinerary
    event.itinerary = [
      { time: '16:00', label: 'Bienvenida' },
      { time: '17:00', label: 'Juegos' },
      { time: '18:00', label: 'Comida' },
      { time: '19:00', label: 'Pastel' },
      { time: '20:00', label: 'Regalos' },
      { time: '21:00', label: 'Despedida' },
    ]
    const w = render(ItineraryClothesline, section({ type: 'itinerary', title: 'Programa' }))
    expect(w.findAll('.ic__stop')).toHaveLength(6)
    expect(w.findAll('.ic__img')).toHaveLength(6)
    expect(w.findAll('.ic__peg')).toHaveLength(12)
    // las prendas se turnan: la sexta vuelve a ser la primera
    expect(w.findAll('.ic__img')[5]!.attributes('src')).toBe('/m/ropita-1.svg')
    expect(w.findAll('.ic__img')[2]!.attributes('src')).toBe('/m/ropita-3.svg')
    expect(w.findAll('.ic__tag')[0]!.text().toLowerCase()).toContain('4:00')
    expect(w.findAll('.ic__label')[3]!.text()).toBe('Pastel')
    expect(w.findAll('.ic__stop')[0]!.classes()).toContain('is-left')
    expect(w.findAll('.ic__stop')[1]!.classes()).toContain('is-right')
    // sin "línea que se llena" no hay caída de entrada
    expect(w.find('.ic').classes()).not.toContain('ic--drop')
    event.itinerary = original
  })
})
