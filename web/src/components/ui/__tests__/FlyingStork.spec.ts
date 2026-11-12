import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FlyingStork from '../FlyingStork.vue'

describe('FlyingStork', () => {
  it('trae dos alas, el bultito colgado y es decorativo', () => {
    const w = mount(FlyingStork)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.findAll('.fs__wing')).toHaveLength(2)
    expect(w.find('.fs__bundle').exists()).toBe(true)
    expect(w.find('.fs__bob').exists()).toBe(true)
  })

  it('flying y flip ponen sus clases de estado y size fija el ancho', () => {
    expect(mount(FlyingStork).find('.fs').classes()).not.toContain('is-flying')
    const w = mount(FlyingStork, { props: { flying: true, flip: true, size: '6rem' } })
    expect(w.find('.fs').classes()).toEqual(expect.arrayContaining(['is-flying', 'fs--flip']))
    expect(w.find('.fs').attributes('style')).toContain('width: 6rem')
  })

  it('cada cigüeña lleva su propio filtro (sin ids repetidos)', () => {
    const w = mount({
      components: { FlyingStork },
      template: '<div><FlyingStork /><FlyingStork /></div>',
    })
    const [a, b] = w.findAll('filter').map((f) => f.attributes('id'))
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})
