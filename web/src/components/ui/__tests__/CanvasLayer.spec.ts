import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { CanvasElement, EventConfig } from '@/types/event'
import CanvasLayer from '../CanvasLayer.vue'

function render(elements: CanvasElement[]) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({}) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => (path ? `/media/${path}` : null)),
        })
        return () => h(CanvasLayer, { elements })
      },
    }),
  )
}

describe('CanvasLayer', () => {
  it('pinta cada elemento libre con sus variables, de abajo hacia arriba', () => {
    const wrapper = render([
      { id: 'lienzo-1', kind: 'text', text: 'Hola', x: 10, y: 20, layer: 2 },
      { id: 'lienzo-2', kind: 'image', image: 'a.webp', x: 5, y: 0, layer: 1 },
      { id: 'lienzo-3', kind: 'shape', shape: 'circle' },
      { id: 'lienzo-4', target: 'texto:title:0', x: 3 },
    ])

    const items = wrapper.findAll('.canvas-el')
    expect(items.map((i) => i.attributes('data-canvas-id'))).toEqual([
      'lienzo-3',
      'lienzo-2',
      'lienzo-1',
    ])
    expect(wrapper.find('[data-canvas-id="lienzo-1"]').text()).toBe('Hola')
    expect(wrapper.find('[data-canvas-id="lienzo-1"]').attributes('style')).toContain('--cv-x: 10')
    expect(wrapper.find('[data-canvas-id="lienzo-3"]').classes()).toContain('canvas-el--circle')
    // Las imágenes decorativas llevan alt vacío y pasan por el resolvedor de archivos.
    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBe('')
    expect(img.attributes('src')).toBe('/media/a.webp')
    // Es decoración: fuera del árbol de accesibilidad y sin tocar el puntero.
    expect(wrapper.find('.canvas-layer').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.canvas-layer').attributes('data-canvas-layer')).toBeDefined()
  })

  it('no usa transform: el giro y la escala son propiedades individuales', () => {
    const wrapper = render([
      { id: 'lienzo-1', kind: 'shape', shape: 'line', rotation: 30, scale: 2 },
    ])
    expect(wrapper.html()).not.toContain('transform')
    expect(wrapper.find('.canvas-el').attributes('style')).toContain('--cv-rotate: 30deg')
  })

  it('un elemento oculto no se pinta y sin elementos libres no hay nada', () => {
    expect(
      render([{ id: 'lienzo-1', kind: 'text', text: 'x', hidden: true }])
        .find('.canvas-layer')
        .exists(),
    ).toBe(false)
    expect(
      render([{ id: 'lienzo-1', target: 'imagen:0' }])
        .find('.canvas-layer')
        .exists(),
    ).toBe(false)
  })

  it('el contorno de una forma lo marca la clase, no el color fijo', () => {
    const wrapper = render([{ id: 'lienzo-1', kind: 'shape', shape: 'rectangle', border: 3 }])
    expect(wrapper.find('.canvas-el').classes()).toContain('canvas-el--outlined')
    expect(
      render([{ id: 'lienzo-1', kind: 'shape', shape: 'line', border: 3 }])
        .find('.canvas-el')
        .classes(),
    ).not.toContain('canvas-el--outlined')
  })
})
