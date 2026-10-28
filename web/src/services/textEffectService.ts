/**
 * Efectos de texto (títulos, nombres, el "&"): cuál le toca a un texto según los efectos de
 * su sección y cuánto espera cada letra. Lógica pura; los pinta FxText.vue con
 * effects/text.css (solo transform y opacity, a la velocidad de la invitación).
 *
 * - typewriter-title (maquina_escribir): letra por letra, con un cursor de tinta.
 * - stamp (sello_estampado): cada letra cae y se asienta como un sello.
 * - ink-dry (tinta_seca): la letra aparece húmeda (en el acento) y se seca en la tinta.
 * - calligraphy (caligrafia): el texto se descubre de izquierda a derecha, como una pluma.
 * - gold-leaf (pan_de_oro): un brillo dorado lo recorre de vez en cuando.
 * - letterpress: se imprime (baja apenas, como presionado); es solo CSS y sirve en cualquier
 *   título con data-text="title", aunque la sección no use FxText.
 */
export type TextEffect =
  | 'typewriter-title'
  | 'stamp'
  | 'ink-dry'
  | 'calligraphy'
  | 'gold-leaf'
  | 'letterpress'

/** En orden de preferencia: si una sección pide dos, gana el primero. */
export const TEXT_EFFECTS: readonly TextEffect[] = [
  'typewriter-title',
  'stamp',
  'ink-dry',
  'calligraphy',
  'gold-leaf',
  'letterpress',
]

/** Los que parten el texto en letras (las letras van ocultas al lector de pantalla). */
export const LETTER_EFFECTS: readonly TextEffect[] = ['typewriter-title', 'stamp', 'ink-dry']

/** El efecto de texto de una sección (o null). `allow` limita a algunos (p. ej. solo caligrafía). */
export function textEffect(
  effects: readonly string[] | undefined,
  allow?: readonly TextEffect[],
): TextEffect | null {
  const list = effects ?? []
  return TEXT_EFFECTS.find((e) => list.includes(e) && (!allow || allow.includes(e))) ?? null
}

/** ms entre letra y letra (a velocidad 1): un título largo no tarda más de ~1.8 s en total. */
export function letterStep(effect: TextEffect, count: number): number {
  const base = effect === 'typewriter-title' ? 70 : effect === 'stamp' ? 75 : 40
  const total = effect === 'ink-dry' ? 1100 : 1800
  return Math.max(18, Math.min(base, Math.round(total / Math.max(1, count))))
}
