import type { Catalog, Design, DesignSection, DesignValues } from '@/types/design'
import type { CanvasElement, CanvasValues, TextStyle } from '@/types/event'
import { isVisible, sameDesign, sectionKind } from './designService'
import type { PreviewPatch } from './previewProtocol'

/**
 * Lo que la vista previa muestra al instante, antes de que responda el servidor: el estilo
 * (paleta, fuentes, colores y letra/color/tamaño de cada texto) y los textos que pasan tal
 * cual (títulos, subtítulos, textos y botones de cada sección; los nombres, el título y el
 * salón del evento) y el lienzo (posición, giro, tamaño…). Sigue las mismas reglas que InvitationConfigBuilder (api), con los
 * nombres del catálogo; la config del servidor llega después y la confirma.
 *
 * Lo que el parche ya muestra no tiene prisa por guardarse (needsServer).
 */

/** Textos de cada sección que van tal cual a su config ("titulo" → title). */
const SECTION_TEXTS = { titulo: 'title', subtitulo: 'subtitle', texto: 'text', boton: 'button' }

/** Del evento: lo que se escribe y se ve tal cual (títulos, nombres y salón). */
const EVENT_TEXTS = [
  'titulo',
  'subtitulo',
  'festejada',
  'festejada_corto',
  'pareja',
  'salon',
  'salon_nombre_visible',
  'salon_ciudad',
  'salon_direccion',
]

/** Del evento: lo que no sale en la invitación (el mensaje de WhatsApp es del panel). */
const EVENT_UNSEEN = ['mensaje_whatsapp']

/** color_<nombre> (menos color_fondo) y <bloque>_fuente|_color|_tamano. */
const STYLE_FIELD = /^(color_(?!fondo$)[a-z0-9_]+|[a-z0-9_]+_(fuente|color|tamano))$/

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

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

