/**
 * Contrato del evento tal como lo entrega la API (GET /api/public/events/{slug}).
 * La API lo arma desde la invitación del evento (invitacion.csv, ver
 * api/app/Services/Design/InvitationConfigBuilder.php) o, en el formato anterior, desde
 * su layout.xlsx (api/app/Services/Layout/EventConfigBuilder.php).
 */

import type { SocialLink } from '@/services/socialEmbedService'

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
  | 'veil'
  | 'reveal-zoom'
  | 'reveal-slide'
  | 'reveal-tilt'
  | 'lace-spin'
  | 'lace-wave'
  | 'lace-draw'
  | 'spotlight'
  | 'spotlight-travel'
  | 'pearl-glint'
  | 'satin-sweep'
  | 'drape-sway'
  | 'pearl-strands'
  | 'petals'
  | 'light-dust'
  | 'tulle-breathe'
  | 'stitch-in'
  | 'breathe'
  | 'ink'
  | 'raking-light'
  | 'paper-in'
  | 'living-drawing'
  | 'typewriter-title'
  | 'ink-dry'
  | 'calligraphy'
  | 'stamp'
  | 'gold-leaf'
  | 'letterpress'

/** Forma de las orillas de una franja (sección difuminada con fondo). */
export type EdgeStyle = 'fade' | 'torn' | 'city' | 'wave' | 'scallop' | 'straight' | 'lace'

/** Estilo de todos los botones de la invitación (bloque "pagina"). */
export type ButtonStyle =
  | 'gradient'
  | 'solid'
  | 'outline'
  | 'deco'
  | 'ticket'
  | 'neon'
  | 'link'
  | 'ribbon'
  | 'fine'

/** Esquinas de los paneles. */
export type CornerStyle = 'deco' | 'lace' | 'none'

/** Textura de tela del fondo de los paneles. */
export type TextureStyle =
  | 'velvet'
  | 'satin'
  | 'gauze'
  | 'linen'
  | 'paper'
  | 'stone'
  | 'cotton'
  | 'none'

/** Silueta de las tarjetas: con muescas (esquinas cóncavas recortadas) o recta. */
export type SilhouetteStyle = 'notch' | 'none'

/** Filete fino por dentro de la silueta. */
export type FilletStyle = 'burgundy' | 'gold' | 'none'

/** Un recuerdo de la historia (sección "historia"). */
export interface StoryMoment {
  year?: string
  title: string
  text?: string
  photo?: string
}

/** Pregunta y respuesta de la información adicional (sección "informacion"). */
export interface FaqItem {
  question: string
  answer: string
}

/** Foto de referencia de la vestimenta, con su pie opcional. */
export interface DressReference {
  photo: string
  caption: string
}

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

/** Lo que se puede poner distinto en escritorio (vacío = hereda del celular). */
export interface CanvasValues {
  /** % del ancho de `.section__content`. */
  x?: number
  y?: number
  width?: number
  /** Alto en % del ancho del contenedor (imagen y forma libres); sin él, conserva su proporción. */
  height?: number
  /** Grados (-360 a 360). */
  rotation?: number
  /** 0.1 a 5. */
  scale?: number
  /** Escala vertical de un elemento que ya existe; sin ella, igual a `scale`. */
  scale_y?: number
  /** 0 a 100. */
  opacity?: number
  hidden?: boolean
  /** Elemento que ya existe, quitado (display: none): libera su espacio. */
  removed?: boolean
}

/**
 * Un elemento del lienzo de una sección: o un bloque que ya existe (`target`: "texto:<bloque>:<n>"
 * o "imagen:<n>") o uno libre (`kind`). Manda el celular; `desktop` solo lo cambia en pantallas anchas.
 */
