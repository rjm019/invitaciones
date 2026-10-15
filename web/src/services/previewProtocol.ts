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
  /** select: un toque elige la sección o el texto; try: la invitación funciona de verdad. */
  mode: 'select' | 'try'
  /** Nombre de cada sección (por su key) para la etiqueta "Editar …". */
  labels: Record<string, string>
}

/** Lo que se ve al instante, antes de que el servidor responda: estilo y textos tal cual. */
export interface PreviewPatch {
  palette?: Record<string, string>
  fonts?: Record<string, string>
  extra_fonts?: string[]
  /** key de la sección → sus colores, estilos de texto y textos (reemplazan los que tenía). */
  sections?: Record<
    string,
    Pick<SectionConfig, 'colors' | 'text_styles' | 'title' | 'subtitle' | 'text' | 'button'>
  >
  /** Del evento: el título, los nombres y el salón. */
  event?: {
    title: string
    subtitle: string
    celebrant: Record<string, string>
    venue: { name: string; display_name: string; city: string; address: string }
  }
}

export type ToPreview =
  | { type: 'config'; config: EventConfig; display: PreviewDisplay }
  | { type: 'display'; display: PreviewDisplay }
  | { type: 'patch'; patch: PreviewPatch }
  | { type: 'select'; key: string | null }
  | { type: 'replay' }

export type FromPreview =
  | { type: 'ready' }
  | { type: 'rendered'; keys: string[] }
  | { type: 'hover'; key: string | null; block: string | null }
  | { type: 'pick'; key: string; block: string | null }
  | { type: 'tokens'; colors: Record<string, string>; fonts: Record<string, string> }

type Envelope<T> = T & { channel: typeof PREVIEW_CHANNEL }

export function wrap<T extends ToPreview | FromPreview>(message: T): Envelope<T> {
  return { channel: PREVIEW_CHANNEL, ...message }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringRecord = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === 'string')
const isKey = (v: unknown): v is string => typeof v === 'string' && /^[a-z_]+(-\d+)?$/.test(v)
const isBlock = (v: unknown): v is string | null =>
  v === null || (typeof v === 'string' && /^[a-z0-9-]+$/.test(v))

function isDisplay(v: unknown): v is PreviewDisplay {
  return (
    isRecord(v) &&
    (v.envelope === 'open' || v.envelope === 'closed') &&
    (v.guest === 'general' || v.guest === 'personal') &&
    typeof v.muted === 'boolean' &&
    (v.mode === 'select' || v.mode === 'try') &&
    isStringRecord(v.labels)
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
  return ['title', 'subtitle', 'text', 'button'].every((key) => isText(v[key]))
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

function isConfig(v: unknown): v is EventConfig {
  return (
    isRecord(v) && typeof v.theme === 'string' && Array.isArray(v.sections) && isRecord(v.palette)
  )
}

/** Lo que recibe la vista previa: solo mensajes del editor con una forma conocida. */
export function readToPreview(data: unknown): ToPreview | null {
  if (!isRecord(data) || data.channel !== PREVIEW_CHANNEL) return null
  switch (data.type) {
    case 'config':
      return isConfig(data.config) && isDisplay(data.display)
        ? { type: 'config', config: data.config, display: data.display }
        : null
    case 'display':
      return isDisplay(data.display) ? { type: 'display', display: data.display } : null
    case 'patch':
      return isPatch(data.patch) ? { type: 'patch', patch: data.patch } : null
    case 'select':
      return data.key === null || isKey(data.key) ? { type: 'select', key: data.key } : null
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
    default:
      return null
  }
}
