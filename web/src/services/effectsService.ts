import type { SpritePart } from '@/types/event'

/** Cálculos de los efectos (sin DOM): las secciones solo aplican el resultado con transform/opacity. */

/**
 * Parallax: cuánto mover un elemento según qué tan lejos está su centro del centro de la
 * pantalla. factor 0.06 = se mueve 6 % más lento; nunca más de ±max px.
 */
export function parallaxOffset(
  rect: { top: number; height: number },
  viewportHeight: number,
  factor: number,
  max = 24,
): number {
  const distance = rect.top + rect.height / 2 - viewportHeight / 2
  const offset = -distance * factor
  return Math.max(-max, Math.min(max, Math.round(offset * 10) / 10)) + 0 // + 0: nunca -0
}

export interface Letter {
  char: string
  /** Posición global (para el retraso escalonado). */
  index: number
}

/**
 * Texto → palabras de letras, para el efecto "escribir" letra por letra. Las palabras se
 * mantienen juntas para que el renglón corte entre palabras, no a media palabra.
 */
export function splitLetters(text: string): { words: Letter[][]; count: number } {
  let index = 0
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word).map((char) => ({ char, index: index++ })))
  return { words, count: index }
}

/**
 * Duración o retraso de un efecto, a la velocidad de la invitación (--motion-scale):
 * motionTime(2.4) → "calc(2.4s * var(--motion-scale))". Para estilos en línea.
 */
export function motionTime(value: number, unit: 's' | 'ms' = 's'): string {
  return `calc(${value}${unit} * var(--motion-scale))`
}

/** Números pseudoaleatorios repetibles a partir de un texto: la misma sección, los mismos destellos. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    // mulberry32
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits

export interface Sparkle {
  /** Posición en % de la sección. */
  top: number
  left: number
  /** Tamaño en rem. */
  size: number
  /** Segundos. */
  delay: number
  duration: number
}

/**
 * Destellos dorados que titilan en una sección. Van sobre todo a las orillas (los primeros
 * 15 % y últimos 15 % del ancho) para no quedar encima del texto.
 */
export function sparkles(seed: string, count = 9): Sparkle[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => {
    const edge = i % 3 !== 2 // 2 de cada 3 en las orillas
    const side = rand() < 0.5
    const left = edge ? (side ? 2 + rand() * 13 : 85 + rand() * 13) : 15 + rand() * 70
    return {
      top: round(4 + rand() * 92),
      left: round(left),
      size: round(0.6 + rand() * 0.7),
      delay: round(-rand() * 4),
      duration: round(2.6 + rand() * 2.4),
    }
  })
}

export type ConfettiShape = 'petal' | 'strip' | 'dot' | 'star'

export interface ConfettiPiece {
  /** Punto de salida, en % del ancho de la pantalla. */
  x: number
  /** Desplazamiento final en px. */
  dx: number
  /** Altura del salto (negativo = sube) en px, antes de caer. */
  rise: number
  fall: number
  rotate: number
  delay: number
  duration: number
  size: number
  shape: ConfettiShape
  /** Índice en la lista de colores del tema. */
  color: number
  /** Segundos de cada destello mientras cae (solo las estrellas). */
  twinkle?: number
}

/** Una ráfaga de pétalos y confeti que sale del centro, sube y cae girando. */
export function confetti(seed: string, count = 36, colors = 4): ConfettiPiece[] {
  const rand = seededRandom(seed)
  const shapes: ConfettiShape[] = ['petal', 'strip', 'dot']
  return Array.from({ length: count }, (_, i) => ({
    x: round(42 + rand() * 16),
    dx: Math.round((rand() - 0.5) * 2 * 190),
    rise: -Math.round(120 + rand() * 200),
    fall: Math.round(380 + rand() * 320),
    rotate: Math.round((rand() - 0.5) * 2 * 540),
    delay: round(rand() * 0.25),
    duration: round(2.2 + rand() * 1.4),
    size: round(0.5 + rand() * 0.45),
    shape: shapes[i % shapes.length]!,
    color: i % colors,
  }))
}

