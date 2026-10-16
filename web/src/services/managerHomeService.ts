import type { ManagerEvent } from '@/types/design'

/**
 * El inicio del gestor sin Vue: en qué pestaña va cada tarjeta, la búsqueda y cuándo hay que
 * escribir la dirección para eliminar. Las muestras de la landing (demo=SI) van aparte para
 * no llenar las invitaciones. Eliminar es solo de quien administra (el servidor lo revisa).
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

/**
 * ¿Hay que escribir su dirección para eliminarla? Sí en una invitación (o muestra) visible,
 * con enlaces o con confirmaciones; también si no se pudo leer. El servidor revisa lo mismo.
 */
export function needsConfirmation(event: ManagerEvent): boolean {
  if (event.error) return true
  if (event.template) return false
  return event.published || (event.counts?.invitations ?? 0) > 0 || (event.counts?.guests ?? 0) > 0
}

/** Cómo se llama lo que se elimina, para el menú y la confirmación. */
export function kindOf(event: ManagerEvent): 'plantilla' | 'muestra' | 'invitación' {
  if (event.template) return 'plantilla'
  return event.demo ? 'muestra' : 'invitación'
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
