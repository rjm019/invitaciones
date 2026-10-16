import type { ThemeManifest } from './types'

/**
 * Registro de temas. Cada tema es una carpeta src/themes/<id>/ con:
 *   manifest.ts  fuentes, fondo de página y defaults por sección
 *   theme.css    tokens y ajustes visuales bajo [data-theme="<id>"]
 *   assets/      decoraciones propias del tema (opcional; la media del evento tiene prioridad)
 * Agregar un tema es agregar una carpeta: no hay que registrarlo a mano. `_shared/` no es un
 * tema: sus adornos los ven todos.
 */
const manifests = import.meta.glob<{ default: ThemeManifest }>('./*/manifest.ts')
const styles = import.meta.glob('./*/theme.css')
const assets = import.meta.glob<string>('./*/assets/*.{webp,png,jpg,jpeg,svg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export async function loadTheme(id: string): Promise<ThemeManifest | null> {
  const manifest = manifests[`./${id}/manifest.ts`]
  if (!manifest) return null
  const [mod] = await Promise.all([manifest(), styles[`./${id}/theme.css`]?.()])
  return mod.default
}

/** Archivos de una carpeta de assets: nombre de archivo → URL. */
function folder(prefix: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(assets)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, url]) => [path.slice(prefix.length), url]),
  )
}

/**
 * Assets del tema: nombre de archivo → URL. Debajo van los adornos compartidos
 * (`_shared/assets`: la Estatua, el puente, la puerta del elevador…), que cualquier tema y
 * cualquier diseño de sección pueden usar por su nombre; los del tema ganan.
 */
export function themeAssets(id: string): Record<string, string> {
  return { ...folder('./_shared/assets/'), ...folder(`./${id}/assets/`) }
}

/** Los temas que existen (para el editor del gestor): id de cada carpeta. */
export function listThemes(): string[] {
  return Object.keys(manifests)
    .map((path) => path.slice(2, -'/manifest.ts'.length))
    .sort()
}
