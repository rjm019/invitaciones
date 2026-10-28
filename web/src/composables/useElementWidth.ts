import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * El ancho en pantalla (px de CSS, sin transformaciones) de un elemento, al día con un
 * ResizeObserver. 0 hasta medir o si el navegador no tiene ResizeObserver. Se desconecta en
 * onBeforeUnmount.
 */
export function useElementWidth(target: Ref<Element | null>): Ref<number> {
  const width = ref(0)
  let observer: ResizeObserver | undefined
  onMounted(() => {
    if (!target.value || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (Math.abs(w - width.value) >= 1) width.value = Math.round(w)
    })
    observer.observe(target.value)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return width
}
