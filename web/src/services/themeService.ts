import type { ThemeFont, ThemeManifest } from '@/themes/types'

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const TOKEN = /^[a-z0-9][a-z0-9-]*$/

/** Respaldo genérico por rol, por si Google Fonts no carga. */
const FALLBACK: Record<string, string> = {
  script: 'cursive',
  'script-mono': 'cursive',
}

/** Paleta del layout → variables CSS. Los colores inválidos se ignoran (no rompen el tema). */
export function paletteVars(palette: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette)
      .filter(([token, color]) => TOKEN.test(token) && HEX.test(color))
      .map(([token, color]) => [`--color-${token}`, color]),
  )
}

/**
 * Fuentes del tema con las sustituciones del layout. Si la fuente nueva es una que el
 * tema ya conoce, se reutilizan sus pesos; si no, se pide solo el peso normal (pedir un
 * peso que la fuente no tiene hace fallar a Google Fonts).
 */
export function resolveFonts(
  themeFonts: ThemeManifest['fonts'],
  overrides: Record<string, string>,
): Record<string, ThemeFont> {
  const known = new Map(Object.values(themeFonts).map((f) => [f.family.toLowerCase(), f]))
  const out: Record<string, ThemeFont> = { ...themeFonts }
  for (const [role, family] of Object.entries(overrides)) {
    if (!TOKEN.test(role) || !family.trim()) continue
    out[role] = known.get(family.trim().toLowerCase()) ?? { family: family.trim() }
  }
  return out
}

export function fontVars(fonts: Record<string, ThemeFont>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fonts).map(([role, font]) => [
      `--font-${role}`,
      `"${font.family.replace(/"/g, '')}", ${FALLBACK[role] ?? 'serif'}`,
    ]),
  )
}

/** Una sola hoja de Google Fonts con todas las familias (sin repetir). */
export function googleFontsUrl(fonts: ThemeFont[]): string | null {
  const byFamily = new Map<string, Set<number>>()
  for (const font of fonts) {
    const weights = byFamily.get(font.family) ?? new Set<number>()
    font.weights?.forEach((w) => weights.add(w))
    byFamily.set(font.family, weights)
  }
  if (!byFamily.size) return null

  const families = [...byFamily].map(([family, weights]) => {
    const name = encodeURIComponent(family).replace(/%20/g, '+')
    const list = [...weights].sort((a, b) => a - b)
    return `family=${name}${list.length ? `:wght@${list.join(';')}` : ''}`
  })
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/** Aplica tema, paleta y fuentes al documento. Devuelve la función que lo revierte. */
export function applyTheme(
  root: HTMLElement,
  themeId: string,
  vars: Record<string, string>,
  fontsUrl: string | null,
): () => void {
  root.dataset.theme = themeId
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value))

  let link = document.getElementById('theme-fonts') as HTMLLinkElement | null
  if (fontsUrl) {
    link ??= Object.assign(document.createElement('link'), { id: 'theme-fonts', rel: 'stylesheet' })
    link.href = fontsUrl
    if (!link.isConnected) document.head.appendChild(link)
  }

  return () => {
    delete root.dataset.theme
    Object.keys(vars).forEach((name) => root.style.removeProperty(name))
  }
}
