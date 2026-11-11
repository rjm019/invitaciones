import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { sectionVariants } from '@/components/sectionVariants'
import type { EventConfig, ResolvedSection } from '@/types/event'
import BlessingRetablo from '../BlessingRetablo.vue'
import CountdownTiles from '../CountdownTiles.vue'
import HeroPapelPicado from '../HeroPapelPicado.vue'
import MusicMariachi from '../MusicMariachi.vue'
import PhotoNicho from '../PhotoNicho.vue'
import QuotePicado from '../QuotePicado.vue'
import SaveTheDateLoteria from '../SaveTheDateLoteria.vue'

const event = {
  title: 'Boda de Mariana y Diego',
  subtitle: 'nos casamos',
  timezone: 'America/Mexico_City',
  starts_at: '2099-10-23T17:00:00-06:00',
  celebrant: { short_name: 'Mariana y Diego', full_name: 'Mariana y Diego' },
  venue: { name: 'Hacienda', city: 'San Miguel', display_name: 'Hacienda Los Arcos' },
  family: [
    { role: 'Mis papás', names: ['Ana', 'Luis'] },
    { role: 'Padrinos', names: ['Rosa'] },
  ],
  media: { portrait: '/foto.jpg' },
  music: { spotify_url: null },
  sections: [],
} as unknown as EventConfig

function section(extra: Partial<ResolvedSection>): ResolvedSection {
  return {
    type: 'blessing',
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

describe('diseños de la fiesta (variantes A)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('están registrados en su sección', () => {
    expect(sectionVariants['hero-envelope']['papel-picado']).toBeTypeOf('function')
    expect(sectionVariants['music-player'].mariachi).toBeTypeOf('function')
    expect(sectionVariants.blessing.retablo).toBeTypeOf('function')
    expect(sectionVariants['save-the-date'].loteria).toBeTypeOf('function')
    expect(sectionVariants.countdown.azulejos).toBeTypeOf('function')
    expect(sectionVariants['photo-arch'].nicho).toBeTypeOf('function')
    expect(sectionVariants.quote.picado).toBeTypeOf('function')
  })

  it('portada: cerrada tapa la escena con tres hileras y al tocar empieza a abrir', async () => {
    reduceMotion(false)
    const w = render(HeroPapelPicado, section({ type: 'hero-envelope', button: 'Toca para abrir' }))
    expect(w.find('.pp-hero').classes()).toContain('pp-hero--closed')
    expect(w.findAll('.pp-hero__row')).toHaveLength(3)
    expect(w.find('.pp-hero__name').text()).toBe('Mariana y Diego')
    expect(w.find('.pp-hero__date').text()).toContain('octubre')
    await w.find('.pp-hero__call').trigger('click')
    expect(w.find('.pp-hero').classes()).toContain('pp-hero--opening')
  })

  it('portada: con menos movimiento llega abierta, sin hileras', () => {
    reduceMotion(true)
    const w = render(HeroPapelPicado, section({ type: 'hero-envelope' }))
    expect(w.find('.pp-hero').classes()).toContain('pp-hero--open')
    expect(w.find('.pp-hero__row').exists()).toBe(false)
    expect(w.find('.pp-hero__call').exists()).toBe(false)
  })

  it('música: el trío va en línea con sus tres músicos y un botón de play con aria-pressed', () => {
    const w = render(MusicMariachi, section({ type: 'music-player', title: 'Dale play' }))
    expect(w.find('#musico-1').exists()).toBe(true)
    expect(w.find('#musico-3').exists()).toBe(true)
    const play = w.find('.mm__play')
    expect(play.attributes('aria-pressed')).toBe('false')
    expect(play.attributes('aria-label')).toBe('Reproducir la música')
    expect(w.find('.mm__title').text()).toBe('Dale play')
  })

  it('bendición: mensaje, papás y padrinos en el nicho', () => {
    const w = render(BlessingRetablo, section({ title: 'Bendición', text: 'Con la bendición de Dios' }))
    expect(w.find('.br__text').text()).toBe('Con la bendición de Dios')
    expect(w.findAll('.br__group')).toHaveLength(2)
    expect(w.find('.br__heart').attributes('src')).toBe('/m/corazon-sagrado.svg')
  })

  it('fecha: la carta muestra el día y se voltea al tocarla', async () => {
    reduceMotion(false)
    const w = render(SaveTheDateLoteria, section({ type: 'save-the-date', title: 'El gran día' }))
    expect(w.find('.lt__day').text()).toBe('23')
    expect(w.find('.lt__ribbon').text()).toBe('El gran día')
    expect(w.find('.lt__card').classes()).not.toContain('is-flipped')
    expect(w.find('.lt__face--back').attributes('inert')).toBeDefined()
    await w.find('.lt__flip').trigger('click')
    expect(w.find('.lt__card').classes()).toContain('is-flipped')
    expect(w.find('.lt__flip').attributes('aria-pressed')).toBe('true')
    expect(w.find('.lt__face--front').attributes('inert')).toBeDefined()
    expect(w.find('table.calendar').exists()).toBe(true)
  })

  it('cuenta regresiva: cuatro azulejos con sus etiquetas', () => {
    const w = render(CountdownTiles, section({ type: 'countdown', title: 'Faltan' }))
    expect(w.findAll('.ct__tile')).toHaveLength(4)
    expect(w.findAll('.ct__label').map((l) => l.text())).toEqual([
      'Días',
      'Horas',
      'Minutos',
      'Segundos',
    ])
    expect(w.find('.ct__title').text()).toBe('Faltan')
  })

  it('foto: la foto va detrás del marco de hojalata', () => {
    const w = render(PhotoNicho, section({ type: 'photo-arch', title: 'M&D' }))
    expect(w.find('.pn__photo').attributes('src')).toBe('/foto.jpg')
    expect(w.find('.pn__frame').attributes('src')).toBe('/m/hojalata.svg')
    expect(w.find('.pn__title').text()).toBe('M&D')
  })

  it('frase: la bandera lleva la frase', () => {
    const w = render(QuotePicado, section({ type: 'quote', text: 'Amor eterno' }))
    expect(w.find('.qp__text').text()).toBe('Amor eterno')
    expect(w.find('.qp__author').exists()).toBe(false)
  })
})
