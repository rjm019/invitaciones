/**
 * Colores para el editor: conversiones (hex ↔ HSV/HSL), contraste WCAG, paletas sugeridas y
 * "crear desde mi color" (con el principal y el acento se arma el resto). Las claves de la
 * paleta van en español, como en invitacion.csv.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}
export interface Hsv {
  /** 0–360 */
  h: number
  /** 0–1 */
  s: number
  v: number
}
export interface Hsl {
  h: number
  s: number
  l: number
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))

/** "#abc", "ABCDEF" o "#AABBCC" → "#AABBCC"; null si no es un color. */
export function normalizeHex(value: string): string | null {
  const v = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(v)) return `#${[...v].map((c) => c + c).join('')}`.toUpperCase()
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v}`.toUpperCase()
  if (/^[0-9a-f]{8}$/i.test(v)) return `#${v.slice(0, 6)}`.toUpperCase()
  return null
}

export function hexToRgb(hex: string): Rgb {
  const v = (normalizeHex(hex) ?? '#000000').slice(1)
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

export function hexToHsv(hex: string): Hsv {
  const { r, g, b } = hexToRgb(hex)
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const d = max - Math.min(R, G, B)
  let h = 0
  if (d) {
    if (max === R) h = ((G - B) / d) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex)
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  const d = max - min
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h: hexToHsv(hex).h, s, l }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * clamp(s)
  const v = l + c / 2
  return hsvToHex({ h, s: v ? (2 * (v - l)) / v : 0, v })
}

