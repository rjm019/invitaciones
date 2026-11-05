import type { EventConfig, SectionConfig } from '@/types/event'

/**
 * Mensajes entre el editor del gestor (/gestor/:slug) y su vista previa (el iframe
 * /gestor/vista-previa). Los dos están en el mismo dominio; aun así, cada lado revisa que
 * el mensaje venga de la otra ventana, del mismo origen y con esta forma.
 */
export const PREVIEW_CHANNEL = 'invitaciones-vista-previa'

/** Cómo se ve la vista previa (la barra del editor lo cambia). */
export interface PreviewDisplay {
  /** open: el sobre ya está abierto (para revisar todo); closed: "Ver como invitado". */
  envelope: 'open' | 'closed'
  /** general: /e/<slug>; personal: un enlace de ejemplo con 4 lugares (para la confirmación). */
  guest: 'general' | 'personal'
  muted: boolean
  /**
   * select: un toque elige la sección o el texto; try: la invitación funciona de verdad;
   * arrange: «Acomodar», mover, girar y cambiar el tamaño de los elementos (el lienzo).
   */
  mode: 'select' | 'try' | 'arrange'
  /** Nombre de cada sección (por su key) para la etiqueta "Editar …". */
  labels: Record<string, string>
  /**
   * Bloques de texto (`data-text`) de cada sección que se escriben en un campo de la sección:
   * solo esos se editan en el lugar con doble clic. Los demás (nombres, fecha, ciudad…) salen
   * de otro dato y el doble clic lleva a su campo.
   */
  editable?: Record<string, string[]>
}

/** Lo que se ve al instante, antes de que el servidor responda: estilo y textos tal cual. */
export interface PreviewPatch {
  palette?: Record<string, string>
  fonts?: Record<string, string>
  extra_fonts?: string[]
  /** key de la sección → sus colores, estilos de texto y textos (reemplazan los que tenía). */
  sections?: Record<
    string,
    Pick<
      SectionConfig,
      'colors' | 'text_styles' | 'canvas' | 'title' | 'subtitle' | 'text' | 'button'
    >
  >
  /** Del evento: el título, los nombres y el salón. */
  event?: {
    title: string
    subtitle: string
    celebrant: Record<string, string>
    venue: { name: string; display_name: string; city: string; address: string }
  }
}

/** Lo que el arrastre cambia de un elemento (px ya convertidos a % del ancho de la sección). */
export interface ArrangeValues {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  scale?: number
  scale_y?: number
  /** Tamaño de la letra de un texto agregado (% del ancho). */
  size?: number
}

/** "texto:title:0" / "imagen:1" (un bloque que ya existe) o "lienzo-3" (uno agregado). */
export interface ArrangeChange {
  ref: string
  values: ArrangeValues
}

/**
 * Medidas en px de un elemento elegido, desde la esquina superior izquierda de
 * `.section__content`: `x, y, width, height` es la caja que lo envuelve (con el giro) y
 * `w, h` su tamaño sin girar. Con ellas el editor alinea y reparte sin tocar el DOM.
 */
export interface ArrangeMeasure {
  x: number
  y: number
  width: number
  height: number
  w: number
  h: number
}

/** Un texto o una imagen de la sección (aparecen en la lista de capas, se toquen o no). */
export interface ArrangeBlock {
  /** "texto:title:0" o "imagen:1". */
  ref: string
  /** Su texto (o, en una imagen, su descripción); puede ir vacío. */
  label: string
}

/**
 * Lo que la vista previa leyó de un bloque elegido de la sección para poder duplicarlo como
 * un elemento agregado (la copia es fija: no sigue al original).
 */
export type ArrangeCopy =
  | { kind: 'text'; text: string; font: string | null; size: number; color: string | null; align: 'left' | 'center' | 'right' }
  | { kind: 'image'; src: string; aspect: number }

