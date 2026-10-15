import type { EventConfig } from '@/types/event'
import type { Invitation, InvitationGuest, RsvpPayload } from '@/types/invitation'
import type { EventWeather } from '@/types/weather'
import type { PreviewPatch } from './previewProtocol'

/** Lugares de la invitación de ejemplo que usa la vista previa del gestor. */
export const PREVIEW_PASSES = 4

const SECTION_PATCHED = ['colors', 'text_styles', 'title', 'subtitle', 'text', 'button'] as const

/**
 * Aplica lo que se ve al instante a la config que ya se está viendo, sin esperar al
 * servidor: paleta, fuentes, los textos del evento y los colores, estilos y textos de cada
 * sección. Una sección sin cambios conserva su objeto (Vue no la vuelve a pintar).
 */
export function applyPreviewPatch(config: EventConfig, patch: PreviewPatch): EventConfig {
  const next: EventConfig = { ...config }
  if (patch.palette) next.palette = { ...patch.palette }
  if (patch.fonts) next.fonts = { ...patch.fonts }
  if (patch.extra_fonts) next.extra_fonts = [...patch.extra_fonts]
  if (patch.event) {
    next.title = patch.event.title
    next.subtitle = patch.event.subtitle
    next.celebrant = { ...patch.event.celebrant } as EventConfig['celebrant']
    next.venue = { ...config.venue, ...patch.event.venue }
  }
  if (patch.sections) {
    const changes = patch.sections
    next.sections = config.sections.map((section) => {
      const change = section.key ? changes[section.key] : undefined
      if (!change) return section
      const same = SECTION_PATCHED.every(
        (key) => JSON.stringify(section[key]) === JSON.stringify(change[key]),
      )
      return same
        ? section
        : { ...section, ...Object.fromEntries(SECTION_PATCHED.map((key) => [key, change[key]])) }
    })
  }
  return next
}

/** Una invitación personal de ejemplo ("Familia Ejemplo", 4 lugares) para ver la confirmación. */
export function previewInvitation(config: EventConfig): Invitation {
  return {
    label: 'Familia Ejemplo',
    passes: PREVIEW_PASSES,
    guests: [],
    remaining: PREVIEW_PASSES,
    open: config.rsvp.open,
    closed_message: config.rsvp.open ? null : 'Las confirmaciones ya cerraron.',
    deadline: config.rsvp.deadline,
    dedication: null,
  }
}

/** "Confirmar" en la vista previa: se ve como de verdad, pero no se guarda nada. */
export function previewRespond(
  invitation: Invitation,
  payload: RsvpPayload,
  now: Date,
): Invitation {
  const guests: InvitationGuest[] = [...invitation.guests]
  for (const guest of payload.guests) {
    if (guests.length >= invitation.passes) break
    guests.push({
      slot: guests.length + 1,
      full_name: guest.full_name.trim(),
      attending: payload.attending,
      responded_at: now.toISOString(),
    })
  }
  return { ...invitation, guests, remaining: invitation.passes - guests.length }
}

/**
 * Clima de ejemplo: una invitación sin publicar no tiene clima todavía (el servidor solo lo
 * da para las publicadas). Se ve como el típico de la fecha, con la ciudad del salón.
 */
export function previewWeather(config: EventConfig): EventWeather | null {
  if (!config.starts_at) return null
  const date = config.starts_at.slice(0, 10)
  const hour = Number(config.starts_at.slice(11, 13)) || 17
  const hours = [0, 2, 4, 6].map((plus, i) => ({
    time: `${String((hour + plus) % 24).padStart(2, '0')}:00`,
    temp: 22 - i * 2,
    code: null,
    rain_chance: null,
    is_day: hour + plus < 19,
  }))
  return {
    kind: 'typical',
    date,
    place: config.venue.city || config.venue.display_name || 'Tu ciudad',
    day: { code: null, max: 24, min: 12, rain_chance: 20 },
    hours,
    years: [2016, 2025],
    updated_at: new Date().toISOString(),
    forecast_from: date,
  }
}
