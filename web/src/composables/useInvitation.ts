import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import {
  sendAlbumPhoto,
  sendDedication,
  sendRsvp,
  sendTrivia,
  startTrivia,
} from '@/services/invitationService'
import { previewRespond } from '@/services/previewService'
import type {
  DedicationPayload,
  Invitation,
  InvitationAlbum,
  RsvpPayload,
  TriviaPayload,
  TriviaResult,
} from '@/types/invitation'

export interface InvitationContext {
  token: string
  /** null mientras carga. */
  invitation: Ref<Invitation | null>
  sending: Ref<boolean>
  /** Envía la respuesta; si la API la rechaza, lanza ApiError (el formulario la muestra). */
  submit: (payload: RsvpPayload) => Promise<Invitation>
  /** Deja la dedicatoria del enlace; si la API la rechaza, lanza ApiError. */
  dedicate: (payload: DedicationPayload) => Promise<Invitation>
  /** Abre la trivia (el servidor anota el inicio); si la API la rechaza, lanza ApiError. */
  startTrivia: () => Promise<void>
  /** Envía las respuestas y devuelve el resultado; si la API las rechaza, lanza ApiError. */
  answerTrivia: (payload: TriviaPayload) => Promise<TriviaResult>
  /** Sube una foto del álbum (ya reducida); devuelve el estado nuevo; si la API la rechaza, lanza ApiError. */
  uploadAlbumPhoto: (
    photo: Blob,
    name: string,
    onProgress?: (fraction: number) => void,
  ) => Promise<InvitationAlbum>
}

const KEY: InjectionKey<InvitationContext> = Symbol('invitation')

export function createInvitationContext(token: string): InvitationContext {
  const invitation = ref<Invitation | null>(null)
  const sending = ref(false)

  async function send(request: Promise<Invitation>): Promise<Invitation> {
    sending.value = true
    try {
      const updated = await request
      invitation.value = updated
      return updated
    } finally {
      sending.value = false
    }
  }

  return {
    token,
    invitation,
    sending,
    submit: (payload) => send(sendRsvp(token, payload)),
    dedicate: (payload) => send(sendDedication(token, payload)),
    startTrivia: () => startTrivia(token),
    async uploadAlbumPhoto(photo, name, onProgress) {
      const album = await sendAlbumPhoto(token, photo, name, onProgress)
      if (invitation.value) invitation.value = { ...invitation.value, album }
      return album
    },
    async answerTrivia(payload) {
      sending.value = true
      try {
        const { result, invitation: updated } = await sendTrivia(token, payload)
        invitation.value = updated
        return result
      } finally {
        sending.value = false
      }
    },
  }
}

/** La página /i/:token la provee; las secciones la leen con useInvitation(). */
export function provideInvitation(token: string): InvitationContext {
  const context = createInvitationContext(token)
  provide(KEY, context)
  return context
}

/** Invitación personal, o null en la invitación general (/e/:slug), que no tiene pases. */
export function useInvitation(): InvitationContext | null {
  return inject(KEY, null)
}

/** Provee un contexto ya armado (la invitación de ejemplo de la vista previa del gestor). */
export function provideInvitationContext(context: InvitationContext): void {
  provide(KEY, context)
}

/**
 * Invitación de ejemplo para la vista previa: confirmar y dejar dedicatoria se ven como de
 * verdad, pero no se manda nada al servidor.
 */
export function createPreviewInvitationContext(start: Invitation): InvitationContext {
  const invitation = ref<Invitation | null>(start)
  const sending = ref(false)
  return {
    token: 'vista-previa',
    invitation,
    sending,
    async submit(payload) {
      invitation.value = previewRespond(invitation.value ?? start, payload, new Date())
      return invitation.value
    },
    async dedicate(payload) {
      const current = invitation.value ?? start
      invitation.value = {
        ...current,
        dedication: { ...payload, sent_at: new Date().toISOString() },
      }
      return invitation.value
    },
    async startTrivia() {},
    async uploadAlbumPhoto() {
      // La vista previa no sube nada: la sección simula la subida en el navegador.
      return (
        invitation.value?.album ?? {
          state: 'after',
          can_upload: true,
          used: 0,
          remaining: 2,
          max: 2,
          closes_at: null,
          last_day: null,
        }
      )
    },
    async answerTrivia(payload) {
      // Sin respuestas correctas en el navegador: la vista previa solo muestra cómo se ve el resultado.
      const total = payload.answers.length
      const result = { name: payload.name, correct: total, total, seconds: 0 }
      invitation.value = {
        ...(invitation.value ?? start),
        trivia: { open: false, closed_message: null, result },
      }
      return result
    },
  }
}
