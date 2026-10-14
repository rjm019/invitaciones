import type { EventConfig } from '@/types/event'
import { takeBoot } from './bootService'
import { http } from './http'

/** Evento armado desde su layout (xlsx/CSV) por la API (o ya incluido en la página). */
export async function getEvent(slug: string): Promise<EventConfig> {
  const booted = takeBoot<{ event: EventConfig }>('event', slug)
  if (booted) return booted.event
  const { data } = await http.get<{ event: EventConfig }>(
    `/public/events/${encodeURIComponent(slug)}`,
  )
  return data.event
}
