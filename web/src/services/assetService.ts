/**
 * Resuelve el nombre de un archivo ("toile.webp") a su URL. Busca primero en la media
 * del evento (eventos/<slug>/media) y después en los assets del tema; una URL completa
 * pasa tal cual. Si no está en ningún lado devuelve null: nunca una imagen rota.
 */
export type AssetResolver = (nameOrUrl: string | null | undefined) => string | null

const IS_URL = /^(https?:|data:|blob:|\/)/i

export function createAssetResolver(
  eventAssets: Record<string, string>,
  themeAssets: Record<string, string> = {},
): AssetResolver {
  return (value) => {
    const name = value?.trim()
    if (!name) return null
    if (IS_URL.test(name)) return name
    return eventAssets[name] ?? themeAssets[name] ?? null
  }
}