export interface CanvasElement extends CanvasValues {
  /** "lienzo-1": su lugar en la lista de la sección. */
  id: string
  target?: string
  kind?: 'text' | 'image' | 'shape'
  text?: string
  font?: string
  /** % del ancho de la sección. */
  size?: number
  align?: 'left' | 'center' | 'right'
  /** Hex o token de la paleta. */
  color?: string
  image?: string
  shape?: 'line' | 'rectangle' | 'circle'
  radius?: number
  border?: number
  flip_h?: boolean
  flip_v?: boolean
  layer?: number
  locked?: boolean
  desktop?: CanvasValues
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
  /** Lámina de papel (variante `lamina`): proporción ancho/alto de la imagen y zona segura en %. */
  sheet?: { aspect?: number; top?: number; right?: number; bottom?: number; left?: number }
  /** Sobre que se abre (variante `sobre-imagen`): centro (x, y) y ancho de la hoja en % de la imagen, y su giro cerrada. */
  pull?: { x?: number; y?: number; width?: number; tilt?: number }
  /** Estilo de cada bloque de texto de la sección ("title", "time"…). */
  text_styles?: Record<string, TextStyle>
  /** Lienzo: elementos acomodados a mano (solo si la sección los tiene). */
  canvas?: CanvasElement[]
  /** Imagen propia de la sección (la foto de "foto"). */
  image?: string | null
  /** Fotos quietas, una por capa (la "capa de imagen"): las pinta SectionShell. */
  layers?: string[]
  /** Capa de imagen sin la sombra de arriba y abajo. */
  plain?: boolean
  /** Fotos de una galería (puede haber varias galerías, cada una con las suyas). */
  photos?: GalleryPhoto[]
  /** Video: de dónde sale y qué mostrar (el servidor ya validó el enlace). */
  video?: SectionVideo
  /** Publicación de redes: la red, su enlace validado y la portada. */
  post?: SectionPost
  /** Preguntas de la trivia (sin la respuesta correcta: esa solo la tiene el servidor). */
  questions?: TriviaQuestion[]
  /** Cuándo cierra la trivia (ISO con offset). */
  closes_at?: string
  /** Ubicación: lugares propios de esta sección (si no vienen, los de `locations`). */
  places?: EventLocation[]
  /** Ubicación: botón "Agregar al calendario" en cada lugar. */
  calendar?: boolean
  /** Ubicación: lugares lado a lado (se apilan en el celular) o uno debajo del otro. */
  layout?: 'side' | 'stack'
  /** Vestimenta: enlace https del botón "Ver ejemplos" (sin enlace, el botón no aparece). */
  link?: string
  /** Itinerario: resalta el momento actual el día del evento. */
  live?: boolean
  /** Álbum: días que sigue abierto después del evento (5 a 20, ya acotado por el servidor). */
  days?: number
  /** Forma de sus orillas, si es franja (si no, la de la página o la del tema). */
  edge?: EdgeStyle
  /** Silueta y filete de esta tarjeta (si no vienen, los de la página o los del tema). */
  silhouette?: SilhouetteStyle
  fillet?: FilletStyle
  /** Vestimenta: lo que se pide evitar (hasta 6) y fotos de referencia (hasta 4). */
  restrictions?: string[]
  references?: DressReference[]
  /** Historia: sus momentos (hasta 8). */
  moments?: StoryMoment[]
  /** Información adicional: preguntas y respuestas del acordeón (hasta 12). */
  items?: FaqItem[]
  /** Dedicatorias: muestra el muro con las recibidas (apagado si no viene). */
  wall?: boolean
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
  /** Con `tipo`: religious, civil, reception, both u other. */
  kind?: string
  /** Ícono por defecto del tipo. */
  icon?: string
  /** Con "calendario": el día del evento a la hora de este lugar (ISO con offset). */
  starts_at?: string
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

/** Video de una sección: YouTube, Instagram o Facebook (enlace validado) o un MP4 propio. */
export interface SectionVideo extends Partial<SocialLink> {
  source: 'youtube' | 'instagram' | 'facebook' | 'file'
  format: 'horizontal' | 'vertical'
  /** URL del MP4 de la biblioteca (solo con source = file). */
  file?: string
  /** Portada de la biblioteca; sin ella, un fondo con el ícono (nunca la miniatura de la red). */
  poster?: string
}

/** Publicación de una red (sección "publicacion"). */
export interface SectionPost extends SocialLink {
  poster?: string
}

/** Una pregunta de la trivia: 2 a 4 opciones; se responde con el número de la opción (desde 1). */
export interface TriviaQuestion {
  text: string
  options: string[]
}

/** Una foto de la galería, con su pie opcional. */
export interface GalleryPhoto {
  photo: string
  caption: string
  /** Medidas de la foto (si está en media/): para acomodarla según su forma sin recortarla. */
  width?: number
  height?: number
  /** Miniatura de 480 px (solo si existe) y su ancho real, para `srcset`. */
  thumb?: string
  thumb_width?: number
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
  /** Opcionales: solo vienen si el hotel los llenó. */
  distance?: string
  price?: string
  /** Enlace https para reservar. */
  booking_url?: string
}

export interface EventConfig {
  slug: string
  type: string
  theme: string
  title: string
  subtitle: string
  celebrant: {
    full_name?: string
    short_name?: string
    partner_name?: string
    /** Iniciales del monograma ("I M"); sin ellas salen del nombre corto. */
    monogram?: string
  }
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
    /** Segundo en que empieza el MP3 (solo viene si es mayor que 0). */
    start?: number
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
    texture?: TextureStyle
    silhouette?: SilhouetteStyle
    fillet?: FilletStyle
    /** Títulos en relieve (letterpress estático). */
    relief?: boolean
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
