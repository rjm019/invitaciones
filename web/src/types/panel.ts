/** Panel del dueño del evento (GET /api/admin/events/{slug}). */

/**
 * Cómo se ve el panel: el de la invitación. Sin sesión (la entrada) solo trae título,
 * tema, colores y fuentes; con sesión, también lo que lleva la imagen para WhatsApp.
 */
export interface PanelBrand {
  /** "XV de Nat" */
  title: string
  theme: string
  palette: Record<string, string>
  /** Rol → familia de Google Fonts (pestaña tipografia). */
  fonts: Record<string, string>
  subtitle?: string
  celebrant?: { full_name?: string; short_name?: string }
  starts_at?: string | null
  timezone?: string
  venue?: { name: string; city: string }
  /** Archivos de media del evento → URL. */
  assets?: Record<string, string>
  /** La imagen para WhatsApp: su fondo (archivo de media) y su frase, del layout. */
  card?: { background: string | null; phrase: string | null; text: string | null }
}

export interface PanelSession {
  token: string
  expires_at: string
}

export interface PanelGuest {
  slot: number
  full_name: string
  attending: boolean
  /** Mesa asignada en el panel (null = sin mesa). */
  table: number | null
  responded_at: string | null
}

/** Asignar (o quitar con null) la mesa de una persona. */
export interface TableAssignment {
  invitation: string
  slot: number
  table: number | null
}

export interface PanelInvitation {
  id: string
  label: string | null
  passes: number
  url: string
  /** Texto que acompaña a la imagen ("¡Hola, Familia Pérez! … {enlace}"). */
  message: string
  whatsapp_url: string
  guests: PanelGuest[]
  opens: number
  created_at: string | null
  /** WhatsApp para los recordatorios (solo dígitos con lada de país). null con la función apagada. */
  phone?: string | null
  /** Estado de sus recordatorios; null con la función apagada. */
  reminder?: PanelInvitationReminder | null
}

export type PanelReminderStatus =
  | 'responded'
  | 'no_phone'
  | 'opted_out'
  | 'no_whatsapp'
  | 'failed'
  | 'read'
  | 'delivered'
  | 'sent'
  | 'waiting'

export interface PanelInvitationReminder {
  status: PanelReminderStatus
  sent: number
  last_sent_at: string | null
  /** 'YYYY-MM-DD' */
  next_at: string | null
}

/** Recordatorios por WhatsApp del evento (null en el overview = función apagada). */
export interface PanelReminders {
  every_days: number
  options: number[]
  consent_at: string | null
  cap: number
  used: number
  per_link_max: number
  with_phone: number
  pending_with_phone: number
  pending_without_phone: number
  next_run: string | null
  active: boolean
  stopped_reason: null | 'off' | 'no_consent' | 'deadline' | 'cap'
}

export interface PanelRsvp {
  deadline: string | null
  open: boolean
  changes_used: number
  changes_left: number
  max_changes: number
}

export interface PanelSummary {
  invitations: number
  seats: number
  attending: number
  declined: number
  empty: number
}

export interface PanelOverview {
  /** Huella de los archivos del evento: si cambia, hay algo nuevo. */
  version: string
  brand: PanelBrand
  event: {
    slug: string
    title: string
    celebrant: { full_name?: string; short_name?: string }
    starts_at: string | null
    timezone: string
    published: boolean
  }
  rsvp: PanelRsvp
  summary: PanelSummary
  invitations: PanelInvitation[]
  /** La más reciente primero. */
  dedications: PanelDedication[]
  /** Ranking de la trivia; null si el evento no tiene. */
  trivia?: PanelTrivia | null
  max_passes: number
  reminders?: PanelReminders | null
}

/** Dedicatoria que dejó un enlace (una por invitación). */
export interface PanelDedication {
  invitation: string
  /** Nombre de la invitación ("Familia Pérez"), o null. */
  label: string | null
  name: string
  message: string
  sent_at: string | null
}

/** Trivia del evento en el panel: ranking por aciertos y, en empate, por menos segundos. */
export interface PanelTrivia {
  total: number
  closes_at: string | null
  ranking: PanelTriviaEntry[]
}

export interface PanelTriviaEntry {
  rank: number
  invitation: string
  label: string | null
  name: string
  correct: number
  total: number
  seconds: number
  sent_at: string | null
}
