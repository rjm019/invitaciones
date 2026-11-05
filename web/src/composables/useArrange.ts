import { computed, ref, type ComputedRef } from 'vue'
import type { MediaRequest } from '@/composables/useEditorContext'
import {
  addElement,
  alignDeltas,
  applyChanges,
  distributeDeltas,
  duplicateElements,
  elementValues,
  isFreeRef,
  listLayers,
  moveBy,
  removeElements,
  resetPlace,
  restack,
  setColumns,
  setRemoved,
  setProperty,
  unionBox,
  type AlignMode,
  type ElementValues,
  type NewElement,
  type StackOp,
} from '@/services/arrangeService'
import { setSectionCanvas } from '@/services/designService'
import type {
  ArrangeBlock,
  ArrangeChange,
  ArrangeCopy,
  ArrangeFrame,
  ArrangeMeasure,
} from '@/services/previewProtocol'
import type { Design, DesignValues } from '@/types/design'

export interface ArrangeDeps {
  design: ComputedRef<Design>
  update: (next: Design, key?: string | null) => void
  /** Se edita la vista de computadora: los valores van en las columnas e_*. */
  desktop: ComputedRef<boolean>
  /** Le dice a la vista previa qué está elegido. */
  sendSelect: (section: string | null, refs: string[]) => void
  pickMedia: (request: MediaRequest) => Promise<string | null>
  notify: (message: string) => void
  undo: () => void
  redo: () => void
  save: () => void
}

export type NumberField = 'x' | 'y' | 'width' | 'height' | 'rotation'
export type RawField =
  | 'texto'
  | 'color'
  | 'letra'
  | 'tamano'
  | 'alineacion'
  | 'borde'
  | 'radio'
  | 'forma'

/**
 * «Acomodar» del lado del editor: qué está elegido en la vista previa, sus medidas y todo lo
 * que el panel hace con ello. Cada acción arma el lienzo nuevo de la sección (arrangeService)
 * y lo manda de una vez al historial y al autoguardado.
 */
