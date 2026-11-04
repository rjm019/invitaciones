import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaperSheet from '../PaperSheet.vue'

describe('PaperSheet', () => {
  it('pinta la imagen completa y el slot dentro de la zona segura por defecto', () => {
    const w = mount(PaperSheet, { props: { src: '/papel.webp', aspect: 0.72 }, slots: { default: 'Hola' } })
    expect(w.find('img').attributes('src')).toBe('/papel.webp')
    expect(w.find('.sheet__safe').text()).toBe('Hola')
    const style = w.attributes('style') ?? ''
    expect(style).toContain('--sheet-top: 18%')
    expect(style).toContain('--sheet-left: 16%')
    expect(style).toContain('--sheet-aspect: 0.72')
  })

  it('usa la zona segura que se le da', () => {
    const w = mount(PaperSheet, { props: { src: '/p.webp', safe: { top: 30, bottom: 10 } } })
    const style = w.attributes('style') ?? ''
    expect(style).toContain('--sheet-top: 30%')
    expect(style).toContain('--sheet-bottom: 10%')
    expect(style).toContain('--sheet-right: 16%')
  })

  it('sin proporción la mide de la imagen cargada', async () => {
    const w = mount(PaperSheet, { props: { src: '/p.webp' } })
    expect(w.attributes('style')).not.toContain('--sheet-aspect')
    const img = w.find('img').element
    Object.defineProperty(img, 'naturalWidth', { value: 600 })
    Object.defineProperty(img, 'naturalHeight', { value: 1000 })
    await w.find('img').trigger('load')
    expect(w.attributes('style')).toContain('--sheet-aspect: 0.6')
  })

  it('sin imagen cae a una tarjeta lisa', () => {
    const w = mount(PaperSheet, { slots: { default: 'x' } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.classes()).toContain('sheet--plain')
  })
})
