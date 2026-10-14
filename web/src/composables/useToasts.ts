import { onBeforeUnmount, ref } from 'vue'

/** Avisos breves del gestor ("Publicado ✓", "No se pudo guardar"…), uno debajo de otro. */
export interface Toast {
  id: number
  message: string
  tone: 'ok' | 'error' | 'info'
  action?: { label: string; run: () => void }
}

const toasts = ref<Toast[]>([])
let next = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
  clearTimeout(timers.get(id))
  timers.delete(id)
}

export function useToasts() {
  const mine = new Set<number>()

  function toast(
    message: string,
    tone: Toast['tone'] = 'ok',
    action?: Toast['action'],
    ms = 4500,
  ): number {
    const id = next++
    toasts.value = [...toasts.value, { id, message, tone, action }]
    mine.add(id)
    timers.set(
      id,
      setTimeout(() => dismissToast(id), ms),
    )
    return id
  }

  // Al salir de la página, sus avisos ya no tienen a dónde llevar.
  onBeforeUnmount(() => mine.forEach(dismissToast))

  return { toasts, toast, dismiss: dismissToast }
}
