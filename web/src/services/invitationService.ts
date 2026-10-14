import type {
  DedicationPayload,
  Invitation,
  InvitationResponse,
  RsvpPayload,
} from '@/types/invitation'
import { takeBoot } from './bootService'
import { http } from './http'

const path = (token: string) => `/public/invitations/${encodeURIComponent(token)}`

/** Evento + invitación de la familia dueña del token (o ya incluidos en la página). */
export async function getInvitation(token: string): Promise<InvitationResponse> {
  const booted = takeBoot<InvitationResponse>('invitation', token)
  if (booted) return booted
  const { data } = await http.get<InvitationResponse>(path(token))
  return data
}

/** Confirma o declina. Responder otra vez reemplaza la respuesta anterior (el servidor valida pases y fecha). */
export async function sendRsvp(token: string, payload: RsvpPayload): Promise<Invitation> {
  const { data } = await http.post<{ invitation: Invitation }>(`${path(token)}/rsvp`, payload)
  return data.invitation
}

/** Deja la dedicatoria del enlace (una por invitación: la segunda vez la API responde 409). */
export async function sendDedication(
  token: string,
  payload: DedicationPayload,
): Promise<Invitation> {
  const { data } = await http.post<{ invitation: Invitation }>(`${path(token)}/dedication`, payload)
  return data.invitation
}
