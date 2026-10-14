import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import {
  applyTheme,
  fontVars,
  googleFontsUrl,
  paletteVars,
  resolveFonts,
} from '@/services/themeService'
import { loadTheme } from '@/themes'
import type { ThemeFont, ThemeManifest } from '@/themes/types'
import type { PanelBrand } from '@/types/panel'

/**
 * El panel con los colores y las letras de su invitación: el tema, la paleta y las fuentes
 * del Excel van al documento (los mismos --color-* y --font-* de la invitación). Se quitan
 * al salir del panel.
 */
export function usePanelTheme(brand: Ref<PanelBrand | null>) {
  const theme = shallowRef<ThemeManifest | null>(null)
  const fonts = shallowRef<Record<string, ThemeFont> | null>(null)
  let revert: (() => void) | null = null
  let active = true

  watch(
    () => [brand.value?.theme, brand.value?.palette, brand.value?.fonts] as const,
    async ([id]) => {
      if (!id) return
      const manifest = await loadTheme(id)
      const current = brand.value
      if (!active || !manifest || !current) return
      const resolved = resolveFonts(manifest.fonts, current.fonts ?? {})
      revert?.()
      revert = applyTheme(
        document.documentElement,
        manifest.id,
        { ...paletteVars(current.palette ?? {}), ...fontVars(resolved) },
        googleFontsUrl(Object.values(resolved)),
      )
      theme.value = manifest
      fonts.value = resolved
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    active = false
    revert?.()
  })

  return { theme, fonts }
}
