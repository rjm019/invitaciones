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

export type ConfettiShape = 'petal' | 'strip' | 'dot'

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
