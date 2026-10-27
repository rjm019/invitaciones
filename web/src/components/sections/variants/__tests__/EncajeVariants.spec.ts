import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import DressCodeSwatches from '../DressCodeSwatches.vue'
import GalleryHoops from '../GalleryHoops.vue'
import ItineraryEngraving from '../ItineraryEngraving.vue'
import LocationEngraving from '../LocationEngraving.vue'

const event = {
  title: 'Boda',
  timezone: 'America/Mexico_City',
  starts_at: '2027-10-23T17:00:00-06:00',
  dress_code: { colors: ['#aab491', '#f3eedf'] },
  itinerary: [
    { time: '17:00', label: 'Ceremonia religiosa', icon: 'church' },
    { time: '19:00', label: 'Brindis' },
    { time: '21:00', label: 'Cena', icon: 'utensils' },
  ],
  locations: [],
  venue: {
    name: 'Hacienda',
    display_name: 'Hacienda Los Arcos',
    city: 'San Miguel',
    address: 'Camino Real 1',
    maps_url: 'https://maps.example.com/x',
    photo: null,
  },
} as unknown as EventConfig

function section(extra: Partial<ResolvedSection>): ResolvedSection {
  return {
    type: 'itinerary',
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
        })
        return () => h(component, { section: s })
      },
    }),
  )
}

describe('muestrario de vestimenta', () => {
  it('el botón lleva al enlace propio de la sección', () => {
    const w = render(
      DressCodeSwatches,
      section({ type: 'dress-code', link: 'https://example.com/ideas', button: 'Ver ideas' }),
    )
    const a = w.find('a.swatches__button')
    expect(a.attributes('href')).toBe('https://example.com/ideas')
    expect(a.text()).toBe('Ver ideas')
  })

  it('sin enlace, no hay botón (ya no busca en Google)', () => {
    const w = render(DressCodeSwatches, section({ type: 'dress-code', button: 'Ver ejemplos' }))
    expect(w.find('a.swatches__button').exists()).toBe(false)
    expect(w.html()).not.toContain('google.com')
  })

  it('con enlace y sin texto, el botón dice "Ver ejemplos"', () => {
    const w = render(
      DressCodeSwatches,
      section({ type: 'dress-code', link: 'https://example.com' }),
    )
    expect(w.find('a.swatches__button').text()).toBe('Ver ejemplos')
  })
})

describe('itinerario en grabado', () => {
  it('un medallón con su dibujo por momento, con hora y actividad', () => {
    const w = render(ItineraryEngraving, section({ title: 'Itinerario' }))
    const stops = w.findAll('.engr-itin__stop')
    expect(stops).toHaveLength(3)
    expect(stops[0].find('svg').html()).toContain('path')
    expect(stops[1].find('.engr-itin__label').text()).toBe('Brindis')
    expect(stops[1].find('time').attributes('datetime')).toBe('19:00')
    // El brindis no trae ícono: lo decide su actividad (la copa), distinta de la iglesia.
    expect(stops[1].find('svg').html()).not.toBe(stops[0].find('svg').html())
  })

  it('en vivo, fuera del día del evento, no marca ningún momento', () => {
    const w = render(ItineraryEngraving, section({ live: true }))
    expect(w.find('.is-now').exists()).toBe(false)
  })
})

describe('ubicación en grabado', () => {
  it('muestra el salón con "Ver ubicación" y la hacienda dibujada', () => {
    const w = render(
      LocationEngraving,
      section({ type: 'location', decor: { estate: '/m/h.svg' } }),
    )
    expect(w.find('.engr-loc__name').text()).toBe('Hacienda Los Arcos')
    const a = w.find('a.engr-loc__button')
    expect(a.text()).toContain('Ver ubicación')
    expect(a.attributes('href')).toBe('https://maps.example.com/x')
    expect(w.find('.engr-loc__estate').attributes('style')).toContain('/m/h.svg')
  })

  it('con acomodo lado a lado y calendario, cada lugar trae sus dos botones', () => {
    const places = [
      {
        label: 'Misa',
        name: 'Parroquia',
        time: '17:00',
        address: '',
        maps_url: 'https://m.example/1',
        photo: null,
        starts_at: '2027-10-23T17:00:00-06:00',
      },
      {
        label: 'Recepción',
        name: 'Hacienda',
        time: '19:00',
        address: '',
        maps_url: 'https://m.example/2',
        photo: null,
        starts_at: '2027-10-23T19:00:00-06:00',
      },
    ]
    const w = render(
      LocationEngraving,
      section({ type: 'location', layout: 'side', calendar: true, places }),
    )
    expect(w.find('.engr-loc').classes()).toContain('engr-loc--side')
    const articles = w.findAll('.engr-loc__place')
    expect(articles).toHaveLength(2)
    for (const a of articles) {
      expect(a.findAll('a.engr-loc__button')).toHaveLength(2)
      expect(a.html()).toContain('calendar')
    }
  })

  it('sin adorno (la invitación lo quitó), no dibuja la hacienda', () => {
    const w = render(LocationEngraving, section({ type: 'location', decor: { estate: null } }))
    expect(w.find('.engr-loc__estate').exists()).toBe(false)
  })
})

describe('galería en bastidores', () => {
  const photos = [
    {
      photo: 'a.jpg',
      caption: 'Nosotros',
      width: 1200,
      height: 800,
      thumb: 'a-t.jpg',
      thumb_width: 480,
    },
    { photo: 'b.jpg', caption: '' },
    { photo: 'c.jpg', caption: 'Ella' },
  ]

  it('cada foto va en su aro, con srcset de la miniatura y pie opcional', () => {
    const w = render(GalleryHoops, section({ type: 'gallery', photos }))
    expect(w.findAll('.hoops__hoop')).toHaveLength(3)
    expect(w.find('img').attributes('srcset')).toContain('480w')
    expect(w.findAll('.hoops__label')).toHaveLength(2)
    expect(w.findAll('.hoops__piece--feature')).toHaveLength(1)
  })

  it('sin título propio, no pone título', () => {
    const w = render(GalleryHoops, section({ type: 'gallery', photos }))
    expect(w.find('.hoops__title').exists()).toBe(false)
  })
})
