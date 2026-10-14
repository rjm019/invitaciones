import {
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import {
  addItem,
  moveItem,
  removeItem,
  setBlockField,
  setItemField,
  setSectionField,
  setSectionFields,
  type DesignBlock,
} from '@/services/designService'
import type { AssetResolver } from '@/services/assetService'
import type { ThemeManifest } from '@/themes/types'
import type { Catalog, Design, DesignIssue, DesignValues } from '@/types/design'
import type { EventConfig } from '@/types/event'

export type Selection =
  | { kind: 'style' }
  | { kind: 'general' }
  | {
      kind: 'section'
      id: string
      tab: 'content' | 'design'
      /** El texto que se tocó en la vista previa (abre su "Aa"). */
      block?: string | null
      /** Cuándo se tocó: cada toque vuelve a abrir el inspector en ese texto. */
      at?: number
    }

export interface MediaRequest {
  kind: 'image' | 'audio'
  /** Para el ancho con que se guarda una imagen nueva. */
  purpose?: 'fondo' | 'foto' | 'adorno'
  /** Archivo elegido ahora (para marcarlo). */
  current?: string | null
  /** Ofrecer "recortar aire transparente" (adornos de Canva). */
  trim?: boolean
}

/**
 * Lo que comparten los paneles del editor: la invitación, el catálogo, la config de la
 * vista previa, lo que hay que revisar y cómo cambiar cada parte. Cada cambio pasa por
 * `update` (deshacer + autoguardado); `key` junta lo que se escribe seguido en un campo.
 */
export interface EditorContext {
  slug: string
  catalog: ComputedRef<Catalog>
  design: ComputedRef<Design>
  config: ShallowRef<EventConfig | null>
  issues: Ref<DesignIssue[]>
  theme: ShallowRef<ThemeManifest | null>
  /** Colores y letras del tema ya calculados en la vista previa (lo que se ve sin cambiar nada). */
  themeColors: Ref<Record<string, string>>
  themeFonts: Ref<Record<string, string>>
  resolveAsset: ComputedRef<AssetResolver>
  update: (next: Design, key?: string | null) => void
  select: (selection: Selection) => void
  pickMedia: (request: MediaRequest) => Promise<string | null>
}

const KEY: InjectionKey<EditorContext> = Symbol('editor')

export function provideEditor(context: EditorContext): void {
  provide(KEY, context)
}

export function useEditor(): EditorContext & ReturnType<typeof helpers> {
  const context = inject(KEY)
  if (!context) throw new Error('useEditor() se usó fuera del editor del gestor')
  return { ...context, ...helpers(context) }
}

/** Atajos para cambiar una parte de la invitación. Un valor vacío quita el campo. */
function helpers(ctx: EditorContext) {
  return {
    setBlock(block: DesignBlock, key: string, value: string) {
      ctx.update(setBlockField(ctx.design.value, block, key, value), `${block}:${key}`)
    },
    setField(id: string, key: string, value: string) {
      ctx.update(setSectionField(ctx.design.value, id, key, value), `${id}:${key}`)
    },
    setFields(id: string, changes: DesignValues, key: string | null = null) {
      ctx.update(setSectionFields(ctx.design.value, id, changes), key)
    },
    setItem(id: string, index: number, key: string, value: string) {
      ctx.update(setItemField(ctx.design.value, id, index, key, value), `${id}:${index}:${key}`)
    },
    addItem(id: string, item: DesignValues = {}) {
      ctx.update(addItem(ctx.design.value, id, item))
    },
    removeItem(id: string, index: number) {
      ctx.update(removeItem(ctx.design.value, id, index))
    },
    moveItem(id: string, from: number, to: number) {
      ctx.update(moveItem(ctx.design.value, id, from, to))
    },
  }
}