/**
 * Una lluvia de estrellitas doradas: salen del centro, se abren más que el confeti, giran
 * poco y caen despacio mientras destellan.
 */
export function starBurst(seed: string, count = 44): ConfettiPiece[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, () => ({
    x: round(38 + rand() * 24),
    dx: Math.round((rand() - 0.5) * 2 * 220),
    rise: -Math.round(140 + rand() * 240),
    fall: Math.round(260 + rand() * 300),
    rotate: Math.round((rand() - 0.5) * 2 * 90),
    delay: round(rand() * 0.3),
    duration: round(2.4 + rand() * 1.1),
    size: round(0.35 + rand() * 0.4),
    shape: 'star' as const,
    color: 0,
    twinkle: round(0.35 + rand() * 0.35),
  }))
}

export interface FlutterPiece {
  /** clip-path que deja ver solo esta figura de la imagen. */
  clip: string
  /** Centro de la figura: alrededor de él aletea y gira. */
  origin: string
  /** Segundos del vaivén y del aleteo, y retraso (negativo: ya va a medio camino). */
  drift: number
  flap: number
  delay: number
}

/** Cada figura de la imagen recortada para moverse sola, con su propio ritmo. */
export function flutterPieces(parts: SpritePart[], seed: string): FlutterPiece[] {
  const rand = seededRandom(seed)
  return parts.map((p) => ({
    clip: `inset(${round(p.y, 1)}% ${round(Math.max(0, 100 - p.x - p.w), 1)}% ${round(Math.max(0, 100 - p.y - p.h), 1)}% ${round(p.x, 1)}%)`,
    origin: `${round(p.x + p.w / 2, 1)}% ${round(p.y + p.h / 2, 1)}%`,
    drift: round(4.5 + rand() * 3),
    flap: round(0.35 + rand() * 0.3),
    delay: round(-rand() * 6),
  }))
}

export interface Glint {
  /** Centro de la figura, en % de la imagen. */
  left: number
  top: number
  /** Tamaño del destello, en % del ancho de la imagen. */
  size: number
  delay: number
  duration: number
}

/** Un destello sobre el centro de cada figura; las grandes, más grandes (hasta un tope). */
export function glints(parts: SpritePart[], seed: string): Glint[] {
  const rand = seededRandom(seed)
  return parts.map((p) => ({
    left: round(p.x + p.w / 2, 1),
    top: round(p.y + p.h / 2, 1),
    size: round(Math.min(18, Math.max(5, Math.min(p.w, p.h) * 0.5)), 1),
    delay: round(-rand() * 3),
    duration: round(1.8 + rand() * 1.8),
  }))
}

export interface CityLight {
  /** Posición en % de la sección. */
  top: number
  left: number
  /** Diámetro en rem. */
  size: number
  /** Cuánto sube y baja, en px. */
  drift: number
  delay: number
  duration: number
}

/**
 * Luces de ciudad: círculos suaves y desenfocados (como las luces de la calle vistas de
 * lejos) que suben, bajan y laten despacio. Más chicas que grandes, y repartidas por toda
 * la sección sin amontonarse: una por franja de alto.
 */
export function cityLights(seed: string, count = 12): CityLight[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    top: round(((i + rand()) / count) * 92 + 2),
    left: round(3 + rand() * 94),
    size: round(0.7 + rand() ** 2 * 2.8),
    drift: Math.round(10 + rand() * 18),
    delay: round(-rand() * 9),
    duration: round(7 + rand() * 6),
  }))
}

export interface GlitterSpeck {
  /** Punto de salida, en % de la sección. */
  top: number
  left: number
  /** Tamaño en px. */
  size: number
  /** Cuánto cae y cuánto se va de lado, en px. */
  fall: number
  sway: number
  delay: number
  duration: number
  /** Las estrellitas (de 4 puntas) destellan; los puntos solo brillan. */
  star: boolean
}

/**
 * Escarcha: brillitos plateados que caen despacio, se mecen y se apagan. Salen de la mitad
 * de arriba para que se vean caer; uno de cada cuatro es una estrellita de 4 puntas.
 */
