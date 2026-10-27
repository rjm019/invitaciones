import { googleCalendarUrl } from './calendarService'

/** Horas que dura, en el calendario, la visita a un lugar (misa, recepción…). */
export const PLACE_HOURS = 3

/**
 * Enlace "Agregar al calendario" de un lugar con su hora y su dirección. null si el lugar
 * no trae hora propia (el servidor solo manda `starts_at` con "calendario" encendido).
 */
export function placeCalendarUrl(
  place: { label?: string; name: string; address?: string; starts_at?: string },
  eventTitle: string,
): string | null {
  if (!place.starts_at) return null
  return googleCalendarUrl({
    title: [eventTitle, place.label].filter(Boolean).join(' · '),
    startsAt: place.starts_at,
    hours: PLACE_HOURS,
    location: [place.name, place.address].filter(Boolean).join(', '),
  })
}
