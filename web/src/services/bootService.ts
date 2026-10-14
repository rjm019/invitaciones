/**
 * Datos que el servidor ya puso en la página (window.__BOOT__): el evento en /e/{slug} y la
 * invitación en /i/{token}. Así la invitación no espera otra petición para arrancar. Se
 * usan una sola vez: si se vuelve a pedir lo mismo (navegar y regresar), va a la API.
 *
 * Sin DOM: main.ts entrega el valor con setBoot().
 */
export interface Boot {
  kind: 'event' | 'invitation'
  key: string
  data: unknown
}

let boot: Boot | null = null

function isBoot(value: unknown): value is Boot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (v.kind === 'event' || v.kind === 'invitation') && typeof v.key === 'string' && !!v.data
}

export function setBoot(value: unknown): void {
  boot = isBoot(value) ? value : null
}

/** Los datos de la página si son de esto (tipo y clave); null si no. Solo la primera vez. */
export function takeBoot<T>(kind: Boot['kind'], key: string): T | null {
  if (!boot || boot.kind !== kind || boot.key !== key) return null
  const data = boot.data as T
  boot = null
  return data
}

/** Tema del evento que trae la página (para empezar a cargarlo de inmediato). */
export function bootTheme(): string | null {
  const data = boot?.data as { event?: { theme?: unknown } } | undefined
  return typeof data?.event?.theme === 'string' ? data.event.theme : null
}
