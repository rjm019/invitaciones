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
  setProperty,
  unionBox,
  type AlignMode,
  type ElementValues,
  type NewElement,
  type StackOp,
} from '@/services/arrangeService'
import { setSectionCanvas } from '@/services/designService'
import type { ArrangeChange, ArrangeFrame, ArrangeMeasure } from '@/services/previewProtocol'
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

  const canvas = computed<DesignValues[]>(
    () => deps.design.value.sections.find((s) => s.id === section.value)?.canvas ?? [],
  )
  const layers = computed(() => listLayers(canvas.value))
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

  function chooseSection(id: string | null): void {
    if (id === section.value) return
    section.value = id
    refs.value = []
    measures.value = {}
    frame.value = null
    deps.sendSelect(id, [])
  }

  /** Lo que la vista previa informa (clic, recuadro o medidas nuevas). */
  function onSelect(
    id: string | null,
    next: string[],
    nextMeasures: Record<string, ArrangeMeasure>,
    nextFrame: ArrangeFrame | null,
  ): void {
    section.value = id
    refs.value = next
    measures.value = nextMeasures
    frame.value = nextFrame
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

  function remove(): void {
    const free = refs.value.filter(isFreeRef)
    if (!free.length) {
      if (refs.value.length)
        deps.notify('Los textos e imágenes de la sección se ocultan o vuelven a su lugar; no se borran.')
      return
    }
    commit(removeElements(canvas.value, free))
    choose(refs.value.filter((r) => !isFreeRef(r)))
  }

  function duplicate(): void {
    const result = duplicateElements(canvas.value, refs.value)
    if (!result.refs.length) {
      deps.notify('Solo se duplican los elementos que agregaste.')
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
    commit(restack(canvas.value, refs.value, op))
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
      // Ancho y alto cambian el tamaño sin deformar: el existente cambia de escala; el agregado, de ancho.
      const ratio = field === 'width' ? ((value / 100) * cw) / m.w : ((value / 100) * cw) / m.h
      if (ratio <= 0) return
      if (now.free) change.width = (now.width ?? (m.w / cw) * 100) * ratio
      else change.scale = now.scale * ratio
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
    layers,
    current,
    values,
    chooseSection,
    choose,
    onSelect,
    onChange,
    onKey,
    add,
    remove,
    duplicate,
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
