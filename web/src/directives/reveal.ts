import type { Directive } from 'vue'

/**
 * v-reveal: la sección aparece (fade + subida) la primera vez que entra a la pantalla.
 * Un solo IntersectionObserver para toda la página. v-reveal="false" lo desactiva.
 */
let observer: IntersectionObserver | null = null

/**
 * Se muestra cuando ya se ve una parte razonable: el 20 % de una sección corta, o un
 * 15 % de la pantalla si es una sección alta. Se mide contra la pantalla completa (sin
 * margen negativo): la última sección de la página, que ya no puede subir más, también
 * tiene que aparecer.
 */
export function shouldReveal(
  entry: Pick<
    IntersectionObserverEntry,
    'isIntersecting' | 'intersectionRatio' | 'intersectionRect'
  >,
  viewportHeight: number,
): boolean {
  return (
    entry.isIntersecting &&
    (entry.intersectionRatio >= 0.2 || entry.intersectionRect.height >= viewportHeight * 0.15)
  )
}

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!shouldReveal(entry, innerHeight)) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    },
    { threshold: [0, 0.05, 0.1, 0.2] },
  )
  return observer
}

export const vReveal: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    if (binding.value === false) return
    el.classList.add('fx-reveal-target')
    const io = getObserver()
    if (io) io.observe(el)
    else el.classList.add('is-visible')
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
