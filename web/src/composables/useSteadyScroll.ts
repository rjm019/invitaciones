import { onBeforeUnmount, onMounted } from 'vue'
import { createScrollGuard } from '@/services/scrollGuardService'

/** Lo que hace el invitado para moverse por la página (todo pasivo: no se bloquea nada). */
const INPUTS = ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'] as const

/**
 * Deja la página donde el invitado la tiene cuando algo ajeno intenta moverla (el
 * reproductor de Spotify al cambiar de canción). `subscribe` recibe la función que guarda
 * la posición y devuelve cómo dejar de escuchar. No toca el scroll del invitado: solo
 * escucha, y cualquier toque, rueda o tecla lo deja libre.
 */
export function useSteadyScroll(subscribe: (hold: () => void) => () => void) {
  const guard = createScrollGuard()
  const release = () => guard.release()
  const onScroll = () => {
    const y = guard.restoreTo(performance.now(), window.scrollY)
    if (y !== null) window.scrollTo(window.scrollX, y)
  }
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = subscribe(() => guard.hold(performance.now(), window.scrollY))
    INPUTS.forEach((e) => window.addEventListener(e, release, { passive: true, capture: true }))
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    unsubscribe?.()
    INPUTS.forEach((e) => window.removeEventListener(e, release, { capture: true }))
    window.removeEventListener('scroll', onScroll)
  })
}
