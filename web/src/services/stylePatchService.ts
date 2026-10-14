import type { Catalog, Design, DesignSection } from '@/types/design'
import type { TextStyle } from '@/types/event'
import { isVisible, sectionKind } from './designService'
import type { StylePatch } from './previewProtocol'

/**
 * Lo que es estilo en la invitación (paleta, fuentes, colores y textos de cada sección) →
 * el cambio que la vista previa aplica al instante, antes de que responda el servidor.
 * Sigue las mismas reglas que InvitationConfigBuilder (api), con los nombres del catálogo;
 * la config del servidor llega ~0.5 s después y la confirma.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{1,59}$/
const WORD = /^[a-z0-9 _-]+$/i

const kebab = (key: string) => key.trim().toLowerCase().replace(/_/g, '-')

/** "acento_fuerte" → "accent-strong"; un nombre propio pasa en kebab-case. */
export function colorToken(catalog: Catalog, name: string): string {
  const key = name.trim().toLowerCase()
  return catalog.colors.find((c) => c.key === key)?.token ?? kebab(key)
}

/** Un hex (en mayúsculas) o el nombre de otro color de la paleta; null si no es un color. */
export function colorValue(catalog: Catalog, value: string | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  if (v.startsWith('#')) return HEX.test(v) ? v.toUpperCase() : null
  return WORD.test(v) ? colorToken(catalog, v) : null
}

export function palette(catalog: Catalog, colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors)
      .filter(([, v]) => HEX.test(v.trim()))
      .map(([k, v]) => [colorToken(catalog, k), v.trim().toUpperCase()]),
  )
}

export function fonts(catalog: Catalog, roles: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(roles)
      .filter(([, family]) => FAMILY.test(family.trim()))
      .map(([role, family]) => [
        catalog.fonts.find((f) => f.key === role)?.role ?? kebab(role),
        family.trim(),
      ]),
  )
}

/** color_<nombre> de una sección (menos color_fondo, que es el fondo del panel). */
export function sectionColors(catalog: Catalog, section: DesignSection): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(section.fields)) {
    if (!key.startsWith('color_') || key === 'color_fondo') continue
    const color = colorValue(catalog, value)
    if (color) out[colorToken(catalog, key.slice(6))] = color
  }
  return out
}

/** Letra, color y tamaño de cada texto de la sección; los comunes toman lo de "textos". */
export function sectionTextStyles(
  catalog: Catalog,
  section: DesignSection,
  texts: Record<string, string>,
): Record<string, TextStyle> {
  const blocks =
    catalog.sections.find((s) => s.id === sectionKind(section.id))?.texts ?? catalog.texts
  const common = new Set(catalog.texts.map((t) => t.key))
  const out: Record<string, TextStyle> = {}
  for (const { key, block } of blocks) {
    const read = (prop: string) => {
      const own = (section.fields[`${key}_${prop}`] ?? '').trim()
      return own || (common.has(key) ? (texts[`${key}_${prop}`] ?? '').trim() : '')
    }
    const style: TextStyle = {}
    const font = read('fuente')
    if (font && FAMILY.test(font)) style.font = font
    const color = colorValue(catalog, read('color'))
    if (color) style.color = color
    const size = Number(read('tamano').replace(',', '.').replace('%', ''))
    if (
      read('tamano') &&
      Number.isFinite(size) &&
      size >= catalog.text_size.min &&
      size <= catalog.text_size.max
    ) {
      style.size = Math.round(size * 10) / 1000
    }
    if (Object.keys(style).length) out[block] = style
  }
  return out
}

export function stylePatch(catalog: Catalog, design: Design): StylePatch {
  const sections: StylePatch['sections'] = {}
  const extra = new Set<string>()
  for (const section of design.sections) {
    if (!isVisible(section)) continue
    const styles = sectionTextStyles(catalog, section, design.texts)
    Object.values(styles).forEach((s) => s.font && extra.add(s.font))
    const colors = sectionColors(catalog, section)
    sections[section.id] = {
      colors: Object.keys(colors).length ? colors : undefined,
      text_styles: Object.keys(styles).length ? styles : undefined,
    }
  }
  return {
    palette: palette(catalog, design.colors),
    fonts: fonts(catalog, design.fonts),
    extra_fonts: [...extra],
    sections,
  }
}
