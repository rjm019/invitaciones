import { onBeforeUnmount, ref } from 'vue'

/** Copiar al portapapeles con aviso de "Copiado" por unos segundos. */
export function useClipboard(resetMs = 2000) {
  const copied = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** @returns false si el navegador no dejó copiar (hay que seleccionar a mano). */
  async function copy(text: string, id = text): Promise<boolean> {
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Navegadores viejos o sin permiso: el método clásico con un textarea temporal.
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      area.remove()
    }
    if (ok) {
      copied.value = id
      clearTimeout(timer)
      timer = setTimeout(() => (copied.value = null), resetMs)
    }
    return ok
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { copied, copy }
}
