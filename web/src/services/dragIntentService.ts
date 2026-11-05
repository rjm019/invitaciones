/**
 * ¿Un clic o un arrastre? En el modo «Elegir» de la vista previa, pulsar y mover más de
 * `threshold` px sobre un texto, imagen o elemento agregado es un arrastre (entra solo a
 * «Acomodar»); si se suelta antes, es un toque y elige. Lógica pura: la página le pasa las
 * coordenadas y lo que haya debajo del puntero (`payload`).
 */
export interface DragIntent<T> {
  /** Empieza a vigilar un gesto (ratón o dedo) sobre `payload`. */
  start(x: number, y: number, payload: T): void
  /** Devuelve el `payload` la primera vez que el gesto pasa el umbral; después, null. */
  move(x: number, y: number): T | null
  /**
   * Termina el gesto. true si fue un toque (nunca pasó el umbral y no se cancela):
   * entonces hay que elegir.
   */
  end(cancelled?: boolean): boolean
  /** Hay un gesto vigilándose (aún sin pasar el umbral). */
  readonly pending: boolean
}

export function createDragIntent<T>(threshold = 4): DragIntent<T> {
  let origin: { x: number; y: number; payload: T } | null = null
  let dragged = false
  return {
    start(x, y, payload) {
      origin = { x, y, payload }
      dragged = false
    },
    move(x, y) {
      if (!origin || dragged) return null
      if (Math.hypot(x - origin.x, y - origin.y) <= threshold) return null
      dragged = true
      return origin.payload
    },
    end(cancelled = false) {
      const tap = !!origin && !dragged && !cancelled
      origin = null
      dragged = false
      return tap
    },
    get pending() {
      return !!origin && !dragged
    },
  }
}
