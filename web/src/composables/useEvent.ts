import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { AssetResolver } from '@/services/assetService'
import type { EventConfig } from '@/types/event'

export interface EventContext {
  event: ComputedRef<EventConfig>
  resolveAsset: ComputedRef<AssetResolver>
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
