/** Qué hace un gesto sobre el visor de fotos. */
export type SwipeAction = 'next' | 'prev' | 'close' | null

/** Lo mínimo que se tiene que mover un dedo para que cuente como deslizar (px). */
export const SWIPE_MIN = 48

/** Índice de la foto vecina, dando la vuelta en los extremos. */
export function stepIndex(index: number, step: 1 | -1, count: number): number {
  if (count <= 0) return 0
  return (index + step + count) % count
}

/**
 * Un gesto del visor: hacia la izquierda pasa a la siguiente, hacia la derecha a la
 * anterior y hacia abajo lo cierra. Lo corto o lo diagonal no hace nada, para no robarle el
 * toque a quien solo quería ver la foto.
 */
export function swipeAction(dx: number, dy: number, min: number = SWIPE_MIN): SwipeAction {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < min) return null
  if (ay > ax) return dy > 0 ? 'close' : null
  return dx < 0 ? 'next' : 'prev'
}
