import type { SectionBackground } from '@/types/event'
import type { AssetResolver } from './assetService'

/**
 * Convierte un fondo en variables CSS (--section-bg-color, --section-bg-image,
 * --section-overlay; o --page-… para el fondo de toda la página). Si la imagen no
 * existe, solo queda el color: nunca una imagen rota.
 */
export function backgroundVars(
  background: SectionBackground | undefined,
  resolveAsset: AssetResolver,
  prefix: '--section' | '--page' = '--section',
): Record<string, string> {
  if (!background) return {}
  const vars: Record<string, string> = {}

  const color = colorValue(background.color)
  if (color) vars[`${prefix}-bg-color`] = color

  const image = resolveAsset(background.image)
  if (image) {
    vars[`${prefix}-bg-image`] = `url("${image.replace(/"/g, '%22')}")`
    // Mosaico: el estampado se repite a su tamaño en vez de estirarse (no se ve borroso en escritorio).
    if (background.fit === 'tile') {
      vars[`${prefix}-bg-size`] = 'var(--bg-tile-size) auto'
      vars[`${prefix}-bg-repeat`] = 'repeat'
    }
  }

  if (typeof background.overlay === 'number' && background.overlay > 0) {
    vars[`${prefix}-overlay`] = String(Math.min(1, background.overlay))
  }

  return vars
}

/** "#F0EDE8" pasa tal cual; "lino" o "surface" se vuelven var(--color-…). */
export function colorValue(color: string | undefined): string | null {
  const value = color?.trim()
  if (!value) return null
  if (value.startsWith('#')) return value
  return /^[a-z0-9-]+$/i.test(value) ? `var(--color-${value.toLowerCase()})` : null
}
