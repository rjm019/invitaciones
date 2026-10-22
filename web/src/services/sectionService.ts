import type { ThemeManifest } from '@/themes/types'
import type {
  EdgeStyle,
  EventConfig,
  PlacedSection,
  ResolvedSection,
  SectionBackground,
  SectionConfig,
} from '@/types/event'
import type { AssetResolver } from './assetService'
import { hasGifts } from './giftService'
import { spotifyEmbed } from './spotifyService'

/** Palabras con las que el layout apaga los efectos que el tema trae por defecto. */
const NO_EFFECTS = ['ninguno', 'none']

/**
 * Mezcla cada sección del layout con los defaults de su tema. Orden de prioridad:
 * tokens base → defaults del tema para ese tipo de sección → renglón del layout.
 * Las secciones con visible = NO no se devuelven. Con la página difuminada (page.blend),
 * todas llevan además el efecto "blend": ninguna se ve como tarjeta.
 */
export function resolveSections(
  event: Pick<EventConfig, 'sections' | 'page'>,
  theme: Pick<ThemeManifest, 'sections'>,
  resolveAsset: AssetResolver,
): ResolvedSection[] {
  const seen: Record<string, number> = {}

  return event.sections
    .filter((s) => s.visible !== false)
    .map((section: SectionConfig) => {
      const defaults = theme.sections[section.type] ?? {}
      const own = section.effects?.length ? section.effects : (defaults.effects ?? [])
      const effects = own.some((e) => NO_EFFECTS.includes(e)) ? [] : [...own]
      if (event.page?.blend && !effects.includes('blend')) effects.push('blend')

      seen[section.type] = (seen[section.type] ?? 0) + 1
      const id = seen[section.type] > 1 ? `${section.type}-${seen[section.type]}` : section.type

      const background = { ...defaults.background, ...section.background }
      // Los adornos que la invitación cambia en esta sección van encima de los del tema
      // (null = sin ese adorno). Las figuras animadas (sprites) se miden sobre el archivo
      // del tema: con otro archivo ya no aplican.
      const files: Record<string, string | null> = { ...defaults.decor, ...section.decor }
      const decor = Object.fromEntries(
        Object.entries(files).map(([slot, file]) => [slot, file ? resolveAsset(file) : null]),
      )
      const changed = new Set(Object.keys(section.decor ?? {}))
      const sprites = defaults.sprites
        ? Object.fromEntries(
            Object.entries(defaults.sprites).filter(([slot]) => !changed.has(slot)),
          )
        : undefined

      return {
        ...section,
        id,
        variant: section.variant ?? defaults.variant,
        desktop: section.desktop ?? defaults.desktop ?? 'full',
        panel: defaults.panel !== false,
        ...(defaults.panelColor ? { panelColor: defaults.panelColor } : {}),
        background: Object.keys(background).length ? background : undefined,
        effects,
        decor,
        ...(sprites && Object.keys(sprites).length ? { sprites } : {}),
      }
    })
}

/** Después de este tiempo desde el inicio, el clima del evento ya no interesa. */
const WEATHER_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * Quita las secciones que no tendrían nada que mostrar: la playlist sin un enlace de
 * Spotify válido, el hospedaje sin hoteles, la mesa de regalos sin tiendas ni sobres, la galería sin fotos y el
 * clima cuando el evento ya pasó. Así no queda un hueco en la página.
 */
export function withContent<T extends SectionConfig>(
  sections: T[],
  event: Pick<EventConfig, 'music' | 'starts_at' | 'hotels' | 'gifts' | 'envelope'>,
  now: number,
): T[] {
  return sections.filter((s) => {
    if (s.type === 'spotify') return spotifyEmbed(event.music.spotify_url) !== null
    if (s.type === 'hotels') return event.hotels.length > 0
    if (s.type === 'gifts') return hasGifts(event.gifts)
    if (s.type === 'envelope-rain') return !!event.envelope
    if (s.type === 'gallery') return (s.photos?.length ?? 0) > 0
    if (s.type === 'weather') {
      const start = event.starts_at ? Date.parse(event.starts_at) : NaN
      return Number.isFinite(start) && now < start + WEATHER_AFTER_MS
    }
    return true
  })
}

/**
 * Fondo de cada panel. El que no trae uno (ni del layout ni del tema) toma el siguiente
 * de la lista del tema, saltando el de la sección de arriba: dos secciones seguidas nunca
 * se ven iguales, aunque el layout oculte o reordene secciones. Con tres fondos en la
 * lista, tampoco se repiten en las filas de escritorio (izquierda | derecha). Con
 * `panelColor`, la sección gasta su turno pero se pinta de su color.
 *
 * Una sección difuminada (efecto "blend") no es panel: no entra en la rotación y va sobre
 * el papel, salvo que traiga su propio fondo (o `panelColor`): entonces es una franja.
 */
export function withPanels<T extends ResolvedSection>(
  sections: T[],
  panels: SectionBackground[] = [],
): T[] {
  let turn = 0
  let above: string | null = null
  return sections.map((section) => {
    let background = section.background
    if (section.effects.includes('blend')) {
      above = null
      if (!background && section.panelColor) background = { color: section.panelColor }
      return background === section.background ? section : { ...section, background }
    }
    if (section.panel && !background && panels.length) {
      for (let tries = 0; tries < panels.length; tries++) {
        background = panels[turn++ % panels.length]
        if (JSON.stringify(background) !== above) break
      }
      // Usa su turno (las demás no se recorren), pero con su propio color.
      if (section.panelColor) background = { color: section.panelColor }
    }
    above = section.panel ? JSON.stringify(background ?? null) : null
    return background === section.background ? section : { ...section, background }
  })
}

/**
 * La orilla de cada franja (sección difuminada con fondo): la que pide la sección; si no,
 * la de la página; si no, la que el tema pone para ese color de fondo (`paper`, `frame`…)
 * o la suya de siempre. El papel, si nadie dice otra cosa, asoma por una hoja rasgada.
 * Sin ninguna, se queda sin (SectionShell la pinta en degradado).
 */
export function withEdges<T extends ResolvedSection>(
  sections: T[],
  pageEdge?: EdgeStyle,
  themeEdges: ThemeManifest['edges'] = {},
): T[] {
  return sections.map((section) => {
    const background = section.background
    if (!section.effects.includes('blend') || !(background?.color || background?.image)) {
      return section
    }
    const token = background.color && !background.color.startsWith('#') ? background.color : ''
    const edge =
      section.edge ??
      pageEdge ??
      themeEdges[token] ??
      themeEdges.default ??
      (token === 'paper' ? 'torn' : undefined)
    return edge && edge !== section.edge ? { ...section, edge } : section
  })
}

/**
 * Acomodo para pantallas grandes: dos secciones "half" seguidas comparten fila
 * (izquierda y derecha). Una "half" sin pareja se queda con la fila completa,
 * así nunca queda un hueco. Recibe solo las secciones que de verdad se pintan.
 */
export function placeOnDesktop(sections: ResolvedSection[]): PlacedSection[] {
  const placed: PlacedSection[] = []
  for (let i = 0; i < sections.length; i++) {
    const current = sections[i]
    const next = sections[i + 1]
    if (current.desktop === 'half' && next?.desktop === 'half') {
      placed.push({ ...current, slot: 'left' }, { ...next, slot: 'right' })
      i++
    } else {
      placed.push({ ...current, slot: 'full' })
    }
  }
  return placed
}
