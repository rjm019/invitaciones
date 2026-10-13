/**
 * Invitación personal (/i/:token), tal como la entrega la API
 * (GET /api/public/invitations/{token}). Cada invitación es para N personas: un lugar
 * por persona. Los nombres ya enviados quedan fijos; los lugares vacíos se pueden llenar
 * hasta la fecha límite.
 */
import type { EventConfig } from './event'

export interface InvitationGuest {
  /** Lugar de 1 a N. */
  slot: number
  full_name: string
  attending: boolean
  /** ISO con offset. */
  responded_at: string
}

export interface Invitation {
  /** Nombre que el dueño le puso al generarla ("Familia Pérez"); null si no tiene. */
  label: string | null
  /** Para cuántas personas es. */
  passes: number
  guests: InvitationGuest[]
  /** Lugares vacíos. */
  remaining: number
  /** Todavía se puede confirmar (antes de la fecha límite). */
  open: boolean
  closed_message: string | null
  deadline: string | null
  /** La dedicatoria que ya dejó este enlace (una por invitación), o null. */
  dedication: InvitationDedication | null
}

export interface InvitationDedication {
  name: string
  message: string
  /** ISO con offset. */
  sent_at: string
}

export interface InvitationResponse {
  event: EventConfig
  invitation: Invitation
}

/** Solo los nombres nuevos; los ya registrados no se vuelven a mandar. */
export interface RsvpPayload {
  attending: boolean
  guests: { full_name: string }[]
}

/** Dedicatoria: una por enlace; ya enviada, no se cambia. */
export interface DedicationPayload {
  name: string
  message: string
}
