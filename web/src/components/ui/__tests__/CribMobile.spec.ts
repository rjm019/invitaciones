import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CribMobile from '../CribMobile.vue'

describe('CribMobile', () => {
  it('cuelga cinco piezas del aro y es decorativo', () => {
    const w = mount(CribMobile)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.find('.cm__art').attributes('aria-hidden')).toBe('true')
    expect(w.findAll('.cm__swing')).toHaveLength(5)
    expect(w.findAll('.cm__untwist')).toHaveLength(5)
  })

  it('gira solo con playing y size fija el ancho', () => {
    expect(mount(CribMobile).find('.cm').classes()).not.toContain('is-playing')
    const w = mount(CribMobile, { props: { playing: true, size: '18rem' } })
    expect(w.find('.cm').classes()).toContain('is-playing')
    expect(w.find('.cm').attributes('style')).toContain('width: 18rem')
  })

  it('acepta un slot encima (el botón del reproductor) y entonces ya no se oculta entero', () => {
    const w = mount(CribMobile, { slots: { default: '<button class="play">Tocar</button>' } })
    expect(w.find('.cm__slot .play').exists()).toBe(true)
    expect(w.attributes('aria-hidden')).toBeUndefined()
    expect(w.find('.cm__art').attributes('aria-hidden')).toBe('true')
  })
})
