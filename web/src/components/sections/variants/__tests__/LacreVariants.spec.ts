import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, type Component } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { providePreview, type PreviewOptions } from '@/composables/usePreview'
import { sectionVariants, skinVariants } from '@/components/sectionVariants'
import { loadTheme, themeAssets } from '@/themes'
import type { EventConfig, ResolvedSection } from '@/types/event'
import BlessingEditorial from '../BlessingEditorial.vue'
import CountdownBand from '../CountdownBand.vue'
import HeroSealedEnvelope from '../HeroSealedEnvelope.vue'
import ItineraryMinute from '../ItineraryMinute.vue'
import LocationStationery from '../LocationStationery.vue'
import SaveTheDateEditorial from '../SaveTheDateEditorial.vue'

const skins = readFileSync(
  resolve(process.cwd(), 'src/components/sections/variants/skins.css'),
  'utf8',
)

function reduceMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    addEventListener() {},
    removeEventListener() {},
  }))
}

const family = [
  { role: 'Papás de la novia', names: ['Elena Carrillo', 'Javier Ruiz'] },
  { role: 'Papás del novio', names: ['Lucía Fernández', 'Andrés Montoya'] },
  { role: 'Padrinos de velación', names: ['Marina Solís', 'Gabriel Ortega'] },
]

const event = {
  title: 'Isabella & Mateo',
  celebrant: { full_name: 'Isabella & Mateo', short_name: 'Isabella & Mateo', monogram: 'I M' },
  starts_at: '2027-10-23T17:00:00-06:00',
  timezone: 'America/Mexico_City',
  venue: { name: 'Hacienda Santa Elena', display_name: 'Hacienda Santa Elena', city: 'San Miguel de Allende', address: '', maps_url: '' },
  family,
  itinerary: [
    { time: '17:00', label: 'Ceremonia' },
    { time: '19:00', label: 'Cóctel' },
  ],
  locations: [
    { label: 'Ceremonia', name: 'Parroquia de San Rafael', time: '17:00', address: 'Calle del Cardo 8', maps_url: 'https://maps.example/1', photo: null, kind: 'religious' },
    { label: 'Recepción', name: 'Hacienda Santa Elena', time: '19:00', address: 'Camino a la Cañada 120', maps_url: 'https://maps.example/2', photo: null, kind: 'reception' },
  ],
  sections: [],
}

function render(
  component: Component,
  section: Partial<ResolvedSection>,
  options: { preview?: PreviewOptions | null; sections?: Partial<ResolvedSection>[] } = {},
) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => (path ? `/${path}` : null)),
          sections: computed(() => (options.sections ?? []) as ResolvedSection[]),
        })
        providePreview(() => options.preview ?? null)
        return () =>
          h(component, { section: { decor: {}, effects: [], ...section } as ResolvedSection })
      },
    }),
  )
}

