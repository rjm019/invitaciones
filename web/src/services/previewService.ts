import type { EventConfig } from '@/types/event'
import type { Invitation, InvitationGuest, RsvpPayload } from '@/types/invitation'
import type { EventWeather } from '@/types/weather'
import type { StylePatch } from './previewProtocol'

/** Lugares de la invitación de ejemplo que usa la vista previa del gestor. */
export const PREVIEW_PASSES = 4

/**
 * Aplica un cambio de estilo a la config que ya se está viendo, sin esperar al servidor:
 * paleta, fuentes y los colores y estilos de texto de algunas secciones.
 */
export function applyStylePatch(config: EventConfig, patch: StylePatch): EventConfig {
  const next: EventConfig = { ...config }
  if (patch.palette) next.palette = { ...patch.palette }
  if (patch.fonts) next.fonts = { ...patch.fonts }
  if (patch.extra_fonts) next.extra_fonts = [...patch.extra_fonts]
  if (patch.sections) {
    const changes = patch.sections
    next.sections = config.sections.map((section) =>
      section.key && changes[section.key]
        ? {
            ...section,
            colors: changes[section.key].colors,
            text_styles: changes[section.key].text_styles,
          }
        : section,
    )
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
