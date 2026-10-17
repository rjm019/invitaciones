/**
 * Visitas para las estadísticas del gestor: cada página vista (la landing, la invitación
 * general, los enlaces personales y las muestras) manda un aviso al servidor con
 * `navigator.sendBeacon`, que no frena la página ni espera respuesta. El servidor pone la
 * IP, el dispositivo y si es un robot; aquí solo va lo que el navegador sabe.
 *
 * Sin Vue ni DOM global: quien llama pasa el `window` (la landing y las páginas de la SPA).
 */

export interface VisitPayload {
  /** La página, sin el token de un enlace personal ("/i"). */
  pagina: string
  /** La página de antes (de dónde llegó), si la hay. */
  ref?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  /** La invitación (en los enlaces personales, porque la página no lo dice). */
  evento?: string
  /** Una muestra de la landing. */
  muestra?: boolean
  /** En este navegador hay una sesión del gestor: es del equipo, no cuenta en las estadísticas. */
  equipo?: boolean
}

export interface VisitInput {
  pathname: string
  search: string
  referrer: string
  event?: string
  demo?: boolean
  team?: boolean
}

/** La misma llave que `useManagerSession`. */
export const MANAGER_SESSION_KEY = 'gestor:sesion'

const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const

/** Lo que se manda. El token de `/i/<token>` nunca sale de la página. */
export function visitPayload(input: VisitInput): VisitPayload {
  const pagina = input.pathname.startsWith('/i/') ? '/i' : input.pathname || '/'
  const payload: VisitPayload = { pagina }
  if (input.referrer) payload.ref = input.referrer.slice(0, 500)
  const params = new URLSearchParams(input.search)
  for (const key of UTM) {
    const value = params.get(key)?.trim()
    if (value) payload[key] = value.slice(0, 60)
  }
  if (input.event) payload.evento = input.event
  if (input.demo) payload.muestra = true
  if (input.team) payload.equipo = true
  return payload
}

/** Lo que hace falta del navegador (en las pruebas, uno de mentira). */
export interface VisitWindow {
  location: Pick<Location, 'pathname' | 'search'>
  document: Pick<Document, 'referrer'>
  navigator: Pick<Navigator, 'webdriver'> & Partial<Pick<Navigator, 'sendBeacon'>>
  localStorage?: Pick<Storage, 'getItem'>
  fetch?: typeof fetch
}

function hasManagerSession(win: VisitWindow): boolean {
  try {
    return !!win.localStorage?.getItem(MANAGER_SESSION_KEY)
  } catch {
    return false // sin acceso al almacenamiento (modo privado estricto)
  }
}

/**
 * Anota la visita de la página actual. Los navegadores automatizados (pruebas, capturas)
 * no cuentan. Nunca lanza un error: contar visitas no le puede fallar a nadie.
 */
export function trackVisit(
  win: VisitWindow,
  extra: Pick<VisitInput, 'event' | 'demo'> = {},
  /** La API en otro dominio (VITE_API_URL); vacío = la misma página. */
  base: string | undefined = '',
): boolean {
  try {
    if (win.navigator.webdriver) return false
    const payload = visitPayload({
      pathname: win.location.pathname,
      search: win.location.search,
      referrer: win.document.referrer,
      team: hasManagerSession(win),
      ...extra,
    })
    const url = `${base ?? ''}/api/public/visits`
    // Como texto: así el navegador no pregunta antes (OPTIONS) y el aviso sale aunque se cierre la página.
    const body = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=UTF-8' })
    if (win.navigator.sendBeacon?.(url, body)) return true
    void win.fetch?.(url, { method: 'POST', body, keepalive: true }).catch(() => undefined)
    return !!win.fetch
  } catch {
    return false
  }
}
