import { onBeforeUnmount, watch } from 'vue'
import { sampleFontsUrl } from '@/services/fontCatalog'

let counter = 0

/**
 * Carga de Google Fonts solo las letras que hacen falta para mostrar muestras (los nombres
 * en las tarjetas, el selector de letras). Una hoja por lugar que la pide; se quita al salir.
 */
export function useFontSamples(families: () => string[], text: () => string): void {
  const id = `g-font-samples-${++counter}`

  watch(
    [families, text],
    ([list, sample]) => {
      const url = sampleFontsUrl(list, sample)
      let link = document.getElementById(id) as HTMLLinkElement | null
      if (!url) {
        link?.remove()
        return
      }
      link ??= Object.assign(document.createElement('link'), { id, rel: 'stylesheet' })
      if (link.href !== url) link.href = url
      if (!link.isConnected) document.head.appendChild(link)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => document.getElementById(id)?.remove())
}
