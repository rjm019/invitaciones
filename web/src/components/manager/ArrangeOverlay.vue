<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { canvasPaused, findCanvasTarget, listCanvasTargets } from '@/composables/useSectionCanvas'
import {
  measureFrom,
  normalizeAngle,
  valuesFromBox,
  type GestureStart,
  type ProxyBox,
} from '@/services/arrangeService'
import { DESKTOP_QUERY, existingStyle, resolveCanvas } from '@/services/canvasService'
import type {
  ArrangeChange,
  ArrangeFrame,
  ArrangeMeasure,
  ArrangeValues,
} from '@/services/previewProtocol'
import type { CanvasElement, SectionConfig } from '@/types/event'

/**
 * «Acomodar», dentro de la vista previa: elegir (clic, recuadro, Shift), mover, cambiar de
 * tamaño y girar los textos, imágenes y elementos agregados de una sección. Un velo
 * transparente (`shield`) cubre la invitación para que ningún toque llegue a sus botones ni
 * efectos. Lo elegido se representa con una caja de ayuda (`proxy`) en coordenadas de la
 * página: Moveable la mueve y de su geometría salen los valores. Mientras se arrastra todo
 * es local (se pinta el elemento al instante); al soltar se manda UN solo cambio al editor.
 * Moveable y Selecto se cargan con import() solo al entrar a este modo.
 */
const props = defineProps<{ active: boolean; sections: SectionConfig[] }>()
const emit = defineEmits<{
  select: [
    section: string | null,
    refs: string[],
    measures: Record<string, ArrangeMeasure>,
    frame: ArrangeFrame | null,
  ]
  change: [section: string, changes: ArrangeChange[], nudge: boolean]
  key: [key: string, meta: boolean, shift: boolean]
}>()

interface Item {
  ref: string
  el: HTMLElement
  proxy: HTMLElement
  free: boolean
  text: boolean
  locked: boolean
  start?: GestureStart
  /** `display` de antes de volverlo inline-block para que le haga caso el `translate`. */
  display?: string | null
}

interface Hit {
  section: HTMLElement
  ref: string
  el: HTMLElement
}

// Lo mínimo que se usa de Moveable y Selecto (se cargan después).
interface EventHost {
  on: (name: string, callback: (e: never) => void) => unknown
  destroy: () => void
}
interface MoveableLike extends EventHost {
  target: HTMLElement[]
  elementGuidelines: HTMLElement[]
  verticalGuidelines: number[]
  horizontalGuidelines: number[]
  keepRatio: boolean
  renderDirections: string[]
  throttleRotate: number
  zoom: number
  updateRect: () => void
  updateTarget: () => void
  dragStart: (e: MouseEvent | TouchEvent) => unknown
}
interface SelectoLike extends EventHost {
  setSelectedTargets: (targets: HTMLElement[]) => void
}
interface GestureEvent {
  target?: HTMLElement
  transform?: string
  width?: number
  height?: number
  drag?: { transform: string }
  events?: GestureEvent[]
}

const layer = ref<HTMLElement | null>(null)
const shield = ref<HTMLElement | null>(null)
const hover = ref<{ left: number; top: number; width: number; height: number } | null>(null)

let moveable: MoveableLike | null = null
let selecto: SelectoLike | null = null
let loading = false
let section: string | null = null
let refs: string[] = []
const items = new Map<string, Item>()
let gesturing = false
let resumeTimer: ReturnType<typeof setTimeout> | undefined
let syncFrame = 0
let lastPosted = ''
const pendingNudge = new Map<string, { x: number; y: number }>()
/** El botón del ratón sigue abajo (para no arrancar un arrastre después de un clic). */
let pressed = false
const onPress = (e: Event) => (pressed = e.type === 'pointerdown' || e.type === 'mousedown')

const isDesktop = () => typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches
const round2 = (n: number) => Math.round(n * 100) / 100

/* ---- la página ---- */

const sectionEl = (key: string | null): HTMLElement | null =>
  key ? document.querySelector<HTMLElement>(`[data-section-key="${key}"]`) : null