/** Mezcla dos colores: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t })
}

/** Luminancia relativa (WCAG). */
export function luminance(hex: string): number {
  const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Contraste WCAG entre dos colores (1 a 21). 4.5 es lo mínimo para leer texto normal. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Texto que se lee bien encima de un color (para la muestra del selector). */
export function readableOn(hex: string): string {
  return contrast(hex, '#FFFFFF') >= contrast(hex, '#1E293B') ? '#FFFFFF' : '#1E293B'
}

/** Fondos de los paneles a partir de la paleta (el tema los turna entre secciones). */
export function panelsFor(colors: Record<string, string>): Record<string, string> {
  const superficie = colors.superficie ?? '#FFFFFF'
  const acento = colors.acento ?? '#C9DBE8'
  const claro = colors.primario_claro ?? '#E2C77A'
  const dark = luminance(colors.fondo ?? '#FFFFFF') < 0.2
  return dark
    ? {
        panel: mix(superficie, '#000000', 0.15),
        panel_alt: mix(superficie, acento, 0.12),
        panel_warm: mix(superficie, claro, 0.1),
      }
    : {
        panel: mix(superficie, '#FFFFFF', 0.6),
        panel_alt: mix(acento, '#FFFFFF', 0.8),
        panel_warm: mix(claro, '#FFFFFF', 0.7),
      }
}

/**
 * "Crear desde mi color": con el color principal (títulos, dorado) y el acento se arma la
 * paleta completa, con proporciones como las del diseño NAT.
 */
export function derivePalette(principal: string, acento: string): Record<string, string> {
  const p = hexToHsl(principal)
  const a = hexToHsl(acento)
  const colors: Record<string, string> = {
    fondo: hslToHex({ h: p.h, s: Math.min(0.3, p.s * 0.35), l: 0.945 }),
    texto: hslToHex({ h: p.h, s: Math.min(0.75, p.s), l: 0.18 }),
    primario: normalizeHex(principal) ?? principal,
    primario_fuerte: hslToHex({ h: p.h, s: clamp(p.s * 1.15), l: clamp(p.l * 1.2, 0, 0.62) }),
    primario_claro: hslToHex({ h: p.h, s: clamp(p.s * 0.95), l: 0.68 }),
    acento: normalizeHex(acento) ?? acento,
    acento_suave: hslToHex({ h: a.h, s: clamp(a.s * 0.6), l: 0.86 }),
    acento_fuerte: hslToHex({ h: a.h, s: clamp(a.s * 0.45), l: 0.43 }),
    superficie: hslToHex({ h: p.h, s: 0.06, l: 0.965 }),
    marco: hslToHex({ h: a.h, s: clamp(a.s * 0.45), l: 0.76 }),
  }
  return { ...colors, ...panelsFor(colors) }
}

export interface PalettePreset {
  id: string
  label: string
  colors: Record<string, string>
}

const preset = (id: string, label: string, colors: Record<string, string>): PalettePreset => ({
  id,
  label,
  colors: { ...colors, ...panelsFor(colors) },
})

/** Paletas listas para usar de un clic. */
export const PALETTE_PRESETS: PalettePreset[] = [
  preset('jardin-azul', 'Jardín azul', {
    fondo: '#F3F1EC',
    texto: '#523C0B',
    primario: '#96792C',
    primario_fuerte: '#C0902C',
    primario_claro: '#E2C77A',
    acento: '#8CC0E8',
    acento_suave: '#C8DDEE',
    acento_fuerte: '#4A7194',
    superficie: '#F6F6F6',
    marco: '#ABC1D9',
  }),
  preset('rosa-palo', 'Rosa palo', {
    fondo: '#FBF4F2',
    texto: '#5A3A3A',
    primario: '#B07A6E',
    primario_fuerte: '#C9897A',
    primario_claro: '#E9C4BA',
    acento: '#D9A5B3',
    acento_suave: '#F2D9DF',
    acento_fuerte: '#9E5A6B',
    superficie: '#FFFFFF',
    marco: '#E3C2C8',
  }),
  preset('salvia', 'Verde salvia', {
    fondo: '#F3F5EF',
    texto: '#2F3B2F',
    primario: '#7A8B6F',
    primario_fuerte: '#8FA57F',
    primario_claro: '#C9D4BC',
    acento: '#B8A47E',
    acento_suave: '#E6DCC8',
    acento_fuerte: '#5E6B52',
    superficie: '#FBFCF9',
    marco: '#C3CDB7',
  }),
  preset('lavanda', 'Lavanda', {
    fondo: '#F6F3FA',
    texto: '#3B2F4A',
    primario: '#8E7AB5',
    primario_fuerte: '#A48FCC',
    primario_claro: '#D6CBEA',
    acento: '#B6A3D9',
    acento_suave: '#E8E0F4',
    acento_fuerte: '#5E4B8B',
    superficie: '#FFFFFF',
    marco: '#CDBFE3',
  }),
  preset('terracota', 'Terracota', {
    fondo: '#FAF3EC',
    texto: '#4A2E22',
    primario: '#B5653F',
    primario_fuerte: '#C97B52',
    primario_claro: '#E8B79A',
    acento: '#6E8B74',
    acento_suave: '#D4E0D6',
    acento_fuerte: '#4F6655',
    superficie: '#FFFBF7',
    marco: '#DDBBA5',
  }),
  preset('marino', 'Azul marino y oro', {
    fondo: '#F2F4F8',
    texto: '#1F2A44',
    primario: '#2E4A7D',
    primario_fuerte: '#3D5E99',
    primario_claro: '#A9B9D6',
    acento: '#C8A75D',
    acento_suave: '#EEE3C7',
    acento_fuerte: '#9C7E3A',
    superficie: '#FFFFFF',
    marco: '#B7C3D9',
  }),
  preset('champana', 'Champaña', {
    fondo: '#FBF8F1',
    texto: '#4D4030',
    primario: '#B39B6B',
    primario_fuerte: '#C9AF7C',
    primario_claro: '#E8DCC0',
    acento: '#D8C3A5',
    acento_suave: '#F3EBDD',
    acento_fuerte: '#8C7651',
    superficie: '#FFFFFF',
    marco: '#E2D5BC',
  }),
  preset('noche', 'Negro y oro', {
    fondo: '#111111',
    texto: '#F5EBD7',
    primario: '#C9A24B',
    primario_fuerte: '#E0B85A',
    primario_claro: '#F1D99A',
    acento: '#8C7A5B',
    acento_suave: '#2A2620',
    acento_fuerte: '#D4AF37',
    superficie: '#1C1C1C',
    marco: '#3A3226',
  }),
]