/** La sección elegida, en px desde la esquina de su contenido; `content` es el ancho de la unidad (%). */
export interface ArrangeFrame {
  content: number
  section: { x: number; y: number; width: number; height: number }
}

export type ToPreview =
  | { type: 'config'; config: EventConfig; display: PreviewDisplay }
  | { type: 'display'; display: PreviewDisplay }
  | { type: 'patch'; patch: PreviewPatch }
  | { type: 'select'; key: string | null }
  | { type: 'arrange-select'; section: string | null; refs: string[] }
  | { type: 'replay' }

export type FromPreview =
  | { type: 'ready' }
  | { type: 'rendered'; keys: string[] }
  | { type: 'hover'; key: string | null; block: string | null }
  | { type: 'pick'; key: string; block: string | null }
  | { type: 'tokens'; colors: Record<string, string>; fonts: Record<string, string> }
  | {
      type: 'arrange-select'
      section: string | null
      refs: string[]
      measures: Record<string, ArrangeMeasure>
      frame: ArrangeFrame | null
      blocks: ArrangeBlock[]
      copies: Record<string, ArrangeCopy>
    }
  | { type: 'arrange-change'; section: string; changes: ArrangeChange[]; nudge: boolean }
  | { type: 'key'; key: string; meta: boolean; shift: boolean }
  /** Pulsar y mover sobre un elemento en «Elegir»: el editor pasa a «Acomodar» con él elegido. */
  | { type: 'arrange-begin'; section: string; ref: string }
  /** Doble clic: el texto editado en el lugar (Enter o clic afuera), listo para guardar. */
  | { type: 'edit-commit'; section: string; ref: string; text: string }
  /** Doble clic en un texto que no se escribe en la sección: abre el campo que lo controla. */
  | { type: 'edit-open'; section: string; block: string; text: string }

type Envelope<T> = T & { channel: typeof PREVIEW_CHANNEL }

export function wrap<T extends ToPreview | FromPreview>(message: T): Envelope<T> {
  return { channel: PREVIEW_CHANNEL, ...message }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringRecord = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === 'string')
const isKey = (v: unknown): v is string => typeof v === 'string' && /^[a-z_]+(-\d+)?$/.test(v)
const isBlockName = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9_-]{1,40}$/.test(v)
const isBlock = (v: unknown): v is string | null =>
  v === null || (typeof v === 'string' && /^[a-z0-9-]+$/.test(v))

function isDisplay(v: unknown): v is PreviewDisplay {
  return (
    isRecord(v) &&
    (v.envelope === 'open' || v.envelope === 'closed') &&
    (v.guest === 'general' || v.guest === 'personal') &&
    typeof v.muted === 'boolean' &&
    (v.mode === 'select' || v.mode === 'try' || v.mode === 'arrange') &&
    isStringRecord(v.labels) &&
    (v.editable === undefined ||
      (isRecord(v.editable) &&
        Object.entries(v.editable).every(
          ([k, blocks]) => isKey(k) && Array.isArray(blocks) && blocks.length <= 80 && blocks.every(isBlockName),
        )))
  )
}

/** Lo más largo que se acepta de un texto editado en el lugar. */
export const MAX_EDIT_TEXT = 2000

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** "texto:title:0", "imagen:1" o "lienzo-3". */
const isRef = (v: unknown): v is string =>
  typeof v === 'string' && /^(texto:[a-z0-9_]{1,40}:\d{1,3}|imagen:\d{1,3}|lienzo-\d{1,3})$/.test(v)
const isRefs = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 60 && v.every(isRef)

function isValues(v: unknown): v is ArrangeValues {
  return (
    isRecord(v) &&
    Object.keys(v).every((k) => ['x', 'y', 'width', 'height', 'rotation', 'scale', 'scale_y', 'size'].includes(k)) &&
    Object.values(v).every(isNum)
  )
}

function isMeasure(v: unknown): v is ArrangeMeasure {
  return isRecord(v) && ['x', 'y', 'width', 'height', 'w', 'h'].every((k) => isNum(v[k]))
}