/** Esquina y ancho de `.section__content` en coordenadas de la página (la unidad del lienzo). */
function contentFrame(sec: HTMLElement): { left: number; top: number; width: number } | null {
  const content = sec.querySelector<HTMLElement>('.section__content')
  if (!content) return null
  const r = content.getBoundingClientRect()
  return { left: r.left + scrollX + content.clientLeft, top: r.top + scrollY + content.clientTop, width: r.width }
}

const canvasOf = (key: string | null): CanvasElement[] =>
  props.sections.find((s) => s.key === key)?.canvas ?? []

function resolveRef(sec: HTMLElement, ref: string): HTMLElement | null {
  if (ref.startsWith('lienzo-')) return sec.querySelector<HTMLElement>(`[data-canvas-id="${ref}"]`)
  return findCanvasTarget(sec, ref)
}

function elementOf(key: string | null, ref: string): CanvasElement | undefined {
  return canvasOf(key).find((e) => (ref.startsWith('lienzo-') ? e.id === ref : e.target === ref))
}

/** Dónde está una caja (en la página): centro y tamaño sin girar. */
function boxOf(el: HTMLElement, rotation: number, scale: number): ProxyBox {
  const r = el.getBoundingClientRect()
  let width = r.width
  let height = r.height
  if (Math.abs(normalizeAngle(rotation)) > 0.01) {
    width = el.offsetWidth * Math.abs(scale)
    height = el.offsetHeight * Math.abs(scale)
  }
  return {
    cx: r.left + r.width / 2 + scrollX,
    cy: r.top + r.height / 2 + scrollY,
    width,
    height,
    rotation,
  }
}

/* ---- cajas de ayuda ---- */

