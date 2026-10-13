import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Corre `task` cada `intervalMs` mientras la pestaña está a la vista (no gasta datos en
 * segundo plano) y de inmediato al volver a ella. Nunca encima de sí misma. Se limpia al
 * desmontar.
 */
export function usePolling(
  task: () => Promise<void> | void,
  intervalMs: number,
  enabled: () => boolean = () => true,
) {
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false

  async function tick(): Promise<void> {
    if (running || !enabled() || document.visibilityState === 'hidden') return
    running = true
    try {
      await task()
    } finally {
      running = false
    }
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') void tick()
  }

  onMounted(() => {
    timer = setInterval(() => void tick(), intervalMs)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
  })

  return { tick }
}
