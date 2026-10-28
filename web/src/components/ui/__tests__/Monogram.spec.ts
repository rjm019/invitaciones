import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig } from '@/types/event'
import Monogram from '../Monogram.vue'
import WaxSeal from '../WaxSeal.vue'

function inInvitation(celebrant: EventConfig['celebrant'], child: ReturnType<typeof h>) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({ celebrant }) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        return () => child
      },
    }),
  )
}

describe('Monogram', () => {
  it('pinta las iniciales dadas, entrelazadas, y es decorativo por defecto', () => {
    const wrapper = mount(Monogram, { props: { initials: 'I M' } })
    const letters = wrapper.findAll('.monogram__letter')
    // Las dos letras y la primera otra vez (el cruce por encima).
    expect(letters.map((l) => l.text())).toEqual(['I', 'M', 'I'])
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.monogram__amp').exists()).toBe(false)
  })

  it('con "&" lo pinta, y con decorative=false se anuncia con sus iniciales', () => {
    const wrapper = mount(Monogram, { props: { initials: 'I M', ampersand: true, decorative: false } })
    expect(wrapper.find('.monogram__amp').text()).toBe('&')
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('Monograma I M')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
  })

  it('sin iniciales usa las de la invitación (monograma, o el nombre corto)', () => {
    const explicit = inInvitation({ short_name: 'Nat', monogram: 'A B' }, h(Monogram))
    expect(explicit.findAll('.monogram__letter')[0].text()).toBe('A')
    const derived = inInvitation({ short_name: 'Isabella & Mateo' }, h(Monogram))
    expect(derived.findAll('.monogram__letter').slice(0, 2).map((l) => l.text())).toEqual(['I', 'M'])
  })

  it('sin iniciales ni invitación no pinta nada', () => {
    expect(mount(Monogram).find('svg').exists()).toBe(false)
  })

  it('acepta el tamaño como cualquier medida', () => {
    expect(mount(Monogram, { props: { initials: 'N', size: '9rem' } }).attributes('style')).toContain('9rem')
  })
})

describe('WaxSeal', () => {
  it('es un lacre decorativo con el monograma en tres capas (luz, sombra y cara)', () => {
    const wrapper = mount(WaxSeal, { props: { initials: 'I M' } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.seal__body').exists()).toBe(true)
    expect(wrapper.findAll('.seal__letter--light').map((l) => l.text())).toEqual(['I', 'M'])
    expect(wrapper.findAll('.seal__letter--dark')).toHaveLength(2)
    expect(wrapper.findAll('.seal__letter--face')).toHaveLength(2)
    expect(wrapper.classes()).toContain('seal--gold')
  })

  it('el ovalado es más alto que ancho y el borgoña cambia de clase', () => {
    const oval = mount(WaxSeal, { props: { initials: 'N', shape: 'oval', tone: 'burgundy' } })
    expect(oval.attributes('viewBox')).toBe('0 0 100 124')
    expect(oval.classes()).toContain('seal--burgundy')
    expect(mount(WaxSeal, { props: { initials: 'N' } }).attributes('viewBox')).toBe('0 0 100 100')
  })

  it('con decorative=false se anuncia; la misma semilla da la misma orilla', () => {
    const a = mount(WaxSeal, { props: { initials: 'N', decorative: false, seed: 'x' } })
    expect(a.attributes('aria-label')).toBe('Sello con las iniciales N')
    const b = mount(WaxSeal, { props: { initials: 'N', seed: 'x' } })
    expect(b.find('.seal__body').attributes('d')).toBe(a.find('.seal__body').attributes('d'))
  })

  it('usa las iniciales de la invitación si no se le dan', () => {
    const wrapper = inInvitation({ short_name: 'Isabella & Mateo' }, h(WaxSeal))
    expect(wrapper.findAll('.seal__letter--face').map((l) => l.text())).toEqual(['I', 'M'])
  })
})
