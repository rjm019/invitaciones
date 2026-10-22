/**
 * Contrato del evento tal como lo entrega la API (GET /api/public/events/{slug}).
 * La API lo arma desde la invitación del evento (invitacion.csv, ver
 * api/app/Services/Design/InvitationConfigBuilder.php) o, en el formato anterior, desde
 * su layout.xlsx (api/app/Services/Layout/EventConfigBuilder.php).
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
  | 'skyline'
  | 'searchlights'
  | 'city-lights'
  | 'glitter'
  | 'sheen'
  | 'pan'
  | 'blend'
  | 'disco-ball'
  | 'disco-lights'
  | 'city-icons'
  | 'taxi'
  | 'icon-strip'
  | 'reveal-zoom'
  | 'reveal-slide'
  | 'reveal-tilt'

/** Forma de las orillas de una franja (sección difuminada con fondo). */
export type EdgeStyle = 'fade' | 'torn' | 'city' | 'wave' | 'scallop' | 'straight'

/** Estilo de todos los botones de la invitación (bloque "pagina"). */
export type ButtonStyle = 'gradient' | 'solid' | 'outline' | 'deco' | 'ticket' | 'neon' | 'link'

/** Esquinas de los paneles. */
export type CornerStyle = 'deco' | 'none'

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

/** Letra, color y tamaño de un bloque de texto de una sección (título, horas…). */
export interface TextStyle {
  /** Familia de Google Fonts. */
  font?: string
  /** Hex (#RRGGBB) o nombre de token de la paleta (accent, primary…). */
  color?: string
  /** Multiplicador sobre el tamaño del tema (0.5 a 2.5). */
  size?: number
}

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
  /** Id de la sección en la invitación (invitacion.csv): "itinerario", "frase-2". */
  key?: string
  /** Colores propios de la sección (token → hex o nombre de otro token), encima de la paleta. */
  colors?: Record<string, string>
  /** Adornos del tema cambiados en esta sección: ranura → archivo o URL; null = sin adorno. */
  decor?: Record<string, string | null>
  /** Estilo de cada bloque de texto de la sección ("title", "time"…). */
  text_styles?: Record<string, TextStyle>
  /** Imagen propia de la sección (la foto de "foto"). */
  image?: string | null
  /** Forma de sus orillas, si es franja (si no, la de la página o la del tema). */
  edge?: EdgeStyle
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

/** Una tienda de la mesa de regalos. */
export interface GiftStore {
  /** liverpool, amazon, palacio, sears, costco u other: pone la inicial y el nombre por defecto. */
  store: string
  name: string
  /** "Ver lista de deseos", "Mesa a nombre de…". */
  note: string
  url: string
  /** Número de evento (el de Liverpool), con botón para copiar. */
  event_number: string
}

/** Lluvia de sobres. */
export interface GiftEnvelope {
  title: string
  text: string
  bank: string
  /** CLABE o tarjeta, tal cual (la invitación la agrupa de 4 en 4). */
  account: string
  holder: string
  /** También habrá caja para sobres en el salón. */
  box: boolean
  /**
   * Los datos bancarios solo van en las invitaciones personales: por el enlace general el
   * servidor los quita y avisa con esto.
   */
  hidden: boolean
  /** "Solo con enlace": así lo pidió la invitación (lo normal). */
  private: boolean
}

/** Mesa de regalos (sección "mesa_regalos"). */
export interface EventGifts {
  stores: GiftStore[]
  envelope: GiftEnvelope | null
}

/** Una foto de la galería, con su pie opcional. */
export interface GalleryPhoto {
  photo: string
  caption: string
  /** Medidas de la foto (si está en media/): para acomodarla según su forma sin recortarla. */
  width?: number
  height?: number
}

/** Hotel recomendado (pestaña "hoteles" del layout). */
export interface EventHotel {
  name: string
  /** Nota corta: "A unos pasos del salón", "Menciona los XV para tarifa especial"… */
  note: string
  address: string
  maps_url: string
  phone: string
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
  /** Una muestra (demo de la landing): se puede probar todo, pero no guarda nada. */
  demo?: boolean
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
  hotels: EventHotel[]
  /** Fotos de la sección galería (vacío: la sección no se muestra). */
  gallery?: GalleryPhoto[]
  /** Sección "Lluvia de sobres" (independiente de la mesa de regalos). */
  envelope?: GiftEnvelope | null
  /** Mesa de regalos (solo si la invitación la tiene). */
  gifts?: EventGifts | null
  /** Archivos de eventos/<slug>/media → URL. */
  assets: Record<string, string>
  /**
   * Papel de la página y adornos que flotan (si la invitación cambia los del tema), y los
   * detalles de diseño que se eligen para toda la invitación (vacío: lo que diga el tema):
   * blend (secciones difuminadas), edge (la orilla de las franjas), buttons (el estilo de
   * los botones), confetti (el confeti que cae), metal (títulos con brillo de metal) y
   * corners (las esquinas de los paneles).
   */
  page?: {
    image?: string
    decor?: boolean
    blend?: boolean
    edge?: EdgeStyle
    buttons?: ButtonStyle
    confetti?: boolean
    metal?: boolean
    corners?: CornerStyle
  }
  /** Fuentes que usan los estilos de texto de las secciones (se cargan de Google Fonts). */
  extra_fonts?: string[]
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
  /** Color propio del panel, en lugar del que le toca en la rotación (sin recorrer las demás). */
  panelColor?: string
  /** Decoraciones del tema ya resueltas a URL (null si el archivo no está). */
  decor: Record<string, string | null>
  /** Figuras de cada decoración (por ranura), si el tema las describe. */
  sprites?: Record<string, DecorSprite>
}

/** Sección con su lugar en la cuadrícula de escritorio ya calculado. */
export interface PlacedSection extends ResolvedSection {
  slot: DesktopSlot
}
