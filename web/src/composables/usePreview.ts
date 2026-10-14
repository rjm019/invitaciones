import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/**
 * La invitación dentro del editor del gestor (iframe /gestor/vista-previa). Sin esto,
 * todo se comporta como la invitación de verdad.
 */
export interface PreviewOptions {
  /** true: el sobre ya está abierto (para revisar todo); false: "Ver como invitado". */
  envelopeOpen: boolean
  /** Sin sonido: abrir el sobre no reproduce la canción. */
  muted: boolean
}

const KEY: InjectionKey<ComputedRef<PreviewOptions | null>> = Symbol('preview')

export function providePreview(options: () => PreviewOptions | null | undefined): void {
  provide(
    KEY,
    computed(() => options() ?? null),
  )
}

/** Las opciones de la vista previa, o null en la invitación de verdad. */
export function usePreview(): ComputedRef<PreviewOptions | null> {
  return inject(
    KEY,
    computed(() => null),
  )
}
