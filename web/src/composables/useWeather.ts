import { ref, watch, type Ref } from 'vue'
import { getWeather, isStale } from '@/services/weatherService'
import type { EventWeather } from '@/types/weather'
import { useInView } from './useInView'
import { usePolling } from './usePolling'

/** Cada minuto se revisa si toca renovar el pronóstico (y se refresca "hace X min"). */
const TICK_MS = 60 * 1000

/**
 * Clima del evento: se pide cuando la sección está por entrar a la pantalla y, si es
 * pronóstico, se renueva cada 15 minutos mientras la invitación sigue abierta y a la vista
 * (y al volver a la pestaña). El servidor guarda caché, así que renovar es barato.
 * En la vista previa del gestor se usan datos de ejemplo (`sample`).
 */
export function useWeather(
  slug: () => string,
  target: Ref<Element | null>,
  /** En la vista previa del gestor: datos de ejemplo en lugar de pedirlos al servidor. */
  sample?: () => EventWeather | null,
) {
  const weather = ref<EventWeather | null>(null)
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const now = ref(Date.now())
  let fetchedAt = 0

  async function load(): Promise<void> {
    status.value = weather.value ? status.value : 'loading'
    try {
      const fake = sample?.()
      weather.value = fake ?? (await getWeather(slug()))
      fetchedAt = Date.now()
      status.value = 'ready'
    } catch {
      // Si ya había clima, se queda el que estaba; si no, la sección dice que no está disponible.
      if (!weather.value) status.value = 'error'
    }
  }

  const near = useInView(target, { rootMargin: '300px 0px', threshold: 0 })
  watch(near, (visible) => {
    if (visible && status.value === 'idle') void load()
  })

  usePolling(
    async () => {
      now.value = Date.now()
      if (isStale(weather.value, fetchedAt, now.value)) await load()
    },
    TICK_MS,
    () => status.value === 'ready',
  )

  return { weather, status, now }
}