export function glitter(seed: string, count = 22): GlitterSpeck[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    top: round(rand() * 60),
    left: round(2 + rand() * 96),
    size: round(i % 4 === 0 ? 7 + rand() * 5 : 2 + rand() * 2.5, 1),
    fall: Math.round(70 + rand() * 120),
    sway: Math.round((rand() - 0.5) * 2 * 22),
    delay: round(-rand() * 10),
    duration: round(6 + rand() * 6),
    star: i % 4 === 0,
  }))
}

export interface Searchlight {
  /** Base del haz, en % del ancho de la sección. */
  left: number
  /** Ángulos de ida y vuelta, en grados (0 = vertical). */
  from: number
  to: number
  delay: number
  duration: number
}

/**
 * Reflectores: haces de luz que barren el cielo desde abajo, como en un estreno de
 * Broadway. Uno sale de cada lado y se cruzan en el centro; con tres, el del centro va más
 * lento. Cada sección los mueve a su propio ritmo.
 */
export function searchlights(seed: string, count = 2): Searchlight[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => {
    const side = count === 1 ? 0 : (i / (count - 1)) * 2 - 1 // -1 izquierda … 1 derecha
    // El de la izquierda se inclina hacia la derecha y viceversa: se cruzan en el centro.
    const lean = Math.round(-side * (14 + rand() * 6)) + 0
    return {
      left: round(50 + side * (30 + rand() * 6)),
      from: lean - Math.round(16 + rand() * 8),
      to: lean + Math.round(16 + rand() * 8),
      delay: round(-rand() * 8),
      duration: round((side === 0 ? 14 : 9) + rand() * 4),
    }
  })
}

export interface DiscoBall {
  /** Dónde cuelga, en % del ancho de la sección. */
  left: number
  /** Largo de la cadena, en % del alto de la sección. */
  drop: number
  /** Diámetro, en fracción del ancho de la sección (la CSS lo acota en rem). */
  size: number
  /** Segundos por vuelta (cada bola gira a su ritmo; la segunda, al revés). */
  spin: number
  reverse: boolean
  delay: number
}

/**
 * Bolas disco colgadas de arriba: una grande y, con dos, otra más chica y más alta del
 * otro lado. Nunca al centro, donde va el título.
 */
export function discoBalls(seed: string, count = 2): DiscoBall[] {
  const rand = seededRandom(seed)
  const first = rand() < 0.5 ? 'left' : 'right'
  return Array.from({ length: count }, (_, i) => {
    const onLeft = (i % 2 === 0) === (first === 'left')
    return {
      left: round(onLeft ? 13 + rand() * 7 : 80 + rand() * 7),
      drop: round(i === 0 ? 7 + rand() * 6 : 2 + rand() * 4),
      size: round(i === 0 ? 0.2 + rand() * 0.03 : 0.14 + rand() * 0.03),
      spin: round(12 + rand() * 6),
      reverse: i % 2 === 1,
      delay: round(-rand() * 12),
    }
  })
}

export interface DiscoTile {
  /** Centro del espejo en la esfera, en grados. */
  lon: number
  lat: number
  /** Ancho y alto, en fracción del diámetro. */
  w: number
  h: number
  /** Qué tanto refleja (0 = oscuro … 1 = blanco). */
  light: number
}

/**
 * Los espejos de una bola disco: filas de polo a polo, con menos espejos (más angostos)
 * hacia los polos para que todos se vean casi cuadrados. Casi todos grises; los de arriba,
 * que miran a la luz, más claros, y uno de cada ocho encendido.
 */
export function discoTiles(seed: string, rows = 10): DiscoTile[] {
  const rand = seededRandom(seed)
  const step = 180 / rows
  const tiles: DiscoTile[] = []
  for (let r = 0; r < rows; r++) {
    const lat = -90 + step * (r + 0.5)
    const cos = Math.cos((lat * Math.PI) / 180)
    const n = Math.max(3, Math.round(2 * rows * cos))
    for (let c = 0; c < n; c++) {
      const lit = rand() < 0.125
      const base = 0.28 + 0.22 * ((lat + 90) / 180) + rand() * 0.24
      tiles.push({
        lon: round((360 / n) * (c + (r % 2) * 0.5), 1),
        lat: round(lat, 1),
        w: round(((Math.PI * cos) / n) * 0.9, 3),
        h: round((Math.PI / (2 * rows)) * 0.9, 3),
        light: round(lit ? 0.9 + rand() * 0.1 : Math.min(0.85, base)),
      })
    }
  }
  return tiles
}

