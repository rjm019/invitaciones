import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ManagerPreviewPage from '../ManagerPreviewPage.vue'
import { wrap, type PreviewDisplay, type ToPreview } from '@/services/previewProtocol'
import type { EventConfig } from '@/types/event'

// Moveable y Selecto se cargan solo al entrar a «Acomodar»: aquí, dos dobles que lo registran.
const libs = vi.hoisted(() => ({ loaded: [] as string[], created: [] as string[] }))
vi.mock('moveable', () => {
  libs.loaded.push('moveable')
  return {
    default: class {
      constructor() {
        libs.created.push('moveable')
      }
      on() {
        return this
      }
      destroy() {}
      updateRect() {}
      updateTarget() {}
    },
  }
})
vi.mock('selecto', () => {
  libs.loaded.push('selecto')
  return {
    default: class {
      constructor() {
        libs.created.push('selecto')
      }
      on() {
        return this
      }
      destroy() {}
      setSelectedTargets() {}
    },
  }
})

/** La invitación, reducida a una sección con su título (lo demás lo prueban sus componentes). */
const FakeStage = defineComponent({
  setup: () => () =>
    h('section', { 'data-section-key': 'itinerario' }, [
      h('h2', { 'data-text': 'title' }, 'Itinerario'),
      h('a', { href: 'https://maps.example' }, 'Cómo llegar'),
    ]),
})

const display: PreviewDisplay = {
  envelope: 'open',
  guest: 'general',
  muted: true,
  mode: 'select',
  labels: {},
}
const config = { theme: 'jardin-azul', palette: {}, sections: [] } as unknown as EventConfig

let wrapper: VueWrapper | null = null
const editor = { postMessage: vi.fn() }
const realParent = Object.getOwnPropertyDescriptor(window, 'parent')

function fromEditor(message: ToPreview, init: { origin?: string; source?: unknown } = {}): void {
  window.dispatchEvent(
    Object.assign(new Event('message'), {
      data: wrap(message),
      origin: location.origin,
      source: editor,
      ...init,
    }),
  )
}
const sent = () =>
  editor.postMessage.mock.calls.map(([m]) => m as { type: string; [k: string]: unknown })

async function open() {
  wrapper = mount(ManagerPreviewPage, {
    global: { stubs: { PreviewStage: FakeStage } },
    attachTo: document.body,
  })
  fromEditor({ type: 'config', config, display })
  await nextTick()
}