/** Un número dentro de [min, max] (con coma o punto); null si falta o no cabe. */
function canvasNumber(value: string | undefined, min: number, max: number): number | null {
  const v = (value ?? '').trim().replace(/,/g, '.')
  if (!NUMERIC.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

const flagKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** SI/NO (y sus variantes); null si falta o no se entiende. */
function canvasFlag(value: string | undefined): boolean | null {
  const key = flagKey((value ?? '').trim())
  if (key === '') return null
  if (['no', 'n', 'false', '0'].includes(key)) return false
  return ['si', 's', 'x', 'yes', 'true', '1'].includes(key) ? true : null
}

const CANVAS_RANGES: Record<string, [string, number, number]> = {
  x: ['x', -100, 200],
  y: ['y', -200, 2000],
  ancho: ['width', 1, 300],
  alto: ['height', 1, 600],
  rotacion: ['rotation', -360, 360],
  escala: ['scale', 0.1, 5],
  escala_y: ['scale_y', 0.1, 5],
  opacidad: ['opacity', 0, 100],
}
const CANVAS_KINDS = { texto: 'text', imagen: 'image', forma: 'shape' } as const
const CANVAS_SHAPES = { linea: 'line', rectangulo: 'rectangle', circulo: 'circle' } as const
const CANVAS_ALIGN = { izquierda: 'left', centro: 'center', derecha: 'right' } as const

/** El lienzo de una sección como lo arma el servidor (InvitationConfigBuilder::canvas); lo inválido se omite. */
export function sectionCanvas(catalog: Catalog, section: DesignSection): CanvasElement[] {
  const out: CanvasElement[] = []
  ;(section.canvas ?? []).forEach((row, n) => {
    const entry: CanvasElement = { id: `lienzo-${n + 1}` }
    const target = (row.objetivo ?? '').trim()
    if (target) {
      if (!/^(texto:[a-z0-9_]{1,40}:\d{1,3}|imagen:\d{1,3})$/.test(target)) return
      entry.target = target
    } else {
      const type = flagKey(row.tipo ?? '') as keyof typeof CANVAS_KINDS
      if (!(type in CANVAS_KINDS)) return
      entry.kind = CANVAS_KINDS[type]
      if (type === 'texto') {
        const text = (row.texto ?? '').trim()
        if (!text) return
        entry.text = text
        const font = (row.letra ?? '').trim()
        if (font && FAMILY.test(font)) entry.font = font
        const size = canvasNumber(row.tamano, 0.5, 40)
        if (size !== null) entry.size = size
        const align = flagKey(row.alineacion ?? '') as keyof typeof CANVAS_ALIGN
        if (align in CANVAS_ALIGN) entry.align = CANVAS_ALIGN[align]
      } else if (type === 'imagen') {
        const file = (row.imagen ?? '').trim()
        if (!file) return
        entry.image = file
      } else {
        const shape = flagKey(row.forma ?? '') as keyof typeof CANVAS_SHAPES
        if (!(shape in CANVAS_SHAPES)) return
        entry.shape = CANVAS_SHAPES[shape]
      }
      if (type !== 'texto') {
        const radius = canvasNumber(row.radio, 0, 50)
        if (radius !== null) entry.radius = radius
      }
      const color = colorValue(catalog, row.color)
      if (color) entry.color = color
      if (type !== 'texto') {
        const border = canvasNumber(row.borde, 0, 40)
        if (border !== null) entry.border = border
      }
    }
    const values = entry as unknown as Record<string, unknown>
    for (const [field, [key, min, max]] of Object.entries(CANVAS_RANGES)) {
      const n = canvasNumber(row[field], min, max)
      if (n !== null) values[key] = n
    }
    for (const [field, key] of [
      ['voltear_h', 'flip_h'],
      ['voltear_v', 'flip_v'],
      ['bloqueado', 'locked'],
      ['oculto', 'hidden'],
      ['eliminado', 'removed'],
    ] as const) {
      const flag = canvasFlag(row[field])
      if (flag !== null) values[key] = flag
    }
    const layer = (row.capa ?? '').trim()
    if (/^-?\d{1,3}$/.test(layer)) entry.layer = Number(layer)

    const desktop: Record<string, unknown> = {}
    for (const [field, [key, min, max]] of Object.entries(CANVAS_RANGES)) {
      const n = canvasNumber(row[`e_${field}`], min, max)
      if (n !== null) desktop[key] = n
    }
    const hidden = canvasFlag(row.e_oculto)
    if (hidden !== null) desktop.hidden = hidden
    const removed = canvasFlag(row.e_eliminado)
    if (removed !== null) desktop.removed = removed
    if (Object.keys(desktop).length) entry.desktop = desktop as CanvasValues
    out.push(entry)
  })
  return out
}

/** Como trim() de PHP: solo espacios, tabuladores y saltos (un espacio duro se queda). */
function phpTrim(value: string | undefined): string {
  return (value ?? '').replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '')
}

/** Un texto de sección: vacío (o "0", que PHP toma por falso) = sin texto. */
function sectionText(value: string | undefined): string | undefined {
  const v = phpTrim(value)
  return v === '' || v === '0' ? undefined : v
}

/** El título, los nombres y el salón, como los arma el servidor. */
export function eventTexts(event: DesignValues): NonNullable<PreviewPatch['event']> {
  const e: Record<string, string> = {}
  for (const [key, value] of Object.entries(event)) {
    const v = phpTrim(value)
    if (v !== '') e[key] = v
  }
  const celebrant = {
    full_name: e.festejada ?? '',
    short_name: e.festejada_corto ?? e.festejada ?? '',
    partner_name: e.pareja ?? '',
  }
  return {
    title: e.titulo ?? '',
    subtitle: e.subtitulo ?? '',
    celebrant: Object.fromEntries(Object.entries(celebrant).filter(([, v]) => v !== '')),
    venue: {
      name: e.salon ?? '',
      display_name: e.salon_nombre_visible ?? e.salon ?? '',
      city: e.salon_ciudad ?? '',
      address: e.salon_direccion ?? '',
    },
  }
}

export function previewPatch(catalog: Catalog, design: Design): PreviewPatch {
  const sections: NonNullable<PreviewPatch['sections']> = {}
  const extra = new Set<string>()
  for (const section of design.sections) {
    if (!isVisible(section)) continue
    const styles = sectionTextStyles(catalog, section, design.texts)
    Object.values(styles).forEach((s) => s.font && extra.add(s.font))
    const colors = sectionColors(catalog, section)
    const canvas = sectionCanvas(catalog, section)
    sections[section.id] = {
      colors: Object.keys(colors).length ? colors : undefined,
      text_styles: Object.keys(styles).length ? styles : undefined,
      canvas: canvas.length ? canvas : undefined,
      ...Object.fromEntries(
        Object.entries(SECTION_TEXTS).map(([field, key]) => [
          key,
          sectionText(section.fields[field]),
        ]),
      ),
    }
  }
  return {
    palette: palette(catalog, design.colors),
    fonts: fonts(catalog, design.fonts),
    extra_fonts: [...extra],
    sections,
    event: eventTexts(design.event),
  }
}

/** Sin lo que la vista previa ya muestra sola (estilo y textos tal cual). */
function withoutPatched(design: Design): Design {
  const keep = (values: DesignValues, drop: (key: string) => boolean) =>
    Object.fromEntries(Object.entries(values).filter(([key]) => !drop(key)))
  return {
    event: keep(design.event, (k) => EVENT_TEXTS.includes(k) || EVENT_UNSEEN.includes(k)),
    colors: {},
    fonts: {},
    texts: {},
    page: design.page,
    sections: design.sections.map((s) => ({
      ...s,
      fields: keep(s.fields, (k) => k in SECTION_TEXTS || STYLE_FIELD.test(k)),
      // El lienzo se ve al instante; solo el archivo de una imagen necesita al servidor (su URL).
      canvas: (s.canvas ?? []).filter((e) => e.imagen).map((e) => ({ imagen: e.imagen })),
    })),
  }
}

/**
 * ¿Lo que cambió desde lo guardado necesita al servidor para verse? Si solo cambió lo que
 * el parche ya muestra (estilo y textos tal cual), no: se puede guardar con calma.
 */
export function needsServer(saved: Design, current: Design): boolean {
  return !sameDesign(withoutPatched(saved), withoutPatched(current))
}
