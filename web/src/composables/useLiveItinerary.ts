import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { liveItinerary, type LiveMoment, type LiveState } from '@/services/liveItineraryService'

/** Cada cuánto se vuelve a calcular el momento actual (es un reloj, no una animación). */
export const LIVE_REFRESH_MS = 30_000

/**
 * Momento actual del itinerario, recalculado cada 30 s. Apagado (`enabled` en false) no
 * calcula ni deja intervalos. El intervalo se limpia en onBeforeUnmount.
 */
export function useLiveItinerary(
  moments: () => LiveMoment[],
  startsAt: () => string | null | undefined,
  timeZone: () => string,
  enabled: () => boolean,
): { live: Ref<LiveState | null> } {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  const live = computed<LiveState | null>(() => {
    const start = startsAt()
    if (!enabled() || !start) return null
    return liveItinerary(moments(), start, timeZone(), now.value)
  })

  onMounted(() => {
    if (!enabled()) return
    now.value = Date.now()
    timer = setInterval(() => (now.value = Date.now()), LIVE_REFRESH_MS)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    timer = null
  })

  return { live }
}
