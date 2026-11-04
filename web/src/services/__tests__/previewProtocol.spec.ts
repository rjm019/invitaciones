import { describe, expect, it } from 'vitest'
import { PREVIEW_CHANNEL, readFromPreview, readToPreview, wrap } from '../previewProtocol'

const display = {
  envelope: 'open',
  guest: 'general',
  muted: true,
  mode: 'select',
  labels: { itinerario: 'Itinerario' },
}
const config = { theme: 'jardin-azul', sections: [], palette: {} }

describe('previewProtocol', () => {
  it('la vista previa acepta solo mensajes del editor con una forma conocida', () => {
    expect(readToPreview(wrap({ type: 'replay' }))).toEqual({ type: 'replay' })
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'config', config, display }),
    ).toMatchObject({ type: 'config' })
    expect(readToPreview({ channel: PREVIEW_CHANNEL, type: 'select', key: 'frase-2' })).toEqual({
      type: 'select',
      key: 'frase-2',
    })
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { palette: { primary: '#000000' } },
      }),
    ).toMatchObject({ type: 'patch' })
    // Con los textos de una sección y los del evento.
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: {
          sections: { itinerario: { title: 'Programa', text: undefined } },
          event: {
            title: 'XV de Ana',
            subtitle: '',
            celebrant: { full_name: 'Ana' },
            venue: { name: '', display_name: '', city: 'Toluca', address: '' },
          },
        },
      }),
    ).toMatchObject({ type: 'patch' })

    // Una invitación en blanco: PHP manda la paleta y las letras vacías como lista ([]).
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'config',
        config: { ...config, palette: [], fonts: [] },
        display,
      }),
    ).toMatchObject({ type: 'config', config: { palette: {}, fonts: {} } })

    // Otro canal, otra forma o datos raros: se ignoran.
    expect(readToPreview({ type: 'replay' })).toBeNull()
    expect(readToPreview({ channel: 'otro', type: 'replay' })).toBeNull()
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'select', key: '"]<script>' }),
    ).toBeNull()
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'config', config: { theme: 1 }, display }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'config',
        config: { ...config, palette: ['#000000'] },
        display,
      }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'display',
        display: { ...display, mode: 'x' },
      }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { palette: { primary: 3 } },
      }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { sections: { itinerario: { title: { html: '<b>' } } } },
      }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { sections: { itinerario: { canvas: [{ id: 'lienzo-1', x: 3 }] } } },
      }),
    ).toMatchObject({ type: 'patch' })
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { sections: { itinerario: { canvas: 'no' } } },
      }),
    ).toBeNull()
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'patch',
        patch: { event: { title: 'XV', subtitle: '', celebrant: { full_name: 1 }, venue: {} } },
      }),
    ).toBeNull()
    expect(readToPreview('hola')).toBeNull()
  })

  it('el editor acepta solo mensajes de la vista previa con una forma conocida', () => {
    expect(readFromPreview(wrap({ type: 'ready' }))).toEqual({ type: 'ready' })
    expect(readFromPreview(wrap({ type: 'pick', key: 'itinerario', block: 'time' }))).toEqual({
      type: 'pick',
      key: 'itinerario',
      block: 'time',
    })
    expect(readFromPreview(wrap({ type: 'hover', key: null, block: null }))).toEqual({
      type: 'hover',
      key: null,
      block: null,
    })
    expect(readFromPreview(wrap({ type: 'rendered', keys: ['portada', 'frase-2'] }))).toEqual({
      type: 'rendered',
      keys: ['portada', 'frase-2'],
    })
    expect(
      readFromPreview({ channel: PREVIEW_CHANNEL, type: 'pick', key: 'x"y', block: null }),
    ).toBeNull()
    expect(
      readFromPreview({ channel: PREVIEW_CHANNEL, type: 'tokens', colors: { bg: 1 }, fonts: {} }),
    ).toBeNull()
  })

  it('el modo «Acomodar» y sus mensajes pasan solo con la forma correcta', () => {
    expect(
      readToPreview({
        channel: PREVIEW_CHANNEL,
        type: 'display',
        display: { ...display, mode: 'arrange' },
      }),
    ).toMatchObject({ type: 'display' })
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'display', display: { ...display, mode: 'x' } }),
    ).toBeNull()
    expect(
      readToPreview(
        wrap({ type: 'arrange-select', section: 'fecha', refs: ['texto:title:0', 'lienzo-2'] }),
      ),
    ).toEqual({ type: 'arrange-select', section: 'fecha', refs: ['texto:title:0', 'lienzo-2'] })
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'arrange-select', section: 'fecha', refs: ['<b>'] }),
    ).toBeNull()
    expect(
      readToPreview({ channel: PREVIEW_CHANNEL, type: 'arrange-select', section: 'a b', refs: [] }),
    ).toBeNull()

    const measure = { x: 1, y: 2, width: 30, height: 10, w: 28, h: 9 }
    const select = {
      type: 'arrange-select',
      section: 'fecha',
      refs: ['imagen:0'],
      measures: { 'imagen:0': measure },
      frame: { content: 390, section: { x: 0, y: 0, width: 390, height: 600 } },
    }
    expect(readFromPreview(wrap(select as never))).toEqual(select)
    expect(readFromPreview(wrap({ ...select, section: null, refs: [], measures: {}, frame: null } as never))).toMatchObject({
      type: 'arrange-select',
      section: null,
    })
    expect(
      readFromPreview(wrap({ ...select, measures: { 'imagen:0': { ...measure, w: 'x' } } } as never)),
    ).toBeNull()
    expect(readFromPreview(wrap({ ...select, frame: { content: 1 } } as never))).toBeNull()

    const change = {
      type: 'arrange-change',
      section: 'fecha',
      changes: [{ ref: 'lienzo-1', values: { x: 10, rotation: 15 } }],
      nudge: false,
    }
    expect(readFromPreview(wrap(change as never))).toEqual(change)
    expect(readFromPreview(wrap({ ...change, changes: [] } as never))).toBeNull()
    expect(
      readFromPreview(wrap({ ...change, changes: [{ ref: 'lienzo-1', values: { x: '10' } }] } as never)),
    ).toBeNull()
    expect(
      readFromPreview(wrap({ ...change, changes: [{ ref: 'lienzo-1', values: { color: 1 } }] } as never)),
    ).toBeNull()
    expect(
      readFromPreview(wrap({ ...change, changes: [{ ref: 'otra-cosa', values: { x: 1 } }] } as never)),
    ).toBeNull()
    expect(readFromPreview(wrap({ ...change, nudge: 'si' } as never))).toBeNull()

    expect(readFromPreview(wrap({ type: 'key', key: 'z', meta: true, shift: false }))).toEqual({
      type: 'key',
      key: 'z',
      meta: true,
      shift: false,
    })
    expect(
      readFromPreview({ channel: PREVIEW_CHANNEL, type: 'key', key: '<script>', meta: false, shift: false }),
    ).toBeNull()
    expect(readFromPreview({ channel: PREVIEW_CHANNEL, type: 'key', key: 'z' })).toBeNull()
  })
})
