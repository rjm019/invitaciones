import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { AssetResolver } from '@/services/assetService'
import type { EventConfig, ResolvedSection } from '@/types/event'

export interface EventContext {
  event: ComputedRef<EventConfig>
  resolveAsset: ComputedRef<AssetResolver>
  /**
   * Las secciones ya resueltas (con el diseño y los adornos del tema), para el diseño que
   * necesita saber de otra sección (la bendición editorial no repite a los papás si la
   * portada ya los trae). Fuera de la invitación puede faltar.
   */
  sections?: ComputedRef<ResolvedSection[]>
}

const KEY: InjectionKey<EventContext> = Symbol('event')

export function provideEvent(context: EventContext): void {
  provide(KEY, context)
}

/** Evento y resolvedor de archivos para cualquier sección dentro de InvitationRenderer. */
export function useEvent(): EventContext {
  const context = inject(KEY)
  if (!context) throw new Error('useEvent() se usó fuera de InvitationRenderer')
  return context
}

/** Lo mismo que useEvent, pero devuelve null fuera de InvitationRenderer (piezas reutilizables). */
export function useOptionalEvent(): EventContext | null {
  return inject(KEY, null)
}
