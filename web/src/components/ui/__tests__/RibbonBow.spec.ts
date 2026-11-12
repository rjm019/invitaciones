import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RibbonBow from '../RibbonBow.vue'

describe('RibbonBow', () => {
  it('trae dos lazos, nudo y dos colas, y es decorativo', () => {
    const w = mount(RibbonBow)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.findAll('.rb__loop')).toHaveLength(2)
    expect(w.findAll('.rb__tail')).toHaveLength(2)
    expect(w.find('.rb__knot').exists()).toBe(true)
  })

  it('tied y sway ponen sus clases de estado', () => {
    expect(mount(RibbonBow).find('.rb').classes()).toEqual(expect.arrayContaining(['is-tied']))
    expect(mount(RibbonBow).find('.rb').classes()).not.toContain('is-sway')
    const w = mount(RibbonBow, { props: { tied: false, sway: true } })
    expect(w.find('.rb').classes()).toEqual(expect.arrayContaining(['is-sway']))
    expect(w.find('.rb').classes()).not.toContain('is-tied')
  })

  it('size fija el ancho y tone pisa el color del listón', () => {
    const w = mount(RibbonBow, { props: { size: '9rem', tone: '#7fa8c9' } })
    const style = w.find('.rb').attributes('style') ?? ''
    expect(style).toContain('width: 9rem')
    expect(style).toContain('--bow-color: #7fa8c9')
    expect(style).toContain('--bow-color-dark')
  })

  it('cada moño lleva su propio filtro (sin ids repetidos)', () => {
    const w = mount({
      components: { RibbonBow },
      template: '<div><RibbonBow /><RibbonBow /></div>',
    })
    const [a, b] = w.findAll('filter').map((f) => f.attributes('id'))
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})
