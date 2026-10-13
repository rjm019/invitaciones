import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import { sendDedication, sendRsvp } from '@/services/invitationService'
import type { DedicationPayload, Invitation, RsvpPayload } from '@/types/invitation'

export interface InvitationContext {
  token: string
  /** null mientras carga. */
  invitation: Ref<Invitation | null>
  sending: Ref<boolean>
  /** Envía la respuesta; si la API la rechaza, lanza ApiError (el formulario la muestra). */
  submit: (payload: RsvpPayload) => Promise<Invitation>
  /** Deja la dedicatoria del enlace; si la API la rechaza, lanza ApiError. */
  dedicate: (payload: DedicationPayload) => Promise<Invitation>
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
