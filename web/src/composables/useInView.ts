import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * true cuando el elemento entra a la pantalla. Con once (por defecto) se queda en true:
 * sirve para animaciones de entrada (el sello que cae, las figuras que llegan…).
 */
export function useInView(
  target: Ref<Element | null>,
  { once = true, rootMargin = '0px', threshold = 0.2 } = {},
): Ref<boolean> {
  const inView = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!target.value) return
    if (typeof IntersectionObserver === 'undefined') {
      inView.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        inView.value = !!entry?.isIntersecting || (once && inView.value)
        if (once && inView.value) observer?.disconnect()
      },
      { rootMargin, threshold },
    )
    observer.observe(target.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return inView
}
