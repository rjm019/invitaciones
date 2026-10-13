import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { parallaxOffset } from '@/services/effectsService'

/**
 * Desplazamiento vertical (px) para un parallax leve. Solo escucha el scroll mientras el
 * elemento está en pantalla, y mide con requestAnimationFrame. Se aplica con transform.
 */
export function useParallax(
  target: Ref<HTMLElement | null>,
  factor: number,
  enabled: () => boolean,
): Ref<number> {
  const offset = ref(0)
  let frame = 0
  let observer: IntersectionObserver | null = null

  const measure = () => {
    frame = 0
    if (target.value)
      offset.value = parallaxOffset(target.value.getBoundingClientRect(), innerHeight, factor)
  }
  const onScroll = () => {
    frame ||= requestAnimationFrame(measure)
  }

  onMounted(() => {
    if (!enabled() || !target.value || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        addEventListener('scroll', onScroll, { passive: true })
        measure()
      } else {
        removeEventListener('scroll', onScroll)
      }
    })
    observer.observe(target.value)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    removeEventListener('scroll', onScroll)
    cancelAnimationFrame(frame)
  })

  return offset
}
