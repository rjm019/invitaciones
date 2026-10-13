import type { ThemeManifest } from '@/themes/types'
import type {
  EventConfig,
  PlacedSection,
  ResolvedSection,
  SectionBackground,
  SectionConfig,
} from '@/types/event'
import type { AssetResolver } from './assetService'
import { spotifyEmbed } from './spotifyService'

/** Palabras con las que el layout apaga los efectos que el tema trae por defecto. */
const NO_EFFECTS = ['ninguno', 'none']

/**
 * Mezcla cada sección del layout con los defaults de su tema. Orden de prioridad:
 * tokens base → defaults del tema para ese tipo de sección → renglón del layout.
 * Las secciones con visible = NO no se devuelven.
 */
export function resolveSections(
  event: Pick<EventConfig, 'sections'>,
  theme: Pick<ThemeManifest, 'sections'>,
  resolveAsset: AssetResolver,
): ResolvedSection[] {
  const seen: Record<string, number> = {}

  return event.sections
    .filter((s) => s.visible !== false)
    .map((section: SectionConfig) => {
      const defaults = theme.sections[section.type] ?? {}
      const effects = section.effects?.length ? section.effects : (defaults.effects ?? [])

      seen[section.type] = (seen[section.type] ?? 0) + 1
      const id = seen[section.type] > 1 ? `${section.type}-${seen[section.type]}` : section.type

      const background = { ...defaults.background, ...section.background }
      const decor = Object.fromEntries(
        Object.entries(defaults.decor ?? {}).map(([slot, file]) => [slot, resolveAsset(file)]),
      )

      return {
        ...section,
        id,
        variant: section.variant ?? defaults.variant,
        desktop: section.desktop ?? defaults.desktop ?? 'full',
        panel: defaults.panel !== false,
        background: Object.keys(background).length ? background : undefined,
        effects: effects.some((e) => NO_EFFECTS.includes(e)) ? [] : [...effects],
        decor,
        ...(defaults.sprites ? { sprites: defaults.sprites } : {}),
      }
    })
}

/** Después de este tiempo desde el inicio, el clima del evento ya no interesa. */
const WEATHER_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * Quita las secciones que no tendrían nada que mostrar: la playlist sin un enlace de
 * Spotify válido y el clima cuando el evento ya pasó. Así no queda un hueco en la página.
 */
export function withContent<T extends SectionConfig>(
  sections: T[],
  event: Pick<EventConfig, 'music' | 'starts_at'>,
  now: number,
): T[] {
  return sections.filter((s) => {
    if (s.type === 'spotify') return spotifyEmbed(event.music.spotify_url) !== null
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
 * lista, tampoco se repiten en las filas de escritorio (izquierda | derecha).
 */
export function withPanels<T extends ResolvedSection>(
  sections: T[],
  panels: SectionBackground[] = [],
): T[] {
  let turn = 0
  let above: string | null = null
  return sections.map((section) => {
    let background = section.background
    if (section.panel && !background && panels.length) {
      for (let tries = 0; tries < panels.length; tries++) {
        background = panels[turn++ % panels.length]
        if (JSON.stringify(background) !== above) break
      }
    }
    above = section.panel ? JSON.stringify(background ?? null) : null
    return background === section.background ? section : { ...section, background }
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
