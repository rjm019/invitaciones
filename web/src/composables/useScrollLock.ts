import { onBeforeUnmount, watch } from 'vue'

const CLASS = 'is-scroll-locked'
/**
 * Quién tiene puesto el candado. La clase se quita solo cuando nadie lo tiene: un visor de
 * fotos que se monta cerrado (con su candado en false) no suelta el del sobre.
 */
const holders = new Set<symbol>()
/** Teclas que desplazan la página (fuera de un campo de texto). */
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
])

export interface ScrollLockOptions {
  /**
   * Además del overflow hidden de html y body: tampoco deja que un dedo (touchmove) ni las
   * teclas de desplazamiento muevan la página. No reimplementa el scroll: solo lo impide
   * mientras dure el candado (iOS a veces ignora el overflow del body).
   */
  strict?: boolean
}

function editable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest?.('input, textarea, select, [contenteditable="true"]')
}

/** Mientras locked() sea true la página no hace scroll (por ejemplo, con el sobre cerrado). */
export function useScrollLock(locked: () => boolean, options: ScrollLockOptions = {}): void {
  const root = typeof document === 'undefined' ? null : document.documentElement
  const me = Symbol('scroll-lock')
  const hold = (on: boolean) => {
    if (on) holders.add(me)
    else holders.delete(me)
    root?.classList.toggle(CLASS, holders.size > 0)
  }
  const onTouch = (e: TouchEvent) => {
    if (e.cancelable && e.touches.length === 1) e.preventDefault()
  }
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key) && !editable(e.target)) {
      // Espacio sobre un botón lo activa (abrir el sobre): ese no se toca.
      if ((e.key === ' ' || e.key === 'Spacebar') && (e.target as HTMLElement)?.closest?.('button')) return
      e.preventDefault()
    }
  }
  let listening = false
  const listen = (on: boolean) => {
    if (!options.strict || typeof window === 'undefined' || on === listening) return
    listening = on
    if (on) {
      window.addEventListener('touchmove', onTouch, { passive: false })
      window.addEventListener('keydown', onKey)
    } else {
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('keydown', onKey)
    }
  }
  const stop = watch(
    locked,
    (value) => {
      hold(value)
      listen(value)
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    stop()
    listen(false)
    hold(false)
  })
}
