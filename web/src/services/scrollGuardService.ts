/**
 * Mantiene la página quieta cuando algo ajeno la mueve. El reproductor de Spotify, al
 * pasar a otra canción, desplaza su lista hasta ella y el navegador arrastra la página
 * entera hasta el reproductor (un desplazamiento suave de ~1 s que llega justo después del
 * aviso de canción nueva). Con hold() se guarda dónde estaba el invitado; si la página se
 * mueve sin que él la toque, se regresa ahí. Cualquier toque, rueda o tecla lo deja libre.
 *
 * Sin DOM: el tiempo y la posición llegan como números.
 */

/** Cuánto dura la protección después de cada aviso (el desplazamiento de Spotify dura ~1 s). */
export const HOLD_MS = 2000

export interface ScrollGuard {
  /** Algo está por mover la página: guardar dónde está ahora. */
  hold(now: number, y: number): void
  /** El invitado tocó, giró la rueda o usó el teclado: él manda. */
  release(): void
  /** La página se movió a `y`: devuelve a dónde regresarla, o null si se deja así. */
  restoreTo(now: number, y: number): number | null
}

export function createScrollGuard(holdMs = HOLD_MS): ScrollGuard {
  let heldY: number | null = null
  let until = 0
  return {
    hold(now, y) {
      heldY = y
      until = now + holdMs
    },
    release() {
      heldY = null
    },
    restoreTo(now, y) {
      if (heldY === null) return null
      if (now > until) {
        heldY = null
        return null
      }
      return Math.abs(y - heldY) < 1 ? null : heldY
    },
  }
}
