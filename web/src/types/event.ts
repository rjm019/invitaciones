/**
 * Contrato del evento tal como lo entrega la API (GET /api/public/events/{slug}).
 * La API lo arma desde el layout del evento (layout.xlsx o CSV); ver
 * api/app/Services/Layout/EventConfigBuilder.php.
 */

export type EffectName =
  | 'reveal'
  | 'parallax'
  | 'float'
  | 'shine'
  | 'timeline-fill'
  | 'typewriter'
  | 'sparkle'
  | 'cascade'
  | 'ken-burns'
  | 'color-shift'

export interface SectionBackground {
  /** Nombre de archivo (media del evento o assets del tema) o URL. */
  image?: string
  /** cover = cubre la sección (por defecto); tile = mosaico, para texturas y estampados. */
  fit?: 'cover' | 'tile'
  /** Hex (#RRGGBB) o nombre de token de la paleta (surface, lino…). */
  color?: string
  /** Oscurecido sobre la imagen, de 0 a 1. */
  overlay?: number
  attachment?: 'sticky'
}

/** Ancho de la sección en pantallas grandes: toda la fila, o media fila junto a la siguiente "half". */
export type DesktopWidth = 'full' | 'half'

/** Lugar que ocupa la sección en la cuadrícula de escritorio. */
export type DesktopSlot = 'full' | 'left' | 'right'

export interface SectionConfig {
  type: string
  title?: string
  subtitle?: string
  text?: string
  button?: string
  variant?: string
  background?: SectionBackground
  effects: string[]
  visible: boolean
  desktop?: DesktopWidth
}

export interface ItineraryItem {
  time: string
  label: string
  icon?: string
}

export interface EventLocation {
  label: string
  name: string
  time: string | null
  address: string
  maps_url: string
  photo: string | null
}

export interface EventConfig {
  slug: string
  type: string
  theme: string
  title: string
  subtitle: string
  celebrant: { full_name?: string; short_name?: string; partner_name?: string }
  /** ISO 8601 siempre con offset (2026-11-28T17:00:00-06:00). */
  starts_at: string | null
  timezone: string
  published: boolean
  rsvp: {
    mode: 'token' | 'open' | 'whatsapp' | 'off'
    deadline: string | null
    open: boolean
    whatsapp_number: string | null
    ask_song: boolean
    ask_message: boolean
  }
  venue: {
    name: string
    display_name: string
    city: string
    address: string
    maps_url: string
    photo: string | null
  }
  music: {
    /** file = MP3 del evento (musica_audio); spotify = la playlist suena al abrir el sobre. */
    source: 'file' | 'spotify'
    audio_url: string | null
    spotify_url: string | null
  }
  media: { portrait: string | null }
  dress_code: { colors: string[] }
  /** token → hex; se aplica como --color-<token>. */
  palette: Record<string, string>
  /** rol → familia; se aplica como --font-<rol>. */
  fonts: Record<string, string>
  sections: SectionConfig[]
  family: { role: string; names: string[] }[]
  itinerary: ItineraryItem[]
  locations: EventLocation[]
  /** Archivos de eventos/<slug>/media → URL. */
  assets: Record<string, string>
}

/** Rectángulo dentro de una imagen, en % de su ancho (x, w) y alto (y, h). */
export interface SpritePart {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Dónde está cada figura dentro de una imagen de decoración, para animarlas por separado:
 * `parts` se recortan y se mueven solas (mariposas que aletean); `glints` marcan figuras
 * sobre las que titila un destello (estrellas).
 */
export interface DecorSprite {
  /** Ancho / alto de la imagen. */
  ratio: number
  parts?: SpritePart[]
  glints?: SpritePart[]
}

/** Sección lista para pintar: config del evento mezclado con los defaults del tema. */
export interface ResolvedSection extends SectionConfig {
  id: string
  desktop: DesktopWidth
  /** Se pinta como panel (fondo propio, esquinas y sombra). La portada no lo es. */
  panel: boolean
  /** Decoraciones del tema ya resueltas a URL (null si el archivo no está). */
  decor: Record<string, string | null>
  /** Figuras de cada decoración (por ranura), si el tema las describe. */
  sprites?: Record<string, DecorSprite>
}

/** Sección con su lugar en la cuadrícula de escritorio ya calculado. */
export interface PlacedSection extends ResolvedSection {
  slot: DesktopSlot
}
