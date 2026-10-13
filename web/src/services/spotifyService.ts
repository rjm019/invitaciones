/** Reproductor incrustado de Spotify a partir del enlace que se copia en la app. */

export interface SpotifyEmbed {
  /** URL del iframe (tema oscuro, como el reproductor que comparte Spotify). */
  embedUrl: string
  /** El mismo contenido en Spotify, para abrirlo o seguir la playlist. */
  openUrl: string
  /** URI para la API del reproductor (spotify:playlist:…). */
  uri: string
  kind: string
}

/** Textos del reproductor en español de Latinoamérica ("Guardar en Spotify", "Muestra"). */
export const SPOTIFY_LOCALE = 'es-419'

const KINDS = 'playlist|album|track|artist|episode|show'
const LINK = new RegExp(
  `open\\.spotify\\.com/(?:intl-[a-z]{2}(?:-[a-z]{2})?/)?(?:embed/)?(${KINDS})/([A-Za-z0-9]+)`,
  'i',
)
const URI = new RegExp(`^spotify:(${KINDS}):([A-Za-z0-9]+)$`, 'i')

/**
 * Acepta el enlace de "Compartir" (con o sin /intl-es/ y ?si=…) o el URI spotify:playlist:…;
 * cualquier otra cosa → null.
 */
export function spotifyEmbed(url: string | null | undefined): SpotifyEmbed | null {
  const value = (url ?? '').trim()
  const match = LINK.exec(value) ?? URI.exec(value)
  if (!match) return null
  const kind = match[1].toLowerCase()
  const id = match[2]
  return {
    embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0&locale=${SPOTIFY_LOCALE}`,
    openUrl: `https://open.spotify.com/${kind}/${id}`,
    uri: `spotify:${kind}:${id}`,
    kind,
  }
}

/**
 * Alto del reproductor. Spotify muestra tantas canciones como quepan y el resto se recorre
 * dentro: "completa" (por defecto) deja ver unas 8; "lista", 3 (su tamaño estándar);
 * "compacta", solo la portada y el botón.
 */
export function spotifyHeight(variant?: string): number {
  if (variant === 'compacta' || variant === 'compact') return 152
  if (variant === 'lista' || variant === 'list') return 352
  return 560
}
