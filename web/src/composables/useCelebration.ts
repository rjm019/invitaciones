import { inject, onBeforeUnmount, provide, ref, type InjectionKey, type Ref } from 'vue'
import { confetti, type ConfettiPiece } from '@/services/effectsService'
import { motionScale } from './useMotionScale'

export interface Burst {
  id: number
  pieces: ConfettiPiece[]
}

export interface CelebrationContext {
  bursts: Readonly<Ref<Burst[]>>
  /** Lanza una ráfaga de pétalos y confeti (al abrir el sobre, al confirmar). */
  celebrate: () => void
}

const KEY: InjectionKey<CelebrationContext> = Symbol('celebration')

/** Lo que dura una ráfaga en pantalla antes de quitarla del DOM (a velocidad 1). */
export const BURST_MS = 4200

/**
 * Celebraciones de la invitación. Cada ráfaga se quita sola al terminar; con "menos
 * movimiento" no se lanza nada.
 */
export function provideCelebration(reducedMotion: () => boolean = () => false) {
  const bursts = ref<Burst[]>([])
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let next = 0

  const context: CelebrationContext = {
    bursts,
    celebrate() {
      if (reducedMotion()) return
      const id = ++next
      bursts.value = [...bursts.value, { id, pieces: confetti(`rafaga-${id}`) }]
      const timer = setTimeout(() => {
        bursts.value = bursts.value.filter((b) => b.id !== id)
        timers.delete(timer)
      }, BURST_MS * motionScale())
      timers.add(timer)
    },
  }
  onBeforeUnmount(() => timers.forEach(clearTimeout))
  provide(KEY, context)
  return context
}

/** null fuera de InvitationRenderer (entonces no se celebra). */
export function useCelebration(): CelebrationContext | null {
  return inject(KEY, null)
}
