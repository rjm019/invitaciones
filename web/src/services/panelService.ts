import type {
  PanelBrand,
  PanelDedication,
  PanelInvitation,
  PanelOverview,
  PanelRsvp,
  PanelSession,
  TableAssignment,
} from '@/types/panel'
import { takeBoot } from './bootService'
import { localDate } from './calendarService'
import { http } from './http'

/** Llamadas del panel del dueño. La sesión es un token (Authorization: Bearer). */

const base = (slug: string) => `/admin/events/${encodeURIComponent(slug)}`
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

/**
 * Cómo se ve la entrada al panel (título, tema, colores y fuentes). La página ya lo trae
 * (window.__BOOT__); si no, se pide.
 */
export async function getBrand(slug: string): Promise<PanelBrand> {
  const boot = takeBoot<{ brand: PanelBrand }>('panel', slug)
  if (boot) return boot.brand
  const { data } = await http.get<{ brand: PanelBrand }>(`${base(slug)}/brand`)
  return data.brand
}

export async function login(slug: string, password: string): Promise<PanelSession> {
  const { data } = await http.post<PanelSession>(`${base(slug)}/session`, { password })
  return data
}

export async function getOverview(slug: string, token: string): Promise<PanelOverview> {
  const { data } = await http.get<PanelOverview>(base(slug), auth(token))
  return data
}

export async function createInvitation(
  slug: string,
  token: string,
  passes: number,
  label: string,
): Promise<PanelInvitation> {
  const { data } = await http.post<{ invitation: PanelInvitation }>(
    `${base(slug)}/invitations`,
    { passes, label: label.trim() || null },
    auth(token),
  )
  return data.invitation
}

export async function updateDeadline(
  slug: string,
  token: string,
  deadline: string,
): Promise<PanelRsvp> {
  const { data } = await http.put<{ rsvp: PanelRsvp }>(
    `${base(slug)}/deadline`,
    { deadline },
    auth(token),
  )
  return data.rsvp
}

/** Huella del evento: barata de pedir cada pocos segundos para saber si hay algo nuevo. */
export async function getVersion(slug: string, token: string): Promise<string> {
  const { data } = await http.get<{ version: string }>(`${base(slug)}/version`, auth(token))
  return data.version
}

/** Asigna mesas (una persona o varias) y devuelve el panel ya actualizado. */
export async function assignTables(
  slug: string,
  token: string,
  assignments: TableAssignment[],
): Promise<PanelOverview> {
  const { data } = await http.put<PanelOverview>(
    `${base(slug)}/tables`,
    { assignments },
    auth(token),
  )
  return data
}

/** Cuántos lugares de una invitación ya tienen nombre, y cuántos asisten. */
export function invitationProgress(invitation: PanelInvitation) {
  const attending = invitation.guests.filter((g) => g.attending).length
  return {
    filled: invitation.guests.length,
    attending,
    declined: invitation.guests.length - attending,
    empty: invitation.passes - invitation.guests.length,
    complete: invitation.guests.length >= invitation.passes,
  }
}

/** "Te quedan 2 de 3 cambios" / "Ya usaste los 3 cambios". */
export function changesLabel(rsvp: PanelRsvp): string {
  if (rsvp.changes_left <= 0) return `Ya usaste los ${rsvp.max_changes} cambios`
  return rsvp.changes_left === 1
    ? `Te queda 1 de ${rsvp.max_changes} cambios`
    : `Te quedan ${rsvp.changes_left} de ${rsvp.max_changes} cambios`
}

