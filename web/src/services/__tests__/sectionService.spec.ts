import { describe, expect, it } from 'vitest'
import { createAssetResolver } from '../assetService'
import {
  placeOnDesktop,
  resolveSections,
  withContent,
  withEdges,
  withPanels,
} from '../sectionService'
import type { DesktopWidth, ResolvedSection, SectionBackground, SectionConfig } from '@/types/event'

const theme = {
  sections: {
    itinerary: {
      variant: 'zigzag',
      desktop: 'half' as const,
      effects: ['reveal', 'timeline-fill'],
      background: { color: 'surface', image: 'papel.webp' },
      decor: { frame: 'marco-azul.webp', missing: 'no-existe.webp' },
      panelColor: 'panel-pearl',
    },
  },
}
const resolve = createAssetResolver({ 'marco-azul.webp': 'http://api/media/x/marco-azul.webp' })
const section = (s: Partial<SectionConfig>): SectionConfig => ({
  type: 'itinerary',
  effects: [],
  visible: true,
  ...s,
})

describe('resolveSections', () => {
  it('sin datos en el layout usa los defaults del tema y resuelve las decoraciones', () => {
    const [s] = resolveSections({ sections: [section({})] }, theme, resolve)
    expect(s).toMatchObject({
      id: 'itinerary',
      variant: 'zigzag',
      desktop: 'half',
      effects: ['reveal', 'timeline-fill'],
      background: { color: 'surface', image: 'papel.webp' },
      decor: { frame: 'http://api/media/x/marco-azul.webp', missing: null },
      panelColor: 'panel-pearl',
    })
  })

  it('el renglón del layout gana sobre el tema, campo por campo en el fondo', () => {
    const [s] = resolveSections(
      {
        sections: [
          section({
            variant: 'lista',
            effects: ['parallax'],
            background: { image: 'toile.webp', overlay: 0.3 },
          }),
        ],
      },
      theme,
      resolve,
    )
    expect(s.variant).toBe('lista')
    expect(s.desktop).toBe('half')
    expect(s.effects).toEqual(['parallax'])
    expect(s.background).toEqual({ color: 'surface', image: 'toile.webp', overlay: 0.3 })
  })

  it('"ninguno" apaga los efectos del tema; visible = NO oculta la sección', () => {
    const out = resolveSections(
      { sections: [section({ effects: ['ninguno'] }), section({ type: 'quote', visible: false })] },
      theme,
      resolve,
    )
    expect(out).toHaveLength(1)
    expect(out[0].effects).toEqual([])
  })

  it('toda sección es panel salvo la que el tema marca sin panel (la portada)', () => {
    const out = resolveSections(
      { sections: [section({ type: 'hero-envelope' }), section({ type: 'quote' })] },
      { sections: { 'hero-envelope': { panel: false } } },
      resolve,
    )
    expect(out.map((s) => s.panel)).toEqual([false, true])
  })

  it('los adornos de la sección van encima de los del tema; null lo quita', () => {
    const sprites = { frame: { ratio: 1, parts: [] }, other: { ratio: 2, glints: [] } }
    const [s] = resolveSections(
      {
        sections: [
          section({
            key: 'itinerario',
            decor: { frame: 'https://cdn.test/marco.webp', missing: null },
          }),
        ],
      },
      { sections: { itinerary: { ...theme.sections.itinerary, sprites } } },
      resolve,
    )
    expect(s.decor).toEqual({ frame: 'https://cdn.test/marco.webp', missing: null })
    // Las figuras del archivo del tema ya no aplican al adorno cambiado.
    expect(s.sprites).toEqual({ other: { ratio: 2, glints: [] } })
    expect(s.key).toBe('itinerario')
  })

  it('con la página difuminada todas las secciones se funden (aunque apaguen sus efectos)', () => {
    const list = resolveSections(
      {
        sections: [section({}), section({ effects: ['ninguno'] }), section({ effects: ['blend'] })],
        page: { blend: true },
      },
      theme,
      resolve,
    )
    expect(list.map((s) => s.effects)).toEqual([
      ['reveal', 'timeline-fill', 'blend'],
      ['blend'],
      ['blend'],
    ])
  })

  it('dos secciones del mismo tipo reciben ids distintos para sus anclas', () => {
    const out = resolveSections(
      { sections: [section({ type: 'quote' }), section({ type: 'quote' })] },
      theme,
      resolve,
    )
    expect(out.map((s) => s.id)).toEqual(['quote', 'quote-2'])
  })
})

