import { onBeforeUnmount, ref, type Ref } from 'vue'

/** true si la persona pidió menos movimiento en su sistema. Reacciona si lo cambia. */
export function useReducedMotion(): Ref<boolean> {
  const query =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  const reduced = ref(query?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => (reduced.value = e.matches)
  query?.addEventListener('change', onChange)
  onBeforeUnmount(() => query?.removeEventListener('change', onChange))
  return reduced
}