/** Fechas que acepta el servidor para la fecha límite: de hoy al día del evento (zona del evento). */
export function deadlineBounds(
  overview: Pick<PanelOverview, 'event'>,
  now: Date = new Date(),
): { min: string; max: string | null } {
  const iso = (d: { year: number; month: number; day: number }) =>
    `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
  const tz = overview.event.timezone
  return {
    min: iso(localDate(now.toISOString(), tz)),
    max: overview.event.starts_at ? iso(localDate(overview.event.starts_at, tz)) : null,
  }
}

/** Busca por nombre de la invitación, por número (#12) o por nombre de un invitado. */
/** Busca en las dedicatorias por quién la escribió, la invitación o el texto. */
export function filterDedications(list: PanelDedication[], query: string): PanelDedication[] {
  const q = query.trim().toLocaleLowerCase('es')
  if (!q) return list
  return list.filter((d) =>
    `${d.name} ${d.label ?? ''} ${d.message}`.toLocaleLowerCase('es').includes(q),
  )
}

export function filterInvitations(list: PanelInvitation[], query: string): PanelInvitation[] {
  const q = query.trim().toLocaleLowerCase('es').replace(/^#/, '')
  if (!q) return list
  return list.filter(
    (inv) =>
      inv.id === q ||
      (inv.label ?? '').toLocaleLowerCase('es').includes(q) ||
      inv.guests.some((g) => g.full_name.toLocaleLowerCase('es').includes(q)),
  )
}

/** Una persona (o un lugar libre) de la lista completa de invitados. */
export interface GuestRow {
  key: string
  invitationId: string
  invitationLabel: string | null
  slot: number
  /** null = lugar libre (todavía sin nombre). */
  name: string | null
  attending: boolean | null
  table: number | null
}

export type GuestFilter = 'all' | 'attending' | 'declined' | 'no-table' | 'empty'

/** Todas las personas de todas las invitaciones, en orden de invitación y lugar; con los lugares libres. */
export function guestRows(invitations: PanelInvitation[]): GuestRow[] {
  return invitations.flatMap((inv) =>
    Array.from({ length: inv.passes }, (_, i) => {
      const slot = i + 1
      const guest = inv.guests.find((g) => g.slot === slot)
      return {
        key: `${inv.id}-${slot}`,
        invitationId: inv.id,
        invitationLabel: inv.label,
        slot,
        name: guest?.full_name ?? null,
        attending: guest ? guest.attending : null,
        table: guest?.table ?? null,
      }
    }),
  )
}

const FILTERS: Record<GuestFilter, (r: GuestRow) => boolean> = {
  all: (r) => r.name !== null,
  attending: (r) => r.attending === true,
  declined: (r) => r.attending === false,
  'no-table': (r) => r.attending === true && r.table === null,
  empty: (r) => r.name === null,
}

/** Filtra por estado y busca por nombre, por invitación (#3 o su nombre) o por mesa ("mesa 5"). */
export function filterGuests(rows: GuestRow[], filter: GuestFilter, query = ''): GuestRow[] {
  const q = query.trim().toLocaleLowerCase('es')
  const table = /^mesa\s*(\d+)$/.exec(q)
  return rows.filter(FILTERS[filter]).filter((r) => {
    if (!q) return true
    if (table) return r.table === Number(table[1])
    if (q.startsWith('#')) return r.invitationId === q.slice(1)
    return (
      (r.name ?? '').toLocaleLowerCase('es').includes(q) ||
      (r.invitationLabel ?? '').toLocaleLowerCase('es').includes(q)
    )
  })
}

/** Cuántos hay en cada filtro (para las pestañas). */
export function guestCounts(rows: GuestRow[]): Record<GuestFilter, number> {
  return Object.fromEntries(
    (Object.keys(FILTERS) as GuestFilter[]).map((f) => [f, rows.filter(FILTERS[f]).length]),
  ) as Record<GuestFilter, number>
}

/** Personas que asisten por mesa, en orden de mesa, y cuántas faltan de mesa. */
export function tableSummary(rows: GuestRow[]): {
  tables: { table: number; people: number }[]
  unassigned: number
} {
  const counts = new Map<number, number>()
  let unassigned = 0
  for (const r of rows) {
    if (r.attending !== true) continue
    if (r.table === null) unassigned++
    else counts.set(r.table, (counts.get(r.table) ?? 0) + 1)
  }
  return {
    tables: [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([table, people]) => ({ table, people })),
    unassigned,
  }
}

/** "5" → 5; "" → null (quitar mesa); cualquier otra cosa → undefined (no válido). */
export function parseTable(value: string, max = 999): number | null | undefined {
  const v = value.trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) return undefined
  const n = Number(v)
  return n >= 1 && n <= max ? n : undefined
}
