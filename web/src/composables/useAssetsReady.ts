import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface CriticalAssets {
  images: string[]
  fonts: string[]
}

export interface AssetLoaders {
  image: (url: string) => Promise<void>
  fonts: (families: string[]) => Promise<void>
}

/** Lo máximo que se espera: si algo tarda más, la invitación se muestra igual. */
export const READY_TIMEOUT_MS = 5000

/**
 * true cuando ya cargaron las imágenes y fuentes de lo primero que se ve (o pasó el tiempo
 * máximo). Mientras `source` devuelve null (el tema aún no llega), espera. Una vez lista,
 * se queda lista.
 */
export function useAssetsReady(
  source: () => CriticalAssets | null,
  {
    timeoutMs = READY_TIMEOUT_MS,
    loaders = browserLoaders,
  }: { timeoutMs?: number; loaders?: AssetLoaders } = {},
): Ref<boolean> {
  const ready = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let started = false

  const stop = watch(
    source,
    (assets) => {
      if (!assets || started) return
      started = true
      timer = setTimeout(() => (ready.value = true), timeoutMs)
      void Promise.allSettled([
        ...assets.images.map(loaders.image),
        loaders.fonts(assets.fonts),
      ]).then(() => {
        clearTimeout(timer)
        ready.value = true
      })
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    stop()
    clearTimeout(timer)
  })
  return ready
}

/** Descarga y decodifica la imagen (luego el <img> o el fondo la toman de la caché). */
function loadImage(url: string): Promise<void> {
  const img = new Image()
  img.decoding = 'async'
  img.setAttribute('fetchpriority', 'high')
  img.src = url
  return img.decode().catch(() => undefined)
}

/** Espera la hoja de Google Fonts del tema y luego descarga cada familia. */
async function loadFonts(families: string[]): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const link = document.getElementById('theme-fonts') as HTMLLinkElement | null
  if (link && !link.sheet) {
    await new Promise((resolve) => {
      link.addEventListener('load', resolve, { once: true })
      link.addEventListener('error', resolve, { once: true })
    })
  }
  if (!document.fonts) return
  await Promise.allSettled(families.map((f) => document.fonts.load(`1em "${f}"`)))
}

const browserLoaders: AssetLoaders = { image: loadImage, fonts: loadFonts }
