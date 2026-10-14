import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Reordenar una lista arrastrando (mouse o dedo, desde su asa) o con el teclado
 * (Alt + ↑/↓). Cada elemento de la lista lleva `data-sort-index`. Mientras se arrastra,
 * `dragging` es el que se mueve y `target` el lugar donde caería (para la línea guía).
 */
export function useDragSort(
  list: Ref<HTMLElement | null>,
  onMove: (from: number, to: number) => void,
) {
  const dragging = ref<number | null>(null)
  const target = ref<number | null>(null)
  const offset = ref(0)
  let startY = 0
  let pointer: number | null = null
  let handle: HTMLElement | null = null

  function items(): HTMLElement[] {
    return [...(list.value?.querySelectorAll<HTMLElement>('[data-sort-index]') ?? [])]
  }

  /** Lugar donde caería según la altura del puntero (antes del primero cuyo centro queda abajo). */
  function placeAt(y: number): number {
    const all = items()
    for (let i = 0; i < all.length; i++) {
      const rect = all[i].getBoundingClientRect()
      if (y < rect.top + rect.height / 2) return i
    }
    return all.length
  }

  function start(e: PointerEvent, index: number): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    dragging.value = index
    target.value = index
    startY = e.clientY
    offset.value = 0
    pointer = e.pointerId
    handle = e.currentTarget as HTMLElement
    handle.setPointerCapture?.(e.pointerId)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
  }

  function move(e: PointerEvent): void {
    if (e.pointerId !== pointer || dragging.value === null) return
    offset.value = e.clientY - startY
    target.value = placeAt(e.clientY)
  }

  function finish(): void {
    if (handle && pointer !== null) handle.releasePointerCapture?.(pointer)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', cancel)
    dragging.value = null
    target.value = null
    offset.value = 0
    pointer = null
    handle = null
  }

  function end(e: PointerEvent): void {
    if (e.pointerId !== pointer) return
    const from = dragging.value
    const place = target.value
    finish()
    // Caer "antes del siguiente" de sí mismo es quedarse donde estaba.
    if (from !== null && place !== null && place !== from && place !== from + 1) {
      onMove(from, place > from ? place - 1 : place)
    }
  }

  function cancel(): void {
    finish()
  }

  /** Alt + ↑/↓ mueve el elemento con foco. */
  function keydown(e: KeyboardEvent, index: number, count: number): void {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const to = e.key === 'ArrowUp' ? index - 1 : index + 1
    if (to >= 0 && to < count) onMove(index, to)
  }

  onBeforeUnmount(finish)

  return { dragging, target, offset, start, keydown }
}
