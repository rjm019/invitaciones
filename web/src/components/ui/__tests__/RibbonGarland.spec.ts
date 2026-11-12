import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RibbonGarland from '../RibbonGarland.vue'

describe('RibbonGarland', () => {
  it('trae el nudo, dos lazos, dos lados con hojas y bayas, y una margarita; es decorativo', () => {
    const w = mount(RibbonGarland)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.find('.rg__knot').exists()).toBe(true)
    expect(w.findAll('.rg__loop')).toHaveLength(2)
    expect(w.findAll('.rg__side')).toHaveLength(2)
    expect(w.findAll('.rg__curl')).toHaveLength(2)
    expect(w.findAll('.rg__foliage')).toHaveLength(2)
    expect(w.findAll('.rg__leaf').length).toBeGreaterThan(20)
    expect(w.findAll('.berry').length).toBeGreaterThan(6)
    expect(w.find('.rg__daisy').exists()).toBe(true)
  })

  it('tied y sway ponen sus clases de estado', () => {
    expect(mount(RibbonGarland).find('.rg').classes()).toContain('is-tied')
    expect(mount(RibbonGarland).find('.rg').classes()).not.toContain('is-sway')
    const w = mount(RibbonGarland, { props: { tied: false, sway: true } })
    expect(w.find('.rg').classes()).toContain('is-sway')
    expect(w.find('.rg').classes()).not.toContain('is-tied')
  })

  it('size lg estira el dibujo hacia abajo y tone pisa el color del listón', () => {
    const md = mount(RibbonGarland)
    const lg = mount(RibbonGarland, { props: { size: 'lg', tone: '#7fa8c9' } })
    expect(lg.find('.rg').classes()).toContain('rg--lg')
    const h = (w: typeof md) => Number(w.find('svg').attributes('viewBox')?.split(' ')[3])
    expect(h(lg)).toBeGreaterThan(h(md))
    expect(lg.find('.rg').attributes('style')).toContain('--bow-color: #7fa8c9')
  })

  it('cada guirnalda lleva su propio filtro (sin ids repetidos)', () => {
    const w = mount({
      components: { RibbonGarland },
      template: '<div><RibbonGarland /><RibbonGarland /></div>',
    })
    const [a, b] = w.findAll('filter').map((f) => f.attributes('id'))
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})
