/**
 * Enlaces de video y publicaciones de YouTube, Instagram y Facebook. Lógica pura (sin Vue ni
 * DOM) y espejo de api/app/Services/Media/SocialEmbed.php: los dos comparten los mismos
 * casos de prueba. Solo `https`, sin usuario ni puerto, y solo los dominios de esas redes;
 * todo lo demás (javascript:, http, otros dominios, "youtube.com@otro.com") da `null`.
 * Las URL de salida se arman desde las partes ya validadas, nunca copian lo que se escribió.
 */

export type SocialNetwork = 'youtube' | 'instagram' | 'facebook'
/** video, short (YouTube vertical), reel (Instagram) o post. */
export type SocialKind = 'video' | 'short' | 'reel' | 'post'

export interface SocialLink {
  network: SocialNetwork
  kind: SocialKind
  id: string
  /** Enlace canónico (el botón "Ver en…"). */
  url: string
  /** Iframe propio de la red (YouTube sin cookies, plugin de Facebook); Instagram usa su script. */
  embed: string | null
}

export const SOCIAL_NETWORKS: SocialNetwork[] = ['youtube', 'instagram', 'facebook']

const LABELS: Record<SocialNetwork, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

/** El script oficial de Instagram: solo se pide al tocar play. */
export const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js'

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]
const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com']
const FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com']

export function networkLabel(network: SocialNetwork): string {
  return LABELS[network]
}

/** Valida un enlace; con `network`, además debe ser de esa red. */
export function parseSocialUrl(input: string, network?: SocialNetwork): SocialLink | null {
  const text = (input ?? '').trim()
  if (text === '' || text.length > 500 || /[\s\x00-\x1f\x7f\\<>"'`]/.test(text)) return null
  // Solo https y sin usuario, contraseña ni puerto (se revisa en el texto: URL() los normaliza).
  const authority = /^https:\/\/([^/?#]*)/i.exec(text)?.[1]
  if (authority === undefined || authority.includes('@') || authority.includes(':')) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  const path = url.pathname
  const query = url.searchParams

  let found: SocialLink | null = null
  if (YOUTUBE_HOSTS.includes(host) || host === 'youtu.be') found = youtube(host, path, query)
  else if (INSTAGRAM_HOSTS.includes(host)) found = instagram(path)
  else if (FACEBOOK_HOSTS.includes(host) || host === 'fb.watch') found = facebook(host, path, query)

  return found && (!network || network === found.network) ? found : null
}

function youtube(host: string, path: string, query: URLSearchParams): SocialLink | null {
  let id: string | null = null
  let kind: SocialKind = 'video'
  let m: RegExpExecArray | null
  const v = query.get('v') ?? ''
  if (host === 'youtu.be') {
    id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(path)?.[1] ?? null
  } else if ((m = /^\/shorts\/([A-Za-z0-9_-]{11})\/?$/.exec(path))) {
    id = m[1]
    kind = 'short'
  } else if ((m = /^\/(?:embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(path))) {
    id = m[1]
  } else if (/^\/watch\/?$/.test(path) && /^[A-Za-z0-9_-]{11}$/.test(v)) {
    id = v
  }
  if (!id) return null
  return {
    network: 'youtube',
    kind,
    id,
    url:
      kind === 'short'
        ? `https://www.youtube.com/shorts/${id}`
        : `https://www.youtube.com/watch?v=${id}`,
    embed: `https://www.youtube-nocookie.com/embed/${id}`,
  }
}

function instagram(path: string): SocialLink | null {
  const m = /^(?:\/[A-Za-z0-9._]{1,30})?\/(reels?|p|tv)\/([A-Za-z0-9_-]{5,30})\/?$/.exec(path)
  if (!m) return null
  const kind: SocialKind = m[1] === 'p' ? 'post' : m[1] === 'tv' ? 'video' : 'reel'
  const segment = m[1] === 'reels' ? 'reel' : m[1]
  return {
    network: 'instagram',
    kind,
    id: m[2],
    url: `https://www.instagram.com/${segment}/${m[2]}/`,
    embed: null,
  }
}

function facebook(host: string, path: string, query: URLSearchParams): SocialLink | null {
  let kind: SocialKind = 'video'
  let id: string | null = null
  let url: string | null = null
  let m: RegExpExecArray | null
  const v = query.get('v') ?? ''
  const story = query.get('story_fbid') ?? ''
  const page = query.get('id') ?? ''
  if (host === 'fb.watch') {
    if ((m = /^\/([A-Za-z0-9_-]{4,30})\/?$/.exec(path)))
      [id, url] = [m[1], `https://fb.watch/${m[1]}/`]
  } else if (/^\/watch\/?$/.test(path) && /^\d{5,25}$/.test(v)) {
    ;[id, url] = [v, `https://www.facebook.com/watch/?v=${v}`]
  } else if ((m = /^\/reel\/(\d{5,25})\/?$/.exec(path))) {
    ;[id, url] = [m[1], `https://www.facebook.com/reel/${m[1]}`]
  } else if ((m = /^\/share\/([vrp])\/([A-Za-z0-9_-]{4,40})\/?$/.exec(path))) {
    kind = m[1] === 'p' ? 'post' : 'video'
    ;[id, url] = [m[2], `https://www.facebook.com/share/${m[1]}/${m[2]}/`]
  } else if (
    (m = /^\/([A-Za-z0-9.-]{1,80})\/videos\/(?:[^/]{1,120}\/)?(\d{5,25})\/?$/.exec(path))
  ) {
    ;[id, url] = [m[2], `https://www.facebook.com/${m[1]}/videos/${m[2]}`]
  } else if ((m = /^\/([A-Za-z0-9.-]{1,80})\/posts\/([A-Za-z0-9_-]{5,80})\/?$/.exec(path))) {
    kind = 'post'
    ;[id, url] = [m[2], `https://www.facebook.com/${m[1]}/posts/${m[2]}`]
  } else if (
    path === '/permalink.php' &&
    /^[A-Za-z0-9_-]{5,80}$/.test(story) &&
    /^\d{5,25}$/.test(page)
  ) {
    kind = 'post'
    ;[id, url] = [story, `https://www.facebook.com/permalink.php?story_fbid=${story}&id=${page}`]
  }
  if (!id || !url) return null
  // fb.watch no sirve de href para el plugin: se queda como enlace ("Ver en Facebook").
  const embed =
    host === 'fb.watch'
      ? null
      : `https://www.facebook.com/plugins/${kind === 'post' ? 'post' : 'video'}.php?href=${encodeURIComponent(url)}&show_text=false&width=560`
  return { network: 'facebook', kind, id, url, embed }
}

/**
 * Lo que se pone en el iframe al tocar play (con autoplay: ya hubo un toque). YouTube sin
 * cookies y sin videos relacionados de otros canales; el plugin de Facebook con su play.
 */
export function playerSrc(link: SocialLink): string | null {
  if (!link.embed) return null
  if (link.network === 'youtube') return `${link.embed}?autoplay=1&rel=0&playsinline=1`
  if (link.network === 'facebook') return `${link.embed}&autoplay=true`
  return null
}

/** La proporción de la fachada (`aspect-ratio`): el formato elegido o la que pide la red. */
export function aspectRatio(
  link: SocialLink | null,
  format: 'horizontal' | 'vertical' = 'horizontal',
): string {
  if (link?.kind === 'post') return '4 / 5'
  if (link?.kind === 'short' || link?.kind === 'reel') return '9 / 16'
  return format === 'vertical' ? '9 / 16' : '16 / 9'
}
