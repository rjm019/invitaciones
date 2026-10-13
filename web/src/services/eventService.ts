import type { EventConfig } from '@/types/event'
import { http } from './http'

/** Evento armado desde su layout (xlsx/CSV) por la API. */
export async function getEvent(slug: string): Promise<EventConfig> {
  const { data } = await http.get<{ event: EventConfig }>(
    `/public/events/${encodeURIComponent(slug)}`,
  )
  return data.event
}