describe('placeOnDesktop', () => {
  const sections = (...widths: DesktopWidth[]) =>
    widths.map(
      (desktop, i) =>
        ({
          type: `s${i}`,
          id: `s${i}`,
          effects: [],
          visible: true,
          decor: {},
          desktop,
          panel: true,
        }) as ResolvedSection,
    )

  it('dos mitades seguidas comparten fila; una completa ocupa toda la fila', () => {
    const out = placeOnDesktop(sections('full', 'half', 'half', 'full'))
    expect(out.map((s) => s.slot)).toEqual(['full', 'left', 'right', 'full'])
  })

  it('una mitad sin pareja se queda con la fila completa (nunca deja hueco)', () => {
    const out = placeOnDesktop(sections('half', 'full', 'half', 'half', 'half'))
    expect(out.map((s) => s.slot)).toEqual(['full', 'full', 'left', 'right', 'full'])
  })

  it('una sección sin ancho en el layout ni en el tema usa toda la fila', () => {
    const [s] = resolveSections({ sections: [section({ type: 'quote' })] }, theme, resolve)
    expect(s.desktop).toBe('full')
  })
})

describe('withContent', () => {
  const hotel = { name: 'Hotel', note: '', address: '', maps_url: '', phone: '', photo: null }
  const event = (spotify: string | null, hotels = [hotel]) => ({
    music: { source: 'file' as const, audio_url: null, spotify_url: spotify },
    starts_at: '2026-11-28T17:00:00-06:00',
    hotels,
  })
  const types = (list: SectionConfig[]) => list.map((s) => s.type)
  const all = [
    section({ type: 'spotify' }),
    section({ type: 'weather' }),
    section({ type: 'quote' }),
  ]
  const before = Date.parse('2026-11-20T12:00:00-06:00')

  it('la playlist solo aparece con un enlace de Spotify válido', () => {
    expect(types(withContent(all, event('https://open.spotify.com/playlist/Ab1'), before))).toEqual(
      ['spotify', 'weather', 'quote'],
    )
    expect(types(withContent(all, event('https://youtube.com/x'), before))).toEqual([
      'weather',
      'quote',
    ])
  })

  it('el clima se quita un día después de que empezó el evento', () => {
    const during = Date.parse('2026-11-28T23:00:00-06:00')
    const after = Date.parse('2026-11-29T17:00:00-06:00')
    expect(types(withContent(all, event(null), during))).toEqual(['weather', 'quote'])
    expect(types(withContent(all, event(null), after))).toEqual(['quote'])
  })

  it('el hospedaje solo aparece si la pestaña hoteles trae alguno', () => {
    const list = [section({ type: 'hotels' }), section({ type: 'quote' })]
    expect(types(withContent(list, event(null), before))).toEqual(['hotels', 'quote'])
    expect(types(withContent(list, event(null, []), before))).toEqual(['quote'])
  })

  it('la mesa de regalos solo aparece con alguna tienda o con la lluvia de sobres', () => {
    const list = [section({ type: 'gifts' }), section({ type: 'quote' })]
    const store = { store: 'liverpool', name: 'Liverpool', note: '', url: '', event_number: '1' }
    const empty = { ...event(null), gifts: { stores: [], envelope: null } }
    const full = { ...event(null), gifts: { stores: [store], envelope: null } }
    expect(types(withContent(list, event(null), before))).toEqual(['quote'])
    expect(types(withContent(list, empty, before))).toEqual(['quote'])
    expect(types(withContent(list, full, before))).toEqual(['gifts', 'quote'])
  })
})

