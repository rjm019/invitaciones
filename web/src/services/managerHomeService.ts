import type { ManagerEvent } from '@/types/design'

/**
 * El inicio del gestor sin Vue: en qué pestaña va cada tarjeta, la búsqueda y quién puede
 * eliminar. Las muestras de la landing (demo=SI) van aparte para no llenar las invitaciones.
 */

export type HomeTab = 'events' | 'templates' | 'demos'

export function tabOf(event: ManagerEvent): HomeTab {
  if (event.template) return 'templates'
  return event.demo ? 'demos' : 'events'
}

export function groupByTab(events: ManagerEvent[]): Record<HomeTab, ManagerEvent[]> {
  const out: Record<HomeTab, ManagerEvent[]> = { events: [], templates: [], demos: [] }
  for (const event of events) out[tabOf(event)].push(event)
  return out
}

/** Por nombre, título o dirección, sin importar mayúsculas ni acentos. */
export function searchEvents(events: ManagerEvent[], query: string): ManagerEvent[] {
  const q = fold(query.trim())
  if (!q) return events
  return events.filter((e) => fold(`${e.title} ${e.slug} ${e.celebrant ?? ''}`).includes(q))
}

/** Solo quien administra elimina, y solo plantillas (una invitación guarda sus confirmaciones). */
export function canDelete(event: ManagerEvent, isAdmin: boolean): boolean {
  return isAdmin && event.template
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
