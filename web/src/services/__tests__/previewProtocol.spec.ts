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
})
