import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Progreso de una línea de tiempo según el scroll: `fill` de 0 a 1 (para scaleY) y
 * cuántos puntos ya se "encendieron". Solo escucha el scroll mientras la línea está
 * en pantalla, y mide con requestAnimationFrame (nada de selectores globales).
 */
export function useTimelineProgress(
  track: Ref<HTMLElement | null>,
  dots: Ref<HTMLElement[]>,
  enabled: () => boolean,
) {
  const fill = ref(enabled() ? 0 : 1)
  const active = ref(enabled() ? 0 : Number.POSITIVE_INFINITY)
  let frame = 0
  let observer: IntersectionObserver | null = null

  const measure = () => {
    frame = 0
    const el = track.value
    if (!el) return
    const line = innerHeight * 0.6
    const rect = el.getBoundingClientRect()
    fill.value = Math.min(1, Math.max(0, (line - rect.top) / rect.height))
    active.value = dots.value.filter((d) => {
      const r = d.getBoundingClientRect()
      return r.top + r.height / 2 <= line
    }).length
  }
  const onScroll = () => {
    frame ||= requestAnimationFrame(measure)
  }

  onMounted(() => {
    if (!enabled() || !track.value || typeof IntersectionObserver === 'undefined') {
      fill.value = 1
      active.value = Number.POSITIVE_INFINITY
      return
    }
    observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        addEventListener('scroll', onScroll, { passive: true })
        measure()
      } else {
        removeEventListener('scroll', onScroll)
      }
    })
    observer.observe(track.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    removeEventListener('scroll', onScroll)
    cancelAnimationFrame(frame)
  })

  return { fill, active }
}
