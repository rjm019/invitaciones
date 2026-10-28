/**
 * Pestañas que se recorren con el teclado o deslizando el dedo (la historia `cronologia` y
 * cualquier otra que lo necesite). Lógica pura, sin Vue ni DOM.
 */

/**
 * La pestaña a la que lleva una tecla, como pide el patrón de pestañas de WAI-ARIA: flechas
 * (dan la vuelta en las orillas), Inicio y Fin. Otra tecla: null (no se hace nada).
 */
export function tabTarget(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/**
 * Un deslizamiento horizontal: hacia la izquierda avanza (1), hacia la derecha regresa (-1).
 * Si fue corto o más vertical que horizontal (la persona estaba bajando la página), 0.
 */
export function swipeStep(dx: number, dy: number, threshold = 40): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return 0
  return dx < 0 ? 1 : -1
}
