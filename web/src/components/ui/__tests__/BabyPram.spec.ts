import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BabyPram from '../BabyPram.vue'

describe('BabyPram', () => {
  it('trae cuerpo, capota con varillas, moñito y dos ruedas de rayos, y es decorativa', () => {
    const w = mount(BabyPram)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.find('.bp__body').exists()).toBe(true)
    expect(w.find('.bp__hood').exists()).toBe(true)
    expect(w.find('.bp__bow').exists()).toBe(true)
    expect(w.findAll('.rib')).toHaveLength(3)
    expect(w.findAll('.bp__wheel')).toHaveLength(2)
  })

  it('rueda solo con rolling y size fija el ancho', () => {
    expect(mount(BabyPram).find('.bp').classes()).not.toContain('is-rolling')
    const w = mount(BabyPram, { props: { rolling: true, size: '20rem' } })
    expect(w.find('.bp').classes()).toContain('is-rolling')
    expect(w.find('.bp').attributes('style')).toContain('width: 20rem')
  })
})
