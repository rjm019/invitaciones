import type {
  DedicationPayload,
  Invitation,
  InvitationAlbum,
  InvitationResponse,
  RsvpPayload,
  TriviaPayload,
  TriviaResult,
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

/** Abre la trivia: el servidor anota el inicio (los segundos se miden allá). */
export async function startTrivia(token: string): Promise<void> {
  await http.post(`${path(token)}/trivia/start`)
}

/** Envía las respuestas; el servidor califica (una vez por enlace: la segunda da 409). */
export async function sendTrivia(
  token: string,
  payload: TriviaPayload,
): Promise<{ result: TriviaResult; invitation: Invitation }> {
  const { data } = await http.post<{ result: TriviaResult; invitation: Invitation }>(
    `${path(token)}/trivia`,
    payload,
  )
  return data
}

/**
 * Sube UNA foto del álbum (ya reducida en el celular). El servidor revisa el límite de 2 por
 * invitación, el día del evento y el tope de espacio; con 410 el evento ya terminó.
 */
export async function sendAlbumPhoto(
  token: string,
  photo: Blob,
  name: string,
  onProgress?: (fraction: number) => void,
): Promise<InvitationAlbum> {
  const form = new FormData()
  form.append('photo', photo, name)
  const { data } = await http.post<{ album: InvitationAlbum }>(`${path(token)}/album`, form, {
    timeout: 90_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(e.loaded / e.total)
    },
  })
  return data.album
}
