import { computed, type ComputedRef } from 'vue'
import { useOptionalEvent } from '@/composables/useEvent'
import { monogramInitials } from '@/services/monogramService'

/**
 * Las iniciales del monograma de la invitación (de `celebrant.monogram` o derivadas del
 * nombre). Si ya vienen en `explicit`, se usan tal cual. Fuera de una invitación no hay
 * evento: sin `explicit`, queda vacío.
 */
export function useMonogram(explicit?: () => string | undefined): ComputedRef<string[]> {
  const context = useOptionalEvent()
  return computed(() => {
    const own = explicit?.()
    if (own !== undefined && own.trim() !== '') return monogramInitials(own)
    const celebrant = context?.event.value.celebrant
    return celebrant
      ? monogramInitials(
          celebrant.monogram,
          celebrant.short_name,
          celebrant.full_name,
          celebrant.partner_name,
        )
      : []
  })
}
