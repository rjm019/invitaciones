import { onBeforeUnmount, watch } from 'vue'

const CLASS = 'is-scroll-locked'

/** Mientras locked() sea true la página no hace scroll (por ejemplo, con el sobre cerrado). */
export function useScrollLock(locked: () => boolean): void {
  const root = typeof document === 'undefined' ? null : document.documentElement
  const stop = watch(locked, (value) => root?.classList.toggle(CLASS, value), { immediate: true })
  onBeforeUnmount(() => {
    stop()
    root?.classList.remove(CLASS)
  })
}