describe('withPanels', () => {
  const A = { color: 'panel' }
  const B = { color: 'panel-alt' }
  const C = { color: 'panel-warm' }
  const sections = (
    ...list: { panel?: boolean; background?: SectionBackground; panelColor?: string }[]
  ) =>
    list.map(
      ({ panel = true, background, panelColor }, i) =>
        ({
          type: `s${i}`,
          id: `s${i}`,
          effects: [],
          visible: true,
          decor: {},
          desktop: 'full',
          panel,
          background,
          ...(panelColor ? { panelColor } : {}),
        }) as ResolvedSection,
    )
  const colors = (list: ResolvedSection[]) => list.map((s) => s.background?.color ?? null)

  it('los paneles sin fondo se turnan los fondos del tema; la portada se queda sin fondo', () => {
    const out = withPanels(sections({ panel: false }, {}, {}, {}, {}), [A, B, C])
    expect(colors(out)).toEqual([null, 'panel', 'panel-alt', 'panel-warm', 'panel'])
  })

  it('el fondo del layout o del tema se respeta y el turno no repite el de arriba', () => {
    const out = withPanels(sections({}, { background: { color: 'panel-alt' } }, {}), [A, B])
    expect(colors(out)).toEqual(['panel', 'panel-alt', 'panel'])
  })

  it('con dos fondos en la lista, dos paneles seguidos nunca quedan iguales', () => {
    const toile = { image: 'toile.webp', fit: 'tile' as const }
    const out = withPanels(sections({}, { background: toile }, {}, {}, {}), [A, B])
    expect(out.map((s) => s.background)).toEqual([A, toile, B, A, B])
  })

  it('con su propio color, la sección gasta su turno: las demás no cambian de fondo', () => {
    const out = withPanels(sections({}, {}, { panelColor: 'panel-pearl' }, {}), [A, B, C])
    expect(colors(out)).toEqual(['panel', 'panel-alt', 'panel-pearl', 'panel'])
  })

  it('las difuminadas no entran en la rotación; su propio color las vuelve franja', () => {
    const list = sections({}, {}, { panelColor: 'panel-pearl' }, {}).map((s, i) =>
      i > 0 ? { ...s, effects: ['blend'] } : s,
    )
    const out = withPanels(list, [A, B, C])
    expect(colors(out)).toEqual(['panel', null, 'panel-pearl', null])
  })

  it('sin fondos en el tema no cambia nada', () => {
    const list = sections({}, {})
    expect(withPanels(list)).toEqual(list)
  })
})

describe('withEdges', () => {
  const band = (s: Partial<ResolvedSection>) =>
    ({
      type: 'quote',
      id: 'quote',
      effects: ['blend'],
      visible: true,
      decor: {},
      desktop: 'full',
      panel: true,
      ...s,
    }) as ResolvedSection
  const edges = (list: ResolvedSection[]) => list.map((s) => s.edge ?? null)

  it('la sección gana; luego la página; luego el tema por color de fondo o el suyo', () => {
    const list = [
      band({ background: { color: 'paper' }, edge: 'wave' }),
      band({ background: { color: 'paper' } }),
      band({ background: { color: 'frame' } }),
    ]
    expect(edges(withEdges(list, 'scallop', { default: 'city', paper: 'torn' }))).toEqual([
      'wave',
      'scallop',
      'scallop',
    ])
    expect(edges(withEdges(list, undefined, { default: 'city', paper: 'torn' }))).toEqual([
      'wave',
      'torn',
      'city',
    ])
  })

  it('sin nada elegido, el papel es hoja rasgada y lo demás queda en degradado', () => {
    const list = [
      band({ background: { color: 'paper' } }),
      band({ background: { color: '#333333' } }),
    ]
    expect(edges(withEdges(list))).toEqual(['torn', null])
  })

  it('solo las franjas: sin fondo o sin difuminar, nada cambia', () => {
    const list = [band({}), band({ effects: [], background: { color: 'paper' } })]
    expect(withEdges(list, 'city')).toEqual(list)
  })
})