function isMeasures(v: unknown): v is Record<string, ArrangeMeasure> {
  return isRecord(v) && Object.entries(v).every(([k, m]) => isRef(k) && isMeasure(m))
}

const isBlocks = (v: unknown): v is ArrangeBlock[] =>
  Array.isArray(v) &&
  v.length <= 400 &&
  v.every(
    (b) =>
      isRecord(b) &&
      typeof b.ref === 'string' &&
      /^(texto:[a-z0-9_]{1,40}:\d{1,3}|imagen:\d{1,3})$/.test(b.ref) &&
      typeof b.label === 'string' &&
      b.label.length <= 80,
  )

function isCopy(v: unknown): v is ArrangeCopy {
  if (!isRecord(v)) return false
  if (v.kind === 'image') {
    return typeof v.src === 'string' && /^(https?:\/\/|\/)/.test(v.src) && v.src.length <= 1000 && isNum(v.aspect)
  }
  return (
    v.kind === 'text' &&
    typeof v.text === 'string' &&
    v.text.length <= 600 &&
    (v.font === null || (typeof v.font === 'string' && /^[A-Za-z0-9 ]{2,60}$/.test(v.font))) &&
    isNum(v.size) &&
    (v.color === null || (typeof v.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v.color))) &&
    (v.align === 'left' || v.align === 'center' || v.align === 'right')
  )
}

const isCopies = (v: unknown): v is Record<string, ArrangeCopy> =>
  isRecord(v) && Object.entries(v).every(([k, c]) => isRef(k) && isCopy(c))

function isFrame(v: unknown): v is ArrangeFrame {
  return (
    isRecord(v) &&
    isNum(v.content) &&
    isRecord(v.section) &&
    ['x', 'y', 'width', 'height'].every((k) => isNum((v.section as Record<string, unknown>)[k]))
  )
}

function isPatch(v: unknown): v is PreviewPatch {
  if (!isRecord(v)) return false
  if (v.palette !== undefined && !isStringRecord(v.palette)) return false
  if (v.fonts !== undefined && !isStringRecord(v.fonts)) return false
  if (
    v.extra_fonts !== undefined &&
    !(Array.isArray(v.extra_fonts) && v.extra_fonts.every((f) => typeof f === 'string'))
  )
    return false
  if (
    v.sections !== undefined &&
    !(
      isRecord(v.sections) &&
      Object.entries(v.sections).every(([k, s]) => isKey(k) && isRecord(s) && isSectionTexts(s))
    )
  )
    return false
  if (v.event !== undefined && !isEventTexts(v.event)) return false
  return true
}

const isText = (v: unknown) => v === undefined || typeof v === 'string'

function isSectionTexts(v: Record<string, unknown>): boolean {
  return (
    ['title', 'subtitle', 'text', 'button'].every((key) => isText(v[key])) &&
    (v.canvas === undefined || (Array.isArray(v.canvas) && v.canvas.every(isRecord)))
  )
}

function isEventTexts(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.title === 'string' &&
    typeof v.subtitle === 'string' &&
    isStringRecord(v.celebrant) &&
    isStringRecord(v.venue)
  )
}

/** PHP manda un mapa vacío como lista vacía (una invitación en blanco no trae colores ni letras). */
const isMap = (v: unknown) => isRecord(v) || (Array.isArray(v) && v.length === 0)
const asMap = (v: unknown) => (isStringRecord(v) ? v : {})

function isConfig(v: unknown): v is EventConfig {
  return isRecord(v) && typeof v.theme === 'string' && Array.isArray(v.sections) && isMap(v.palette)
}

function normalizeConfig(config: EventConfig): EventConfig {
  return { ...config, palette: asMap(config.palette), fonts: asMap(config.fonts) }
}

