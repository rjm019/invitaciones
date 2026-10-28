import { http } from './http'

/** Una dedicatoria del muro: solo nombre y mensaje (el servidor nunca manda más). */
export interface WallEntry {
  name: string
  message: string
}

/** Cuántas muestra el muro como máximo (el servidor también lo acota). */
export const MAX_WALL_ENTRIES = 60

/** Deja solo las entradas bien formadas, con un máximo. */
export function parseWall(data: unknown): WallEntry[] {
  const list = (data as { dedications?: unknown } | null)?.dedications
  if (!Array.isArray(list)) return []
  const out: WallEntry[] = []
  for (const item of list) {
    const { name, message } = (item ?? {}) as Partial<WallEntry>
    if (typeof name === 'string' && typeof message === 'string' && message.trim() !== '') {
      out.push({ name: name.trim(), message })
    }
    if (out.length >= MAX_WALL_ENTRIES) break
  }
  return out
}

/**
 * Las dedicatorias recibidas, las más recientes primero. Con `token` (invitación personal)
 * se pide por su enlace; si no, por el evento. Si la sección no tiene el muro encendido,
 * la API responde 404: aquí es una lista vacía.
 */
export async function getDedicationWall(slug: string, token?: string): Promise<WallEntry[]> {
  const url = token
    ? `/public/invitations/${encodeURIComponent(token)}/dedications`
    : `/public/events/${encodeURIComponent(slug)}/dedications`
  try {
    const { data } = await http.get<unknown>(url)
    return parseWall(data)
  } catch {
    return []
  }
}