export function useArrange(deps: ArrangeDeps) {
  const section = ref<string | null>(null)
  const refs = ref<string[]>([])
  const measures = ref<Record<string, ArrangeMeasure>>({})
  const frame = ref<ArrangeFrame | null>(null)
  /** Los textos e imágenes de la sección, toquen o no (para la lista de capas y el orden). */
  const blocks = ref<ArrangeBlock[]>([])
  /** Lo que la vista previa leyó de lo elegido para duplicarlo. */
  const copies = ref<Record<string, ArrangeCopy>>({})
  /** El candado «Mantener proporción» de Ancho y Alto. */
  const proportional = ref(true)

  const canvas = computed<DesignValues[]>(
    () => deps.design.value.sections.find((s) => s.id === section.value)?.canvas ?? [],
  )
  const layers = computed(() => listLayers(canvas.value, blocks.value))
  const values = (ref: string): ElementValues | null =>
    elementValues(canvas.value, ref, deps.desktop.value)
  /** El primer elemento elegido: el panel muestra sus valores. */
  const current = computed(() => (refs.value[0] ? values(refs.value[0]) : null))
  const movable = computed(() => refs.value.filter((r) => !values(r)?.locked))

  function commit(next: DesignValues[], key: string | null = null): void {
    if (!section.value) return
    deps.update(setSectionCanvas(deps.design.value, section.value, next), key)
  }

  function choose(next: string[]): void {
    refs.value = next
    deps.sendSelect(section.value, next)
  }

  /**
   * La vista previa ya eligió este elemento (arrastre desde «Elegir»): se anota sin mandárselo
   * de vuelta, que borraría su selección.
   */
  function adopt(id: string, ref: string): void {
    section.value = id
    refs.value = [ref]
    measures.value = {}
    frame.value = null
    blocks.value = []
    copies.value = {}
  }

  function chooseSection(id: string | null): void {
    if (id === section.value) return
    section.value = id
    refs.value = []
    measures.value = {}
    frame.value = null
    blocks.value = []
    copies.value = {}
    deps.sendSelect(id, [])
  }

  /** Lo que la vista previa informa (clic, recuadro o medidas nuevas). */
  function onSelect(
    id: string | null,
    next: string[],
    nextMeasures: Record<string, ArrangeMeasure>,
    nextFrame: ArrangeFrame | null,
    nextBlocks: ArrangeBlock[] = [],
    nextCopies: Record<string, ArrangeCopy> = {},
  ): void {
    section.value = id
    refs.value = next
    measures.value = nextMeasures
    frame.value = nextFrame
    blocks.value = nextBlocks
    copies.value = nextCopies
  }

  /** Se soltó un arrastre (un paso de deshacer) o se movió con las flechas (se juntan). */
  function onChange(id: string, changes: ArrangeChange[], nudge: boolean): void {
    const target = deps.design.value.sections.find((s) => s.id === id)
    if (!target) return
    const next = applyChanges(target.canvas ?? [], changes, deps.desktop.value)
    deps.update(
      setSectionCanvas(deps.design.value, id, next),
      nudge ? `canvas:${id}:nudge` : null,
    )
  }

  async function add(element: 'text' | 'image' | 'line' | 'rectangle' | 'circle'): Promise<void> {
    if (!section.value) {
      deps.notify('Elige primero una sección.')
      return
    }
    let item: NewElement
    if (element === 'image') {
      const file = await deps.pickMedia({ kind: 'image', purpose: 'foto' })
      if (!file) return
      item = { kind: 'image', file }
    } else if (element === 'text') {
      item = { kind: 'text' }
    } else {
      item = { kind: 'shape', shape: element }
    }
    const result = addElement(canvas.value, item)
    if (!result) {
      deps.notify('La sección ya tiene el máximo de elementos.')
      return
    }
    commit(result.canvas)
    choose([result.ref])
  }

  /** Supr: lo agregado se borra; un texto o imagen de la sección se quita de la vista (libera su lugar). */
  function remove(): void {
    if (!refs.value.length) return
    let next = removeElements(canvas.value, refs.value)
    for (const ref of refs.value) next = setRemoved(next, ref, true, deps.desktop.value)
    commit(next)
    choose([])
  }

  /** Devuelve a la vista un bloque de la sección que se había quitado. */
  function restore(ref: string): void {
    commit(setRemoved(canvas.value, ref, false, deps.desktop.value))
  }

  function duplicate(): void {
    const result = duplicateElements(canvas.value, refs.value, {
      copies: copies.value,
      measures: measures.value,
      content: frame.value?.content ?? 0,
      desktop: deps.desktop.value,
    })
    if (!result.refs.length) {
      deps.notify(
        canvas.value.length >= 60
          ? 'La sección ya tiene el máximo de elementos.'
          : 'No se pudo duplicar lo elegido; toca de nuevo el elemento e inténtalo otra vez.',
      )
      return
    }
    commit(result.canvas)
    choose(result.refs)
  }

  function reset(): void {
    let next = canvas.value
    for (const ref of refs.value) next = resetPlace(next, ref, deps.desktop.value)
    commit(next)
  }

  function toggle(property: 'hidden' | 'flipH' | 'flipV' | 'locked'): void {
    const on = !refs.value.every((r) => values(r)?.[property])
    let next = canvas.value
    for (const ref of refs.value) next = setProperty(next, ref, property, on, deps.desktop.value)
    commit(next)
  }

  function setOpacity(percent: number): void {
    let next = canvas.value
    for (const ref of refs.value) next = setProperty(next, ref, 'opacity', percent, deps.desktop.value)
    commit(next, `canvas:${section.value}:opacity`)
  }

  function stack(op: StackOp): void {
    commit(restack(canvas.value, refs.value, op, blocks.value))
  }

  /** X, Y, ancho, alto o giro escritos a mano en el panel. */
  function setNumber(field: NumberField, value: number): void {
    const ref = refs.value[0]
    const now = ref ? values(ref) : null
    if (!ref || !now || now.locked || !Number.isFinite(value) || !frame.value) return
    const m = measures.value[ref]
    const cw = frame.value.content
    const change: ArrangeChange['values'] = {}
    if (field === 'x' || field === 'y' || field === 'rotation') change[field] = value
    else if (m && m.w > 0 && m.h > 0 && cw > 0) {
      // Lo que mide ahora (px de la vista) contra lo que se pide (% del ancho de la sección).
      const ratio = (((value / 100) * cw) / (field === 'width' ? m.w : m.h))
      if (!(ratio > 0)) return
      const keep = proportional.value
      if (now.free) {
        const s = now.scale > 0 ? now.scale : 1
        const baseW = now.width ?? (m.w / cw) * 100 / s
        const baseH = now.height ?? (m.h / cw) * 100 / s
        const solid = now.kind === 'image' || (now.kind === 'shape' && !now.line)
        if (now.kind === 'text') {
          if (field === 'height') return
          change.width = baseW * ratio
          // Con el candado y en celular, el texto crece con su letra, como al estirar una esquina.
          if (keep && !deps.desktop.value) change.size = (now.size ?? 5) * ratio
        } else if (keep) {
          change.width = baseW * ratio
          if (now.height !== null) change.height = baseH * ratio
        } else if (field === 'width') {
          change.width = baseW * ratio
          if (solid && now.height === null) change.height = baseH
        } else if (solid) {
          change.height = baseH * ratio
          if (now.width === null) change.width = baseW
        } else return
      } else if (keep) {
        change.scale = now.scale * ratio
        change.scale_y = (now.scaleY ?? now.scale) * ratio
      } else if (field === 'width') {
        change.scale = now.scale * ratio
        change.scale_y = now.scaleY ?? now.scale
      } else {
        change.scale_y = (now.scaleY ?? now.scale) * ratio
      }
    } else return
    commit(
      applyChanges(canvas.value, [{ ref, values: change }], deps.desktop.value),
      `canvas:${section.value}:${ref}:${field}`,
    )
  }

  /** Texto, letra, color, tamaño, alineación, borde y radio de un elemento agregado. */
  function setRaw(field: RawField, value: string): void {
    const ref = refs.value[0]
    if (!ref || !isFreeRef(ref)) return
    commit(setColumns(canvas.value, ref, { [field]: value }), `canvas:${section.value}:${ref}:${field}`)
  }

  function align(mode: AlignMode, to: 'section' | 'selection'): void {
    if (!frame.value) return
    const ids = movable.value.filter((r) => measures.value[r])
    if (!ids.length) return
    const area =
      to === 'selection' && ids.length > 1
        ? unionBox(ids, measures.value)!
        : frame.value.section
    commit(moveBy(canvas.value, alignDeltas(ids, measures.value, mode, area), frame.value.content, deps.desktop.value))
  }

  function distribute(axis: 'h' | 'v'): void {
    if (!frame.value) return
    const ids = movable.value.filter((r) => measures.value[r])
    const deltas = distributeDeltas(ids, measures.value, axis)
    if (!Object.keys(deltas).length) return
    commit(moveBy(canvas.value, deltas, frame.value.content, deps.desktop.value))
  }

  /** Teclas que la vista previa reenvía: ⌘Z, ⇧⌘Z, ⌘Y, ⌘D, ⌘S y Supr. */
  function onKey(key: string, meta: boolean, shift: boolean): void {
    if (meta && key === 'z') (shift ? deps.redo : deps.undo)()
    else if (meta && key === 'y') deps.redo()
    else if (meta && key === 's') deps.save()
    else if (meta && key === 'd') duplicate()
    else if (!meta && (key === 'Delete' || key === 'Backspace')) remove()
  }

  return {
    desktop: deps.desktop,
    section,
    refs,
    measures,
    frame,
    canvas,
    blocks,
    copies,
    proportional,
    layers,
    current,
    values,
    chooseSection,
    adopt,
    choose,
    onSelect,
    onChange,
    onKey,
    add,
    remove,
    duplicate,
    restore,
    reset,
    toggle,
    setOpacity,
    stack,
    setNumber,
    setRaw,
    align,
    distribute,
  }
}

export type ArrangeApi = ReturnType<typeof useArrange>
