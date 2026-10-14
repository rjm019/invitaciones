import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ManagerPreviewPage from '../ManagerPreviewPage.vue'
import { wrap, type PreviewDisplay, type ToPreview } from '@/services/previewProtocol'
import type { EventConfig } from '@/types/event'

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
})