describe('diseños de papelería (tema lacre)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('el tema lacre trae un diseño registrado para cada sección y sus adornos existen', async () => {
    const manifest = await loadTheme('lacre')
    expect(manifest?.buttons).toBe('fine')
    expect(manifest?.texture).toBe('cotton')
    expect(manifest?.relief).toBe(true)
    const assets = themeAssets('lacre')
    for (const [type, s] of Object.entries(manifest!.sections)) {
      for (const file of Object.values(s.decor ?? {})) expect(assets[file], file).toBeTruthy()
      if (!s.variant) continue
      const component = sectionVariants[type]?.[s.variant]
      const skin = skinVariants[type]?.includes(s.variant)
      expect(component || skin, `${type}:${s.variant}`).toBeTruthy()
      if (skin) expect(skins).toContain(`.section--${type}--${s.variant}`)
    }
    expect(assets['piedra.svg']).toBeTruthy()
    expect(assets['damasco.svg']).toBeTruthy()
    expect(assets['iglesia.svg']).toBeTruthy()
    expect(assets['camara.svg']).toBeTruthy()
  })

  it('sobre-lacre: cerrado, con el nombre de la invitación; la tarjeta trae papás, nombres, fecha y ciudad', () => {
    reduceMotion(false)
    const wrapper = render(HeroSealedEnvelope, {
      title: 'Con todo el corazón',
      text: 'Tenemos el honor de invitarles',
    })
    expect(wrapper.find('.lh').classes()).toContain('lh--closed')
    expect(wrapper.find('.lh__open').text()).toBe('Toca para abrir')
    expect(wrapper.find('.lh__kicker').text()).toBe('Con todo el corazón')
    expect(wrapper.findAll('.lh__role').map((r) => r.text())).toEqual([
      'Papás de la novia',
      'Papás del novio',
    ])
    expect(wrapper.findAll('.lh__name').map((n) => n.text())).toEqual(['Isabella', 'Mateo'])
    expect(wrapper.find('.lh__amp').exists()).toBe(true)
    expect(wrapper.find('.lh__date').text()).toBe('Sábado 23 de octubre de 2027')
    expect(wrapper.find('.lh__place').text()).toBe('San Miguel de Allende')
  })

  it('sobre-lacre: al tocar empieza a abrir; con "reducir movimiento" ya llega abierto', async () => {
    reduceMotion(false)
    const guest = render(HeroSealedEnvelope, {})
    await guest.find('.lh__stage').trigger('click')
    expect(guest.find('.lh').classes()).toContain('lh--opening')

    reduceMotion(true)
    const calm = render(HeroSealedEnvelope, {})
    expect(calm.find('.lh').classes()).toContain('lh--open')
    expect(calm.find('.lh__open').exists()).toBe(false)
  })

  it('sobre-lacre: la tarjeta pasa al frente y al final no queda nada del sobre', async () => {
    vi.useFakeTimers()
    reduceMotion(false)
    const wrapper = render(HeroSealedEnvelope, {
      title: 'Con todo el corazón',
      effects: ['typewriter-title', 'stamp', 'calligraphy'],
    })
    const locked = () => document.documentElement.classList.contains('is-scroll-locked')
    expect(locked()).toBe(true)
    // Cerrado: el sobre apaisado con sus dos solapas y el lacre que lo cierra.
    expect(wrapper.find('.lh__flap-out').exists()).toBe(true)
    expect(wrapper.find('.lh__flap-in').exists()).toBe(true)
    expect(wrapper.find('.lh__kicker .fxt').attributes('data-play')).toBe('wait')
    await wrapper.find('.lh__stage').trigger('click')
    vi.advanceTimersByTime(2300 * 1.2)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lh').classes()).toContain('lh--presenting')
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lh').classes()).toContain('lh--open')
    expect(wrapper.findAll('.lh__envelope, .lh__front, .lh__flap-in, .lh__flap-out')).toHaveLength(0)
    expect(wrapper.find('.lh__kicker .fxt').attributes('data-play')).toBe('go')
    expect(wrapper.find('.lh__amp .fxt').classes()).toContain('fxt--calligraphy')
    expect(wrapper.find('.lh__name .fxt').classes()).toContain('fxt--stamp')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('bendición editorial: sin repetir a los papás si la portada ya los trae', () => {
    const alone = render(BlessingEditorial, { text: 'Con la bendición de Dios' })
    expect(alone.findAll('.be__role')).toHaveLength(3)
    const withCover = render(
      BlessingEditorial,
      { text: 'Con la bendición de Dios' },
      { sections: [{ type: 'hero-envelope', variant: 'sobre-lacre' }] },
    )
    expect(withCover.findAll('.be__role').map((r) => r.text())).toEqual(['Padrinos de velación'])
  })

  it('fecha editorial: día de la semana, número grande, mes, año y la tarjeta con muescas', () => {
    const wrapper = render(SaveTheDateEditorial, { title: 'Reserva la fecha' })
    expect(wrapper.find('.de__card').classes()).toContain('paper-notched')
    expect(wrapper.find('.de__weekday').text()).toBe('sábado')
    expect(wrapper.find('.de__day').text()).toBe('23')
    expect(wrapper.findAll('.de__side').map((s) => s.text())).toEqual(['octubre', '2027'])
  })

  it('ubicación de papelería: la iglesia para la misa y la hacienda para la recepción', () => {
    const wrapper = render(LocationStationery, { calendar: false, layout: 'side' })
    const drawings = wrapper.findAll('.ls__drawing').map((d) => d.attributes('style'))
    expect(drawings[0]).toContain('iglesia.svg')
    expect(drawings[1]).toContain('hacienda.svg')
    expect(wrapper.findAll('.ls__button')).toHaveLength(2)
  })

  it('itinerario en minuta y cuenta regresiva en banda pintan sus renglones y unidades', () => {
    const itinerary = render(ItineraryMinute, {})
    expect(itinerary.findAll('.im__row')).toHaveLength(2)
    expect(itinerary.find('.im__label').text()).toBe('Ceremonia')
    const band = render(CountdownBand, { text: 'para decirnos que sí' })
    expect(band.findAll('.cb__unit')).toHaveLength(4)
    expect(band.find('.cb__text').text()).toBe('para decirnos que sí')
  })
})
