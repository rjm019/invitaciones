import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, shallowRef } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { usePreviewHost, type PreviewHandlers } from '../usePreviewHost'
import { wrap, type PreviewDisplay } from '@/services/previewProtocol'
import type { EventConfig } from '@/types/event'

const display: PreviewDisplay = {
  envelope: 'open',
  guest: 'general',
  muted: true,
  mode: 'select',
  labels: {},
}
const config = { theme: 'jardin-azul', palette: {}, sections: [] } as unknown as EventConfig

let wrapper: VueWrapper | null = null

function setup(handlers: PreviewHandlers = {}) {
  // La ventana del iframe: solo se le manda (happy-dom no carga páginas en iframes).
  const posted = vi.fn()
  const child = { postMessage: posted } as unknown as Window
  // shallowRef, como un elemento de verdad: Vue no envuelve la ventana en un proxy.
  const frame = shallowRef({ contentWindow: child } as unknown as HTMLIFrameElement)
  let host!: ReturnType<typeof usePreviewHost>
  wrapper = mount(
    defineComponent({
      setup() {
        host = usePreviewHost(frame, handlers)
        return () => null
      },
    }),
  )
  // Un MessageEvent a mano: happy-dom no acepta una ventana falsa como `source`.
  const fromPreview = (data: unknown, init: { origin?: string; source?: unknown } = {}) =>
    window.dispatchEvent(
      Object.assign(new Event('message'), {
        data,
        origin: location.origin,
        source: child,
        ...init,
      }),
    )
  return { host, posted, fromPreview, frame }
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('usePreviewHost', () => {
  it('no manda nada hasta que la vista previa avisa; entonces le manda lo último', () => {
    const { host, posted, fromPreview } = setup()
    host.sendConfig(config, display)
    host.sendPatch({ palette: { primary: '#000000' } })
    host.select('itinerario')
    expect(posted).not.toHaveBeenCalled()

    fromPreview(wrap({ type: 'ready' }))
    expect(host.ready.value).toBe(true)
    expect(posted).toHaveBeenCalledTimes(1)
    expect(posted).toHaveBeenCalledWith(wrap({ type: 'config', config, display }), location.origin)

    host.sendPatch({ palette: { primary: '#111111' } })
    host.select('itinerario')
    host.replay()
    expect(posted.mock.calls.map(([m]) => (m as { type: string }).type)).toEqual([
      'config',
      'patch',
      'select',
      'replay',
    ])
  })

  it('si la vista previa se recarga, al volver le manda la config con la vista de ahora', () => {
    const { host, posted, fromPreview } = setup()
    host.sendConfig(config, display)
    fromPreview(wrap({ type: 'ready' }))

    host.reset()
    const closed = { ...display, envelope: 'closed' as const }
    host.sendDisplay(closed)
    host.sendPatch({})
    expect(posted).toHaveBeenCalledTimes(1)

    fromPreview(wrap({ type: 'ready' }))
    expect(posted).toHaveBeenLastCalledWith(
      wrap({ type: 'config', config, display: closed }),
      location.origin,
    )
  })

  it('cada vez que la vista previa avisa que está lista, el editor manda lo demás', () => {
    const onReady = vi.fn()
    const { host, fromPreview } = setup({ onReady })
    fromPreview(wrap({ type: 'ready' }))
    fromPreview(wrap({ type: 'ready' }))
    expect(onReady).toHaveBeenCalledTimes(2)
    expect(host.ready.value).toBe(true)
  })

  it('si el iframe se vuelve a montar, espera a que el nuevo avise', async () => {
    const { host, posted, fromPreview, frame } = setup()
    fromPreview(wrap({ type: 'ready' }))
    const other = vi.fn()
    frame.value = { contentWindow: { postMessage: other } } as unknown as HTMLIFrameElement
    await nextTick()
    expect(host.ready.value).toBe(false)
    host.sendPatch({})
    expect(other).not.toHaveBeenCalled()
    expect(posted).not.toHaveBeenCalled()
  })

  it('avisa qué tocó la persona, qué se pintó y los colores del tema', () => {
    const handlers = { onPick: vi.fn(), onHover: vi.fn(), onRendered: vi.fn(), onTokens: vi.fn() }
    const { fromPreview } = setup(handlers)

    fromPreview(wrap({ type: 'pick', key: 'itinerario', block: 'time' }))
    fromPreview(wrap({ type: 'hover', key: 'frase-2', block: null }))
    fromPreview(wrap({ type: 'rendered', keys: ['portada', 'frase-2'] }))
    fromPreview(
      wrap({ type: 'tokens', colors: { primary: '#96792c' }, fonts: { script: 'Pinyon Script' } }),
    )

    expect(handlers.onPick).toHaveBeenCalledWith('itinerario', 'time')
    expect(handlers.onHover).toHaveBeenCalledWith('frase-2', null)
    expect(handlers.onRendered).toHaveBeenCalledWith(['portada', 'frase-2'])
    expect(handlers.onTokens).toHaveBeenCalledWith(
      { primary: '#96792c' },
      { script: 'Pinyon Script' },
    )
  })

  it('ignora mensajes de otro origen, de otra ventana o con una forma rara', () => {
    const onPick = vi.fn()
    const { host, fromPreview } = setup({ onPick })
    const pick = wrap({ type: 'pick', key: 'itinerario', block: null })

    fromPreview(pick, { origin: 'https://otro.example' })
    fromPreview(pick, { source: window })
    fromPreview({ type: 'pick', key: 'itinerario', block: null })
    fromPreview(wrap({ type: 'pick', key: '<img onerror=x>', block: null } as never))
    fromPreview(wrap({ type: 'ready' }), { origin: 'https://otro.example' })

    expect(onPick).not.toHaveBeenCalled()
    expect(host.ready.value).toBe(false)
  })

  it('deja de escuchar al salir del editor', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    setup()
    wrapper!.unmount()
    wrapper = null
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function))
    remove.mockRestore()
  })
})