function placeProxy(proxy: HTMLElement, box: ProxyBox): void {
  Object.assign(proxy.style, {
    left: `${box.cx - box.width / 2}px`,
    top: `${box.cy - box.height / 2}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    transform: `rotate(${box.rotation}deg)`,
  })
}

/** Lo que Moveable dejó en la caja de ayuda: centro, tamaño y giro. */
function readProxy(proxy: HTMLElement): ProxyBox {
  const css = getComputedStyle(proxy).transform
  const m = new DOMMatrix(css === 'none' ? undefined : css)
  const width = parseFloat(proxy.style.width)
  const height = parseFloat(proxy.style.height)
  return {
    cx: parseFloat(proxy.style.left) + width / 2 + m.e,
    cy: parseFloat(proxy.style.top) + height / 2 + m.f,
    width,
    height,
    rotation: (Math.atan2(m.b, m.a) * 180) / Math.PI,
  }
}

function dropProxies(): void {
  for (const item of items.values()) item.proxy.remove()
  items.clear()
}

/** Vuelve a armar las cajas de lo elegido a partir de dónde está cada elemento ahora. */
function sync(): void {
  syncFrame = 0
  if (!props.active || gesturing) return
  const sec = sectionEl(section)
  const seen = new Set<string>()
  if (sec && layer.value) {
    for (const ref of refs) {
      const el = resolveRef(sec, ref)
      if (!el) continue
      const data = elementOf(section, ref)
      const r = resolveCanvas(data ?? { id: ref }, isDesktop())
      let item = items.get(ref)
      if (!item || item.el !== el) {
        item?.proxy.remove()
        const proxy = document.createElement('div')
        proxy.className = 'arrange-proxy'
        layer.value.append(proxy)
        item = { ref, el, proxy, free: ref.startsWith('lienzo-'), text: false, locked: false }
        items.set(ref, item)
      }
      item.text = item.free && el.classList.contains('canvas-el--text')
      item.locked = !!data?.locked
      item.proxy.classList.toggle('is-locked', item.locked)
      placeProxy(item.proxy, boxOf(el, r.rotation, r.scale))
      seen.add(ref)
    }
  }
  for (const [ref, item] of items) {
    if (!seen.has(ref)) {
      item.proxy.remove()
      items.delete(ref)
    }
  }
  if (moveable) {
    const movable = [...items.values()].filter((i) => !i.locked)
    moveable.target = movable.map((i) => i.proxy)
    moveable.keepRatio = !movable.every((i) => i.text)
    moveable.zoom = uiZoom()
    moveable.renderDirections = directionsFor(movable)
    guides(sec, movable)
    moveable.updateRect()
  }
  postSelection()
}

function scheduleSync(): void {
  if (syncFrame || gesturing || typeof requestAnimationFrame !== 'function') return
  syncFrame = requestAnimationFrame(sync)
}

/**
 * Los 8 tiradores, salvo los que taparían el centro de un elemento delgado (un texto de una
 * línea): ahí los de arriba y abajo (o los de los lados) se quitan para poder arrastrarlo.
 */
function directionsFor(movable: Item[]): string[] {
  const zoom = uiZoom()
  const min = 44 * zoom
  const boxes = movable.map((i) => readProxy(i.proxy))
  const group = boxes.length > 1 ? unionSize(boxes) : boxes[0]
  const all = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']
  if (!group) return all
  let out = all
  if (group.height < min) out = out.filter((d) => d !== 'n' && d !== 's')
  if (group.width < min) out = out.filter((d) => d !== 'w' && d !== 'e')
  return out
}

function unionSize(boxes: ProxyBox[]): { width: number; height: number } {
  const xs = boxes.flatMap((b) => [b.cx - b.width / 2, b.cx + b.width / 2])
  const ys = boxes.flatMap((b) => [b.cy - b.height / 2, b.cy + b.height / 2])
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

/** Las guías magnéticas: centro y orillas de la sección, y los demás elementos. */
function guides(sec: HTMLElement | null, movable: Item[]): void {
  if (!moveable) return
  if (!sec) {
    moveable.verticalGuidelines = []
    moveable.horizontalGuidelines = []
    moveable.elementGuidelines = []
    return
  }
  const r = sec.getBoundingClientRect()
  const left = r.left + scrollX
  const top = r.top + scrollY
  moveable.verticalGuidelines = [left, left + r.width / 2, left + r.width]
  moveable.horizontalGuidelines = [top, top + r.height / 2, top + r.height]
  const mine = new Set(movable.map((i) => i.el))
  moveable.elementGuidelines = [...sec.querySelectorAll<HTMLElement>('[data-text], img, .canvas-el')].filter(
    (el) => !mine.has(el) && el.getClientRects().length > 0,
  )
}

/** Cuánto hay que agrandar los controles para que se vean igual con la vista previa reducida. */
function uiZoom(): number {
  const host = window.frameElement as HTMLElement | null
  if (!host || !host.offsetWidth) return 1
  const scale = host.getBoundingClientRect().width / host.offsetWidth
  return scale > 0 && scale < 1 ? Math.min(2.5, round2(1 / scale)) : 1
}

/* ---- avisar al editor ---- */

function postSelection(force = false): void {
  const sec = sectionEl(section)
  const frame = sec ? contentFrame(sec) : null
  const measures: Record<string, ArrangeMeasure> = {}
  if (frame) {
    for (const item of items.values()) {
      const r = item.el.getBoundingClientRect()
      measures[item.ref] = measureFrom(
        { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height },
        {
          w: item.el.offsetWidth * Math.abs(scaleOf(item)),
          h: item.el.offsetHeight * Math.abs(scaleOf(item)),
        },
        frame,
      )
    }
  }
  let area: ArrangeFrame | null = null
  if (sec && frame) {
    const r = sec.getBoundingClientRect()
    const box = measureFrom(
      { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height },
      { w: r.width, h: r.height },
      frame,
    )
    area = {
      content: Math.round(frame.width * 100) / 100,
      section: { x: box.x, y: box.y, width: box.width, height: box.height },
    }
  }
  const json = JSON.stringify([section, refs, measures, area])
  if (!force && json === lastPosted) return
  lastPosted = json
  emit('select', section, [...refs], measures, area)
}

function scaleOf(item: Item): number {
  return resolveCanvas(elementOf(section, item.ref) ?? { id: item.ref }, isDesktop()).scale
}

/** Cambia la selección (de aquí o del editor). */
function setSelection(next: string | null, nextRefs: string[]): void {
  section = next
  refs = [...nextRefs]
  const sec = sectionEl(next)
  selecto?.setSelectedTargets(
    sec ? refs.map((r) => resolveRef(sec, r)).filter((e): e is HTMLElement => !!e) : [],
  )
  scheduleSync()
  if (!syncFrame) postSelection()
}

defineExpose({ setSelection })

/* ---- elegir ---- */

function hitAt(x: number, y: number): Hit | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof HTMLElement) || node === shield.value || layer.value?.contains(node)) continue
    const sec = node.closest<HTMLElement>('[data-section-key]')
    if (!sec) continue
    const free = node.closest<HTMLElement>('.canvas-el[data-canvas-id]')
    if (free?.dataset.canvasId) return { section: sec, ref: free.dataset.canvasId, el: free }
    const el = node.tagName === 'IMG' ? node : node.closest<HTMLElement>('[data-text]')
    if (!el) continue
    const found = listCanvasTargets(sec).find((t) => t.el === el)
    if (found) return { section: sec, ref: found.target, el }
  }
  return null
}

function sectionAt(x: number, y: number): HTMLElement | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof HTMLElement) || node === shield.value || layer.value?.contains(node)) continue
    const sec = node.closest<HTMLElement>('[data-section-key]')
    if (sec) return sec
  }
  return null
}

/** Un clic sobre un elemento: lo elige (con Shift suma o quita; solo se mezclan los de una sección). */
function pick(hit: Hit, additive: boolean): void {
  const key = hit.section.dataset.sectionKey ?? null
  let next: string[]
  if (additive && key === section) {
    next = refs.includes(hit.ref) ? refs.filter((r) => r !== hit.ref) : [...refs, hit.ref]
  } else if (key === section && refs.includes(hit.ref)) {
    next = refs
  } else {
    next = [hit.ref]
  }
  setSelection(key, next)
  cancelAnimationFrame(syncFrame)
  sync()
}

function eventPoint(e: Event): { x: number; y: number } | null {
  const p = e as MouseEvent
  return typeof p.clientX === 'number' ? { x: p.clientX, y: p.clientY } : null
}

function onShieldMove(e: PointerEvent): void {
  if (gesturing || e.buttons) return
  const hit = hitAt(e.clientX, e.clientY)
  if (!hit) {
    hover.value = null
    return
  }
  const r = hit.el.getBoundingClientRect()
  hover.value = { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }
}

/* ---- gestos ---- */

function begin(): void {
  gesturing = true
  canvasPaused.value = true
  clearTimeout(resumeTimer)
  hover.value = null
  const sec = sectionEl(section)
  const frame = sec ? contentFrame(sec) : null
  for (const item of items.values()) {
    const r = resolveCanvas(elementOf(section, item.ref) ?? { id: item.ref }, isDesktop())
    item.start = {
      free: item.free,
      x: r.x,
      y: r.y,
      rotation: r.rotation,
      scale: r.scale,
      box: readProxy(item.proxy),
    }
    if (!item.free && getComputedStyle(item.el).display === 'inline') {
      item.display = item.el.style.display
      item.el.style.display = 'inline-block'
    }
  }
  if (!frame) gesturing = false
}

function currentValues(item: Item, frame: { left: number; top: number; width: number }): ArrangeValues {
  return item.start ? valuesFromBox(item.start, readProxy(item.proxy), frame) : {}
}

/** Pinta el elemento ya con los valores del gesto (sin pasar por el editor). */
function paint(item: Item, values: ArrangeValues, frame: { width: number }): void {
  const s = item.start
  if (!s) return
  if (item.free) {
    const set = (name: string, value: string) => item.el.style.setProperty(name, value)
    if (values.x !== undefined) set('--cv-x', String(round2(values.x)))
    if (values.y !== undefined) set('--cv-y', String(round2(values.y)))
    if (values.width !== undefined) set('--cv-w', String(round2(values.width)))
    if (values.rotation !== undefined) set('--cv-rotate', `${values.rotation}deg`)
    return
  }
  const base = resolveCanvas(elementOf(section, item.ref) ?? { id: item.ref }, isDesktop())
  const style = existingStyle(
    {
      ...base,
      x: values.x ?? base.x,
      y: values.y ?? base.y,
      rotation: values.rotation ?? base.rotation,
      scale: values.scale ?? base.scale,
    },
    frame.width,
  )
  for (const prop of ['translate', 'rotate', 'scale']) item.el.style.setProperty(prop, style[prop] ?? '')
}

function live(): void {
  const sec = sectionEl(section)
  const frame = sec ? contentFrame(sec) : null
  if (!frame) return
  for (const item of items.values()) {
    if (item.locked || !item.start) continue
    paint(item, currentValues(item, frame), frame)
  }
}

function differs(a: ArrangeValues, b: ArrangeValues): boolean {
  return (Object.keys(a) as (keyof ArrangeValues)[]).some(
    (k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 0.005,
  )
}

function finish(): void {
  const sec = sectionEl(section)
  const frame = sec ? contentFrame(sec) : null
  const changes: ArrangeChange[] = []
  if (frame && section) {
    for (const item of items.values()) {
      if (item.locked || !item.start) continue
      const values = currentValues(item, frame)
      const moved = differs(values, valuesFromBox(item.start, item.start.box, frame))
      if (moved) {
        changes.push({
          ref: item.ref,
          values: Object.fromEntries(
            Object.entries(values).map(([k, v]) => [k, round2(v)]),
          ) as ArrangeValues,
        })
      }
    }
  }
  gesturing = false
  if (changes.length && section) {
    emit('change', section, changes, false)
    // Hasta que llegue el lienzo nuevo, lo pintado a mano se queda (si no, parpadea).
    resumeTimer = setTimeout(resume, 1500)
  } else {
    resume()
  }
}

function resume(): void {
  clearTimeout(resumeTimer)
  for (const item of items.values()) {
    if (item.display !== undefined) {
      item.el.style.display = item.display ?? ''
      item.display = undefined
    }
    item.start = undefined
  }
  canvasPaused.value = false
  scheduleSync()
}

const applyDrag = (e: GestureEvent) => {
  if (e.target && e.transform) e.target.style.transform = e.transform
}
const applyResize = (e: GestureEvent) => {
  if (!e.target) return
  e.target.style.width = `${e.width}px`
  e.target.style.height = `${e.height}px`
  if (e.drag) e.target.style.transform = e.drag.transform
}
const applyRotate = (e: GestureEvent) => {
  if (e.target && e.drag) e.target.style.transform = e.drag.transform
}
const single = (apply: (e: GestureEvent) => void) => (e: GestureEvent) => {
  apply(e)
  live()
}
const group = (apply: (e: GestureEvent) => void) => (e: GestureEvent) => {
  e.events?.forEach(apply)
  live()
}

/* ---- teclado ---- */

function onKeydown(e: KeyboardEvent): void {
  if (!props.active) return
  if (e.key === 'Shift' && moveable) moveable.throttleRotate = 15
  const meta = e.metaKey || e.ctrlKey
  if (meta && /^[zyds]$/i.test(e.key)) {
    e.preventDefault()
    emit('key', e.key.toLowerCase(), true, e.shiftKey)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    emit('key', 'Delete', false, false)
  } else if (e.key === 'Escape') {
    setSelection(section, [])
  } else if (!meta && e.key.startsWith('Arrow')) {
    e.preventDefault()
    nudge(e)
  }
}

function onKeyup(e: KeyboardEvent): void {
  if (e.key === 'Shift' && moveable) moveable.throttleRotate = 0
}

function nudge(e: KeyboardEvent): void {
  const sec = sectionEl(section)
  const frame = sec ? contentFrame(sec) : null
  if (!frame || !section || frame.width <= 0) return
  const step = e.shiftKey ? 10 : 1
  const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
  const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
  const changes: ArrangeChange[] = []
  for (const item of items.values()) {
    if (item.locked) continue
    // Varias pulsaciones antes de que llegue el lienzo nuevo se suman sobre lo ya mandado.
    const r = pendingNudge.get(item.ref) ?? resolveCanvas(elementOf(section, item.ref) ?? { id: item.ref }, isDesktop())
    const next = {
      x: round2(r.x + (dx / frame.width) * 100),
      y: round2(r.y + (dy / frame.width) * 100),
    }
    pendingNudge.set(item.ref, next)
    changes.push({ ref: item.ref, values: next })
  }
  if (changes.length) emit('change', section, changes, true)
}

/* ---- encender y apagar ---- */

function onResize(): void {
  scheduleSync()
}

async function enable(): Promise<void> {
  if (moveable || loading) return
  loading = true
  const [{ default: Moveable }, { default: Selecto }] = await Promise.all([
    import('moveable'),
    import('selecto'),
  ])
  loading = false
  if (!props.active || !layer.value || !shield.value) return
  const host = layer.value

  const m = new Moveable(host, {
    target: [],
    container: host,
    draggable: true,
    resizable: true,
    rotatable: true,
    keepRatio: true,
    renderDirections: ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'],
    rotationPosition: 'top',
    throttleDrag: 0,
    throttleResize: 0,
    throttleRotate: 0,
    origin: false,
    snappable: true,
    snapThreshold: 6,
    snapDirections: { left: true, top: true, right: true, bottom: true, center: true, middle: true },
    elementSnapDirections: { left: true, top: true, right: true, bottom: true, center: true, middle: true },
    isDisplaySnapDigit: false,
    zoom: uiZoom(),
  } as never) as unknown as MoveableLike
  moveable = m

  const starts = ['dragStart', 'resizeStart', 'rotateStart', 'dragGroupStart', 'resizeGroupStart', 'rotateGroupStart']
  const ends = ['dragEnd', 'resizeEnd', 'rotateEnd', 'dragGroupEnd', 'resizeGroupEnd', 'rotateGroupEnd']
  for (const name of starts) m.on(name, begin as never)
  for (const name of ends) m.on(name, finish as never)
  m.on('drag', single(applyDrag) as never)
  m.on('resize', single(applyResize) as never)
  m.on('rotate', single(applyRotate) as never)
  m.on('dragGroup', group(applyDrag) as never)
  m.on('resizeGroup', group(applyResize) as never)
  m.on('rotateGroup', group(applyRotate) as never)

  const s = new Selecto({
    container: host,
    dragContainer: shield.value,
    selectableTargets: ['[data-text]', 'img', '.canvas-el'],
    hitRate: 0,
    selectByClick: false,
    selectFromInside: true,
    toggleContinueSelect: ['shift'],
  } as never) as unknown as SelectoLike
  selecto = s
  s.on('dragStart', ((e: { inputEvent: Event; stop: () => void }) => {
    const point = eventPoint(e.inputEvent)
    const hit = point ? hitAt(point.x, point.y) : null
    if (!hit) return
    e.stop()
    const additive = (e.inputEvent as MouseEvent).shiftKey
    pick(hit, additive)
    if (!additive && !items.get(hit.ref)?.locked) {
      // Arrastrar de una vez lo que se acaba de elegir.
      // (Si el botón ya se soltó —un clic rápido— no hay nada que arrastrar.)
      setTimeout(() => pressed && m.dragStart(e.inputEvent as MouseEvent), 0)
    }
  }) as never)
  s.on('selectEnd', ((e: { selected: HTMLElement[]; isClick: boolean; inputEvent: Event }) => {
    const point = eventPoint(e.inputEvent)
    if (e.isClick || !e.selected.length) {
      const sec = point ? sectionAt(point.x, point.y) : null
      if (sec) setSelection(sec.dataset.sectionKey ?? null, [])
      return
    }
    // Recuadro: lo que cae dentro de la primera sección tocada.
    const found = e.selected
      .map((el) => (el.closest('.canvas-el[data-canvas-id]') as HTMLElement | null) ?? el)
      .map((el) => {
        const sec = el.closest<HTMLElement>('[data-section-key]')
        if (!sec) return null
        const ref = el.dataset.canvasId ?? listCanvasTargets(sec).find((t) => t.el === el)?.target
        return ref ? { sec, ref } : null
      })
      .filter((x): x is { sec: HTMLElement; ref: string } => !!x)
    if (!found.length) return
    const first = found[0].sec
    const picked = [...new Set(found.filter((f) => f.sec === first).map((f) => f.ref))]
    setSelection(first.dataset.sectionKey ?? null, picked)
  }) as never)

  scheduleSync()
}

function disable(): void {
  moveable?.destroy()
  selecto?.destroy()
  moveable = null
  selecto = null
  dropProxies()
  hover.value = null
  gesturing = false
  clearTimeout(resumeTimer)
  canvasPaused.value = false
  lastPosted = ''
}

watch(
  () => props.active,
  (on) => {
    document.documentElement.classList.toggle('is-arranging', on)
    if (on) void enable()
    else disable()
  },
  { immediate: true },
)

// Cuando llega el lienzo nuevo (o cualquier cambio de la invitación), se vuelve a medir.
watch(
  () => props.sections,
  () => {
    pendingNudge.clear()
    if (!props.active) return
    if (!gesturing) {
      clearTimeout(resumeTimer)
      for (const item of items.values()) item.start = undefined
      resume()
    }
    // Dos cuadros: el primero deja que la invitación se pinte con el lienzo nuevo.
    requestAnimationFrame(() => requestAnimationFrame(sync))
  },
)

for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'pointercancel']) {
  window.addEventListener(type, onPress, true)
}
window.addEventListener('keydown', onKeydown, true)
window.addEventListener('keyup', onKeyup, true)
window.addEventListener('resize', onResize)
document.addEventListener('transitionend', onResize, true)
document.addEventListener('animationend', onResize, true)

onBeforeUnmount(() => {
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'pointercancel']) {
    window.removeEventListener(type, onPress, true)
  }
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('keyup', onKeyup, true)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('transitionend', onResize, true)
  document.removeEventListener('animationend', onResize, true)
  cancelAnimationFrame(syncFrame)
  disable()
  document.documentElement.classList.remove('is-arranging')
})
</script>

<template>
  <div v-if="active" class="arrange" aria-hidden="true">
    <div ref="shield" class="arrange-shield" @pointermove="onShieldMove" @pointerleave="hover = null" />
    <div ref="layer" class="arrange-layer">
      <div
        v-if="hover"
        class="arrange-hover"
        :style="{
          left: `${hover.left}px`,
          top: `${hover.top}px`,
          width: `${hover.width}px`,
          height: `${hover.height}px`,
        }"
      />
    </div>
  </div>
</template>

<style>
/* Estilos del editor (no de la invitación): colores fijos, encima de todo. */
.arrange-shield {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}
.arrange-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 2147483001;
}
.arrange-proxy {
  position: absolute;
  box-sizing: border-box;
  outline: 1px solid #4f46e5;
  cursor: move;
  transform-origin: 50% 50%;
}
.arrange-proxy.is-locked {
  outline: 1px dashed #94a3b8;
  cursor: not-allowed;
}
.arrange-hover {
  position: absolute;
  box-sizing: border-box;
  outline: 1px dashed rgb(79 70 229 / 0.7);
  pointer-events: none;
}
.moveable-control-box {
  z-index: 2147483002 !important;
}
/* Los elementos agregados reciben el puntero para poder elegirlos. */
html.is-arranging .canvas-layer,
html.is-arranging .canvas-el {
  pointer-events: auto;
}
</style>