describe('ManagerPreviewPage', () => {
  beforeEach(() => {
    editor.postMessage.mockReset()
    // La vista previa vive en un iframe: su "parent" es el editor.
    Object.defineProperty(window, 'parent', { value: editor, configurable: true })
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    if (realParent) Object.defineProperty(window, 'parent', realParent)
  })

  it('avisa al editor que está lista y pinta la config que le llega', async () => {
    await open()
    expect(sent()[0]).toMatchObject({ type: 'ready' })
    expect(document.querySelector('[data-section-key="itinerario"]')).not.toBeNull()
  })

  it('lo que llega al instante (estilo y textos) se aplica una vez por cuadro, con lo último', async () => {
    const TitleStage = defineComponent({
      props: { event: { type: Object, required: true } },
      setup: (props) => () =>
        h('h2', { class: 'titulo' }, (props.event as EventConfig).sections[0]?.title ?? ''),
    })
    wrapper = mount(ManagerPreviewPage, {
      global: { stubs: { PreviewStage: TitleStage } },
      attachTo: document.body,
    })
    const section = { type: 'itinerary', key: 'itinerario', effects: [], visible: true }
    fromEditor({
      type: 'config',
      config: { ...config, sections: [{ ...section, title: 'Itinerario' }] } as EventConfig,
      display,
    })
    await nextTick()

    fromEditor({ type: 'patch', patch: { sections: { itinerario: { title: 'Pro' } } } })
    fromEditor({ type: 'patch', patch: { sections: { itinerario: { title: 'Programa' } } } })
    await nextTick()
    expect(document.querySelector('.titulo')?.textContent).toBe('Itinerario')

    await new Promise((done) => requestAnimationFrame(() => done(null)))
    await nextTick()
    expect(document.querySelector('.titulo')?.textContent).toBe('Programa')
  })

  it('al tocar un texto manda su sección y su bloque, sin abrir nada de la invitación', async () => {
    await open()
    const title = document.querySelector<HTMLElement>('[data-text="title"]')!
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    title.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(sent()).toContainEqual(
      expect.objectContaining({ type: 'pick', key: 'itinerario', block: 'title' }),
    )

    const link = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.querySelector('a')!.dispatchEvent(link)
    expect(link.defaultPrevented).toBe(true)
    expect(sent()).toContainEqual(
      expect.objectContaining({ type: 'pick', key: 'itinerario', block: null }),
    )
  })

  it('en "Probar" la invitación funciona de verdad', async () => {
    await open()
    fromEditor({ type: 'display', display: { ...display, mode: 'try' } })
    await nextTick()
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.querySelector('[data-text="title"]')!.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    expect(sent().some((m) => m.type === 'pick')).toBe(false)
  })

  it('dice qué secciones sí se pintaron', async () => {
    await open()
    await vi.waitFor(
      () =>
        expect(sent()).toContainEqual(
          expect.objectContaining({ type: 'rendered', keys: ['itinerario'] }),
        ),
      { timeout: 2000 },
    )
  })

  it('no hace caso a mensajes de otro origen o de otra ventana', async () => {
    wrapper = mount(ManagerPreviewPage, {
      global: { stubs: { PreviewStage: FakeStage } },
      attachTo: document.body,
    })
    fromEditor({ type: 'config', config, display }, { origin: 'https://otro.example' })
    fromEditor({ type: 'config', config, display }, { source: window })
    await nextTick()
    expect(document.querySelector('[data-section-key]')).toBeNull()
    expect(document.body.textContent).toContain('Cargando la vista previa')
  })

  describe('modo «Acomodar»', () => {
    const arrange: PreviewDisplay = { ...display, mode: 'arrange' }

    it('no descarga Moveable ni Selecto hasta entrar al modo, y los suelta al salir', async () => {
      await open()
      await flushPromises()
      expect(libs.created).toEqual([])
      expect(document.querySelector('.arrange-shield')).toBeNull()

      fromEditor({ type: 'display', display: arrange })
      await flushPromises()
      expect(libs.created.sort()).toEqual(['moveable', 'selecto'])
      expect(document.querySelector('.arrange-shield')).not.toBeNull()
      expect(document.documentElement.classList.contains('is-arranging')).toBe(true)

      fromEditor({ type: 'display', display })
      await flushPromises()
      expect(document.querySelector('.arrange-shield')).toBeNull()
      expect(document.documentElement.classList.contains('is-arranging')).toBe(false)
    })

    it('reenvía al editor ⌘Z, ⇧⌘Z, ⌘D y Supr (con el foco en la vista previa no le llegan)', async () => {
      await open()
      fromEditor({ type: 'display', display: arrange })
      await flushPromises()
      editor.postMessage.mockClear()
      const press = (init: KeyboardEventInit) =>
        window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
      press({ key: 'z', metaKey: true })
      press({ key: 'Z', metaKey: true, shiftKey: true })
      press({ key: 'd', ctrlKey: true })
      press({ key: 'Delete' })
      const keys = sent().filter((m) => m.type === 'key')
      expect(keys).toMatchObject([
        { key: 'z', meta: true, shift: false },
        { key: 'z', meta: true, shift: true },
        { key: 'd', meta: true, shift: false },
        { key: 'Delete', meta: false, shift: false },
      ])
    })

    it('fuera de «Acomodar» no reenvía teclas', async () => {
      await open()
      editor.postMessage.mockClear()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
      expect(sent().some((m) => m.type === 'key')).toBe(false)
    })

    it('acepta la elección del editor sin inventar mensajes', async () => {
      await open()
      fromEditor({ type: 'display', display: arrange })
      await flushPromises()
      editor.postMessage.mockClear()
      fromEditor({ type: 'arrange-select', section: 'itinerario', refs: ['texto:title:0'] })
      await flushPromises()
      expect(sent().some((m) => m.type === 'arrange-change')).toBe(false)
    })
  })

  describe('arrastrar desde Elegir', () => {
    // jsdom no calcula cajas: elementsFromPoint devuelve el título de la sección falsa.
    function overTitle(): HTMLElement {
      const title = document.querySelector<HTMLElement>('[data-text="title"]')!
      document.elementsFromPoint = () => [title]
      return title
    }
    const mouse = (type: string, x: number, y: number, init: MouseEventInit = {}) =>
      document.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true, ...init }))

    it('un clic sin mover sigue eligiendo y no entra a Acomodar', async () => {
      await open()
      const title = overTitle()
      mouse('mousedown', 10, 10)
      mouse('mouseup', 10, 10, { buttons: 0 })
      title.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const types = sent().map((m) => m.type)
      expect(types).toContain('pick')
      expect(types).not.toContain('arrange-begin')
    })

    it('pulsar y mover más de 4 px sobre un texto avisa al editor para entrar a Acomodar con ese elemento', async () => {
      await open()
      overTitle()
      mouse('mousedown', 10, 10)
      mouse('mousemove', 12, 10)
      expect(sent().map((m) => m.type)).not.toContain('arrange-begin')
      mouse('mousemove', 30, 22)
      expect(sent().find((m) => m.type === 'arrange-begin')).toMatchObject({ section: 'itinerario', ref: 'texto:title:0' })
      // el velo de Acomodar ya está puesto aunque el editor no haya contestado
      await nextTick()
      expect(document.documentElement.classList.contains('is-arranging')).toBe(true)
    })

    it('sobre el fondo (sin elemento) no arranca nada', async () => {
      await open()
      document.elementsFromPoint = () => []
      mouse('mousedown', 10, 10)
      mouse('mousemove', 60, 60)
      expect(sent().map((m) => m.type)).not.toContain('arrange-begin')
    })
  })
})