/** Lo que recibe la vista previa: solo mensajes del editor con una forma conocida. */
export function readToPreview(data: unknown): ToPreview | null {
  if (!isRecord(data) || data.channel !== PREVIEW_CHANNEL) return null
  switch (data.type) {
    case 'config':
      return isConfig(data.config) && isDisplay(data.display)
        ? { type: 'config', config: normalizeConfig(data.config), display: data.display }
        : null
    case 'display':
      return isDisplay(data.display) ? { type: 'display', display: data.display } : null
    case 'patch':
      return isPatch(data.patch) ? { type: 'patch', patch: data.patch } : null
    case 'select':
      return data.key === null || isKey(data.key) ? { type: 'select', key: data.key } : null
    case 'arrange-select':
      return (data.section === null || isKey(data.section)) && isRefs(data.refs)
        ? { type: 'arrange-select', section: data.section, refs: data.refs }
        : null
    case 'replay':
      return { type: 'replay' }
    default:
      return null
  }
}

/** Lo que recibe el editor: solo mensajes de la vista previa con una forma conocida. */
export function readFromPreview(data: unknown): FromPreview | null {
  if (!isRecord(data) || data.channel !== PREVIEW_CHANNEL) return null
  switch (data.type) {
    case 'ready':
      return { type: 'ready' }
    case 'rendered':
      return Array.isArray(data.keys) && data.keys.every(isKey)
        ? { type: 'rendered', keys: data.keys }
        : null
    case 'hover':
      return (data.key === null || isKey(data.key)) && isBlock(data.block)
        ? { type: 'hover', key: data.key, block: data.block }
        : null
    case 'pick':
      return isKey(data.key) && isBlock(data.block)
        ? { type: 'pick', key: data.key, block: data.block }
        : null
    case 'tokens':
      return isStringRecord(data.colors) && isStringRecord(data.fonts)
        ? { type: 'tokens', colors: data.colors, fonts: data.fonts }
        : null
    case 'arrange-select':
      return (data.section === null || isKey(data.section)) &&
        isRefs(data.refs) &&
        isMeasures(data.measures) &&
        (data.frame === null || isFrame(data.frame)) &&
        isBlocks(data.blocks) &&
        isCopies(data.copies)
        ? {
            type: 'arrange-select',
            section: data.section,
            refs: data.refs,
            measures: data.measures,
            frame: data.frame,
            blocks: data.blocks,
            copies: data.copies,
          }
        : null
    case 'arrange-change':
      return isKey(data.section) &&
        typeof data.nudge === 'boolean' &&
        Array.isArray(data.changes) &&
        data.changes.length > 0 &&
        data.changes.length <= 60 &&
        data.changes.every((c) => isRecord(c) && isRef(c.ref) && isValues(c.values))
        ? {
            type: 'arrange-change',
            section: data.section,
            changes: data.changes as ArrangeChange[],
            nudge: data.nudge,
          }
        : null
    case 'arrange-begin':
      return isKey(data.section) && isRef(data.ref)
        ? { type: 'arrange-begin', section: data.section, ref: data.ref }
        : null
    case 'edit-commit':
      return isKey(data.section) &&
        isRef(data.ref) &&
        typeof data.text === 'string' &&
        data.text.length <= MAX_EDIT_TEXT
        ? { type: 'edit-commit', section: data.section, ref: data.ref, text: data.text }
        : null
    case 'edit-open':
      return isKey(data.section) &&
        isBlockName(data.block) &&
        typeof data.text === 'string' &&
        data.text.length <= MAX_EDIT_TEXT
        ? { type: 'edit-open', section: data.section, block: data.block, text: data.text }
        : null
    case 'key':
      return typeof data.key === 'string' &&
        /^[A-Za-z0-9]{1,20}$/.test(data.key) &&
        typeof data.meta === 'boolean' &&
        typeof data.shift === 'boolean'
        ? { type: 'key', key: data.key, meta: data.meta, shift: data.shift }
        : null
    default:
      return null
  }
}
