/** Panel del dueño del evento (GET /api/admin/events/{slug}). */

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
  whatsapp_url: string
  guests: PanelGuest[]
  opens: number
  created_at: string | null
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
  max_passes: number
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
