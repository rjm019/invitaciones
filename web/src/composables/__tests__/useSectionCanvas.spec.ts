import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { CanvasElement } from '@/types/event'
import { findCanvasTarget, listCanvasTargets, useSectionCanvas } from '../useSectionCanvas'

let resizeCallback: ResizeObserverCallback | null = null
const disconnect = vi.fn()

class FakeResize {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb
  }
  observe() {}
  disconnect() {
    disconnect()
  }
}

function measure(width: number) {
  resizeCallback?.([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)
}

const canvas = ref<CanvasElement[] | undefined>()
const show = ref(true)

const Section = defineComponent({
  setup() {
    const root = ref<HTMLElement | null>(null)
    useSectionCanvas(root, canvas)
    return () =>
      h('section', { ref: root }, [
        h('div', { class: 'section__content' }, [
          h('h2', { 'data-text': 'title' }, 'Uno'),
          show.value ? h('h2', { 'data-text': 'title' }, 'Dos') : null,
          h('span', { 'data-text': 'time' }, '5 pm'),
          h('img', { src: 'a.webp', alt: '' }),
          h('div', { 'data-canvas-layer': '' }, [
            h('p', { 'data-text': 'title' }, 'libre'),
            h('img', { src: 'b.webp' }),
          ]),
        ]),
      ])
  },
})

describe('listCanvasTargets', () => {
  it('numera los bloques de texto por nombre y las imágenes en orden, sin contar el lienzo', () => {
    const wrapper = mount(Section)
    const targets = listCanvasTargets(wrapper.element)
    expect(targets.map((t) => t.target)).toEqual([
      'texto:title:0',
      'texto:title:1',
      'texto:time:0',
      'imagen:0',
    ])
    expect(targets[0]).toMatchObject({ kind: 'text', block: 'title', index: 0 })
    expect(targets[3]).toMatchObject({ kind: 'image', index: 0 })
    expect(findCanvasTarget(wrapper.element, 'texto:title:1')?.textContent).toBe('Dos')
    expect(findCanvasTarget(wrapper.element, 'texto:title:2')).toBeNull()
    expect(findCanvasTarget(wrapper.element, 'nada')).toBeNull()
  })

  it('una pieza marcada data-canvas-whole cuenta como una sola imagen y sus textos siguen siendo objetivos', () => {
    const Whole = defineComponent({
      render: () =>
        h('section', { 'data-section-key': 's' }, [
          h('img', { src: 'antes.webp' }),
          h('div', { 'data-canvas-whole': '' }, [
            h('img', { src: 'atras.webp' }),
            h('p', { 'data-text': 'covertitle' }, 'Título'),
            h('img', { src: 'frente.webp' }),
          ]),
          h('img', { src: 'despues.webp' }),
        ]),
    })
    const wrapper = mount(Whole)
    const targets = listCanvasTargets(wrapper.element)
    expect(targets.map((t) => t.target)).toEqual(['texto:covertitle:0', 'imagen:0', 'imagen:1', 'imagen:2'])
    expect(targets[2]?.el.hasAttribute('data-canvas-whole')).toBe(true)
    expect(targets[1]?.el.tagName).toBe('IMG')
    expect(targets[3]?.el.tagName).toBe('IMG')
  })
})

describe('useSectionCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResize)
    canvas.value = undefined
    show.value = true
    resizeCallback = null
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    disconnect.mockClear()
  })

  it('acomoda los bloques existentes con propiedades individuales, proporcional al ancho', async () => {
    canvas.value = [
      {
        id: 'lienzo-1',
        target: 'texto:title:1',
        x: 10,
        y: 5,
        rotation: 15,
        scale: 1.2,
        opacity: 50,
      },
      { id: 'lienzo-2', target: 'imagen:0', hidden: true },
    ]
    const wrapper = mount(Section, { attachTo: document.body })
    measure(400)
    await nextTick()

    const second = wrapper.findAll('h2')[1].element
    expect(second.style.getPropertyValue('translate')).toBe('40px 20px')
    expect(second.style.getPropertyValue('rotate')).toBe('15deg')
    expect(second.style.getPropertyValue('scale')).toBe('1.2 1.2')
    expect(second.style.getPropertyValue('opacity')).toBe('0.5')
    expect(second.style.getPropertyValue('transform')).toBe('')
    // El primer título no se toca.
    expect(wrapper.findAll('h2')[0].element.getAttribute('style')).toBeNull()
    expect(wrapper.find('img').element.style.getPropertyValue('visibility')).toBe('hidden')

    // Más ancho, mismo desplazamiento en proporción.
    measure(800)
    await nextTick()
    expect(second.style.getPropertyValue('translate')).toBe('80px 40px')
    wrapper.unmount()
  })

  it('un span en línea pasa a inline-block y vuelve a como estaba al quitar el lienzo', async () => {
    // jsdom no calcula el display de un span; un navegador lo da como 'inline'.
    const real = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) =>
      el.tagName === 'SPAN' ? ({ display: 'inline' } as CSSStyleDeclaration) : real(el, pseudo),
    )
    canvas.value = [{ id: 'lienzo-1', target: 'texto:time:0', x: 5 }]
    const wrapper = mount(Section, { attachTo: document.body })
    measure(200)
    await nextTick()
    const time = wrapper.find('span').element
    expect(time.style.display).toBe('inline-block')
    expect(time.style.getPropertyValue('translate')).toBe('10px 0px')

    canvas.value = undefined
    await nextTick()
    expect(time.style.display).toBe('')
    expect(time.style.getPropertyValue('translate')).toBe('')
    wrapper.unmount()
    vi.restoreAllMocks()
  })

  it('reaplica solo si Vue vuelve a pintar el bloque y no entra en bucle', async () => {
    canvas.value = [{ id: 'lienzo-1', target: 'texto:title:0', y: 10 }]
    const wrapper = mount(Section, { attachTo: document.body })
    measure(100)
    await nextTick()
    const first = wrapper.findAll('h2')[0].element
    expect(first.style.getPropertyValue('translate')).toBe('0px 10px')

    // Alguien reescribe el estilo del bloque: se reaplica en el siguiente cuadro.
    first.setAttribute('style', 'color: red')
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(first.style.getPropertyValue('translate')).toBe('0px 10px')
    expect(first.style.color).toBe('red')

    // Quitar el segundo título cambia el árbol: lo demás sigue en su lugar.
    show.value = false
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(wrapper.findAll('h2')).toHaveLength(1)
    expect(wrapper.findAll('h2')[0].element.style.getPropertyValue('translate')).toBe('0px 10px')
    wrapper.unmount()
  })

  it('sin ancho medido no mueve nada, y al desmontar limpia y desconecta', async () => {
    canvas.value = [{ id: 'lienzo-1', target: 'texto:title:0', x: 10, rotation: 5 }]
    const wrapper = mount(Section, { attachTo: document.body })
    const first = wrapper.findAll('h2')[0].element
    expect(first.getAttribute('style')).toBeNull()
    measure(300)
    await nextTick()
    expect(first.style.getPropertyValue('rotate')).toBe('5deg')
    wrapper.unmount()
    expect(first.style.getPropertyValue('rotate')).toBe('')
    expect(first.style.getPropertyValue('translate')).toBe('')
    expect(disconnect).toHaveBeenCalled()
  })

  it('en escritorio toman los valores propios de escritorio', async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
      removeEventListener: () => {},
    }))
    canvas.value = [{ id: 'lienzo-1', target: 'texto:title:0', x: 10, desktop: { x: 50 } }]
    const wrapper = mount(Section, { attachTo: document.body })
    measure(200)
    await nextTick()
    const first = wrapper.findAll('h2')[0].element
    expect(first.style.getPropertyValue('translate')).toBe('20px 0px')
    listeners.forEach((fn) => fn({ matches: true } as MediaQueryListEvent))
    await nextTick()
    expect(first.style.getPropertyValue('translate')).toBe('100px 0px')
    wrapper.unmount()
  })

  it('una capa da z-index y position: relative al bloque estático, sin tocar a los absolute', async () => {
    canvas.value = [
      { id: 'lienzo-1', target: 'texto:title:0', layer: 3 },
      { id: 'lienzo-2', target: 'imagen:0', layer: 2 },
    ]
    const wrapper = mount(Section, { attachTo: document.body })
    const img = wrapper.find('img').element
    img.style.position = 'absolute'
    measure(400)
    await nextTick()
    const first = wrapper.findAll('h2')[0].element
    expect(first.style.zIndex).toBe('3')
    expect(first.style.position).toBe('relative')
    expect(img.style.zIndex).toBe('2')
    expect(img.style.position).toBe('absolute')

    canvas.value = undefined
    await nextTick()
    expect(first.style.zIndex).toBe('')
    expect(first.style.position).toBe('')
    expect(img.style.position).toBe('absolute')
    wrapper.unmount()
  })

  it('sube el z-index también a cada ancestro que forme un contexto de apilamiento y lo restaura', async () => {
    const Nested = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null)
        useSectionCanvas(root, canvas)
        return () =>
          h('section', { ref: root }, [
            h('div', { class: 'section__content' }, [
              h('div', { class: 'card', style: { opacity: '0.9', zIndex: '1', position: 'relative' } }, [
                h('div', { class: 'plain' }, [h('h2', { 'data-text': 'title' }, 'Anidado')]),
              ]),
            ]),
          ])
      },
    })
    canvas.value = [{ id: 'lienzo-1', target: 'texto:title:0', layer: 5 }]
    const wrapper = mount(Nested, { attachTo: document.body })
    measure(400)
    await nextTick()
    const card = wrapper.find('.card').element as HTMLElement
    expect(card.style.zIndex).toBe('5')
    expect((wrapper.find('.plain').element as HTMLElement).style.zIndex).toBe('')
    expect((wrapper.find('.section__content').element as HTMLElement).style.zIndex).toBe('')

    canvas.value = undefined
    await nextTick()
    expect(card.style.zIndex).toBe('1')
    expect(card.style.position).toBe('relative')
    wrapper.unmount()
  })

  it('un bloque quitado es display: none, no choca con inline-block y se restaura', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const real = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) =>
      el.tagName === 'SPAN' ? ({ display: 'inline' } as CSSStyleDeclaration) : real(el, pseudo),
    )
    canvas.value = [
      { id: 'lienzo-1', target: 'texto:time:0', x: 5, removed: true },
      { id: 'lienzo-2', target: 'texto:title:0', desktop: { removed: true } },
    ]
    const wrapper = mount(Section, { attachTo: document.body })
    measure(200)
    await nextTick()
    const time = wrapper.find('span').element
    expect(time.style.display).toBe('none')
    expect(time.style.getPropertyValue('translate')).toBe('')
    expect(wrapper.findAll('h2')[0].element.style.display).toBe('')

    canvas.value = [{ id: 'lienzo-1', target: 'texto:time:0', x: 5 }]
    await nextTick()
    expect(time.style.display).toBe('inline-block')
    canvas.value = undefined
    await nextTick()
    expect(time.style.display).toBe('')
    wrapper.unmount()
    vi.restoreAllMocks()
  })
})
