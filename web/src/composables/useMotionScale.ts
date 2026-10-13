/**
 * Velocidad de los efectos (--motion-scale de los tokens) para los temporizadores de JS,
 * que tienen que esperar lo mismo que dura la animación. 1 si no está definida.
 */
export function motionScale(element: Element = document.documentElement): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue('--motion-scale'))
  return Number.isFinite(value) && value > 0 ? value : 1
}