export interface DiscoRay {
  /** Ángulo, en grados (0 = hacia arriba). */
  angle: number
  /** Largo, en fracción del ancho de la sección. */
  length: number
  delay: number
  duration: number
}

/** Rayos finos que salen de la bola, como la luz que rebota en el humo del salón. */
export function discoRays(seed: string, count = 9): DiscoRay[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    angle: Math.round((360 / count) * i + rand() * 18),
    length: round(0.35 + rand() * 0.45),
    delay: round(-rand() * 5),
    duration: round(3 + rand() * 3),
  }))
}

export interface DiscoSpot {
  /** Altura, en % de la sección. */
  top: number
  /** Ancho en px (el alto es un poco menor: la luz cae inclinada). */
  size: number
  /** Retraso negativo: dónde va del recorrido al empezar (se reparten a lo ancho). */
  delay: number
  /** Algunos titilan además de recorrer la sección (segundos), y uno de cada cinco es una estrella. */
  twinkle: number | null
  star: boolean
}

/**
 * Reflejos de bola disco: puntos de luz que recorren la sección de lado a lado, todos al
 * mismo ritmo (como los de una bola que gira), repartidos a lo alto y a lo ancho.
 * Recorren `travel` segundos; la sección los mueve con translate (no se pinta de nuevo).
 */
export function discoSpots(seed: string, count = 26, travel = 24): DiscoSpot[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    top: round(((i + rand()) / count) * 96 + 2),
    size: round(i % 5 === 0 ? 9 + rand() * 6 : 3 + rand() * 4.5, 1),
    delay: round((-((i * 7) % count) / count) * travel - rand() * (travel / count)),
    twinkle: i % 3 === 0 ? round(1.6 + rand() * 2.2) : null,
    star: i % 5 === 0,
  }))
}

export type FoilShape = 'strip' | 'square' | 'disc'

export interface FoilPiece {
  /** Dónde empieza a caer, en % del ancho de la pantalla. */
  left: number
  /** Ancho y alto en rem. */
  width: number
  height: number
  shape: FoilShape
  /** Segundos de cada ciclo (cae el 70 %, el resto espera arriba) y retraso. */
  duration: number
  delay: number
  /** Vaivén de lado mientras cae, en px. */
  sway: number
  /** Segundos de cada vuelta sobre sí mismo (es cuando destella) y su inclinación. */
  flip: number
  tilt: number
  /** Cuál de los tres tonos de plata. */
  shade: number
}

/**
 * Confeti de papel metálico (como las mariposas de NAT, pero lluvia plateada): tiras,
 * cuadritos y lentejuelas que caen girando y destellan al voltearse. Pocos a la vez y a
 * su ritmo: se ve fino, no amontonado.
 */
export function foilConfetti(seed: string, count = 16): FoilPiece[] {
  const rand = seededRandom(seed)
  const shapes: FoilShape[] = ['strip', 'square', 'strip', 'disc']
  return Array.from({ length: count }, (_, i) => {
    const shape = shapes[i % shapes.length]!
    const size = 0.42 + rand() * 0.3
    return {
      left: round(((i + rand()) / count) * 96 + 2),
      width: round(shape === 'strip' ? size * 0.55 : size, 2),
      height: round(shape === 'strip' ? size * 1.5 : size, 2),
      shape,
      duration: round(11 + rand() * 7),
      delay: round(-rand() * 18),
      sway: Math.round((rand() - 0.5) * 2 * 46),
      flip: round(1.1 + rand() * 1.6),
      tilt: Math.round(rand() * 180),
      shade: i % 3,
    }
  })
}
