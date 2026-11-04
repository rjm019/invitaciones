import { parseTarget } from '@/services/canvasService'
import type { ArrangeMeasure, ArrangeValues } from '@/services/previewProtocol'
import type { DesignValues } from '@/types/design'

/**
 * «Acomodar» (lógica pura): convierte lo que se hace con el ratón en las filas `lienzo-N`
 * de una sección y hace con ellas lo de un editor gráfico (alinear, repartir, capas,
 * duplicar…). Unidades: x, y y ancho son % del ancho de `.section__content`.
 *
 * Una fila (`DesignValues`, todo texto) nombra un bloque que ya existe (`objetivo`:
 * "texto:title:0", "imagen:1") o uno libre (`tipo`). Su `ref` es el `objetivo` o su lugar
 * en la lista ("lienzo-3"). En celular se escriben `x`, `y`…; en computadora, `e_x`, `e_y`…
 * (vacío hereda del celular).
 */

export const MAX_ELEMENTS = 60

/** Rangos que acepta el servidor (Catalog / InvitationConfigBuilder). */
export const RANGES = {
  x: [-100, 200],
  y: [-200, 2000],
  width: [1, 300],
  rotation: [-360, 360],
  scale: [0.1, 5],
  opacity: [0, 100],
} as const

type GeometryKey = keyof typeof RANGES

const COLUMN: Record<GeometryKey | 'hidden', string> = {
  x: 'x',
  y: 'y',
  width: 'ancho',
  rotation: 'rotacion',
  scale: 'escala',
  opacity: 'opacidad',
  hidden: 'oculto',
}

/** Columnas que cambian con la pantalla (las demás valen para las dos). */
const DEVICE_COLUMNS = Object.values(COLUMN)

export const FREE_REF = /^lienzo-(\d{1,3})$/
export const isFreeRef = (ref: string): boolean => FREE_REF.test(ref)

const round = (n: number, digits = 2): number => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

export function clampValue(key: GeometryKey, n: number): number {
  const [min, max] = RANGES[key]
  return round(Math.min(max, Math.max(min, n)))
}

/** Número de un campo del CSV (con coma o punto); null si está vacío o no es número. */
export function toNumber(value: string | undefined): number | null {
  const v = (value ?? '').trim().replace(',', '.')
  if (v === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(v)) return null
  return Number(v)
}

const isOn = (value: string | undefined): boolean =>
  ['si', 's', 'x', 'yes', 'true', '1'].includes((value ?? '').trim().toLowerCase())

export const column = (key: GeometryKey | 'hidden', desktop: boolean): string =>
  `${desktop ? 'e_' : ''}${COLUMN[key]}`

/** Lugar de un elemento en la lista, o -1. */
export function rowIndex(canvas: DesignValues[], ref: string): number {
  const free = FREE_REF.exec(ref)
  if (free) {
    const i = Number(free[1]) - 1
    return i < canvas.length && !canvas[i].objetivo ? i : -1
  }
  return canvas.findIndex((row) => (row.objetivo ?? '').trim() === ref)
}

/** La fila de un elemento; si es un bloque que ya existe y aún no tiene, la agrega. */
export function ensureRow(
  canvas: DesignValues[],
  ref: string,
): { canvas: DesignValues[]; index: number } | null {
  const found = rowIndex(canvas, ref)
  if (found >= 0) return { canvas: [...canvas], index: found }
  if (!parseTarget(ref) || canvas.length >= MAX_ELEMENTS) return null
  return { canvas: [...canvas, { objetivo: ref }], index: canvas.length }
}

function withValue(row: DesignValues, key: string, value: string): DesignValues {
  const next = { ...row }
  if (value === '') delete next[key]
  else next[key] = value
  return next
}

/** Escribe valores numéricos en la pantalla indicada (redondeados y dentro de rango). */
export function applyChanges(
  canvas: DesignValues[],
  changes: { ref: string; values: ArrangeValues }[],
  desktop: boolean,
): DesignValues[] {
  let out = canvas
  for (const { ref, values } of changes) {
    const before = elementValues(out, ref, desktop)
    const target = ensureRow(out, ref)
    if (!target) continue
    let row = target.canvas[target.index]
    for (const key of Object.keys(RANGES) as GeometryKey[]) {
      const n = (values as Record<string, number | undefined>)[key]
      if (n === undefined || !Number.isFinite(n)) continue
      const value = clampValue(key, n)
      const name = column(key, desktop)
      // Lo que no cambió y aún no está escrito se deja vacío (así el archivo queda corto).
      const same = before && (before as unknown as Record<string, number | null>)[key] === value
      if (same && (row[name] ?? '') === '') continue
      row = withValue(row, name, String(value))
    }
    target.canvas[target.index] = row
    out = target.canvas
  }
  return out
}

/** Lo que el panel muestra de un elemento, ya resuelto para la pantalla. */
export interface ElementValues {
  free: boolean
  kind: 'text' | 'image' | 'shape' | null
  x: number
  y: number
  /** % del contenedor; null = su ancho natural. */
  width: number | null
  rotation: number
  scale: number
  opacity: number
  hidden: boolean
  flipH: boolean
  flipV: boolean
  locked: boolean
  layer: number
  row: DesignValues
}

const KINDS: Record<string, 'text' | 'image' | 'shape'> = {
  texto: 'text',
  imagen: 'image',
  forma: 'shape',
}

const plain = (value: string | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Los valores que tocan: en computadora, los `e_*` encima de los del celular. */
export function elementValues(
  canvas: DesignValues[],
  ref: string,
  desktop: boolean,
): ElementValues | null {
  const index = rowIndex(canvas, ref)
  const row = index >= 0 ? canvas[index] : parseTarget(ref) ? {} : null
  if (!row) return null
  const pick = (key: GeometryKey): number | null =>
    (desktop ? toNumber(row[column(key, true)]) : null) ?? toNumber(row[column(key, false)])
  const hiddenDesktop = desktop ? (row[column('hidden', true)] ?? '').trim() : ''
  return {
    free: isFreeRef(ref),
    kind: KINDS[plain(row.tipo)] ?? null,
    x: pick('x') ?? 0,
    y: pick('y') ?? 0,
    width: pick('width'),
    rotation: pick('rotation') ?? 0,
    scale: pick('scale') ?? 1,
    opacity: pick('opacity') ?? 100,
    hidden: hiddenDesktop !== '' ? isOn(hiddenDesktop) : isOn(row.oculto),
    flipH: isOn(row.voltear_h),
    flipV: isOn(row.voltear_v),
    locked: isOn(row.bloqueado),
    layer: toNumber(row.capa) ?? 0,
    row,
  }
}

/** Cambia columnas de una fila tal cual (vacío la quita). Crea la fila de un bloque que ya existe. */
export function setColumns(
  canvas: DesignValues[],
  ref: string,
  changes: Record<string, string>,
): DesignValues[] {
  const target = ensureRow(canvas, ref)
  if (!target) return canvas
  target.canvas[target.index] = Object.entries(changes).reduce(
    (row, [key, value]) => withValue(row, key, value),
    target.canvas[target.index],
  )
  return target.canvas
}

/** Opacidad, ocultar, voltear o bloquear en la pantalla que se edita. */
export function setProperty(
  canvas: DesignValues[],
  ref: string,
  property: 'opacity' | 'hidden' | 'flipH' | 'flipV' | 'locked',
  value: number | boolean,
  desktop: boolean,
): DesignValues[] {
  if (property === 'opacity') {
    const n = clampValue('opacity', Number(value))
    return setColumns(canvas, ref, { [column('opacity', desktop)]: n >= 100 && !desktop ? '' : String(n) })
  }
  if (property === 'hidden') {
    return setColumns(canvas, ref, { [column('hidden', desktop)]: value ? 'SI' : desktop ? 'NO' : '' })
  }
  const name = { flipH: 'voltear_h', flipV: 'voltear_v', locked: 'bloqueado' }[property]
  return setColumns(canvas, ref, { [name]: value ? 'SI' : '' })
}

/** Una fila que solo dice a qué bloque se refiere no cambia nada: se quita. */
function isEmptyTarget(row: DesignValues): boolean {
  return !!row.objetivo && Object.entries(row).every(([key, v]) => key === 'objetivo' || v === '')
}

/**
 * «Volver a su lugar»: quita lo movido en esta pantalla (en el celular también el volteo y
 * el bloqueo). Si de un bloque que ya existía no queda nada, la fila se va.
 */
export function resetPlace(canvas: DesignValues[], ref: string, desktop: boolean): DesignValues[] {
  const index = rowIndex(canvas, ref)
  if (index < 0) return canvas
  let row = canvas[index]
  for (const name of DEVICE_COLUMNS) row = withValue(row, desktop ? `e_${name}` : name, '')
  if (!desktop) for (const name of ['voltear_h', 'voltear_v', 'bloqueado']) row = withValue(row, name, '')
  const next = [...canvas]
  if (isEmptyTarget(row)) next.splice(index, 1)
  else next[index] = row
  return next
}

/** Quita un elemento libre. Los bloques que ya existen no se quitan aquí: se ocultan o vuelven a su lugar. */
export function removeElements(canvas: DesignValues[], refs: string[]): DesignValues[] {
  const drop = new Set(refs.filter(isFreeRef).map((ref) => rowIndex(canvas, ref)))
  return canvas.filter((_, i) => !drop.has(i))
}

/** Copia de un elemento libre un poco corrida y encima de todos. */
export function duplicateElements(
  canvas: DesignValues[],
  refs: string[],
): { canvas: DesignValues[]; refs: string[] } {
  let out = canvas
  const created: string[] = []
  let top = Math.max(0, ...freeLayers(canvas).map((l) => l.layer))
  for (const ref of refs.filter(isFreeRef)) {
    const index = rowIndex(out, ref)
    if (index < 0 || out.length >= MAX_ELEMENTS) continue
    const copy = { ...out[index] }
    for (const prefix of ['', 'e_']) {
      const x = toNumber(copy[`${prefix}x`])
      const y = toNumber(copy[`${prefix}y`])
      if (x !== null) copy[`${prefix}x`] = String(clampValue('x', x + 3))
      if (y !== null) copy[`${prefix}y`] = String(clampValue('y', y + 3))
    }
    delete copy.bloqueado
    copy.capa = String(++top)
    out = [...out, copy]
    created.push(`lienzo-${out.length}`)
  }
  return { canvas: out, refs: created }
}

/** Elementos libres que se pueden agregar. */
export type NewElement =
  | { kind: 'text' }
  | { kind: 'image'; file: string }
  | { kind: 'shape'; shape: 'line' | 'rectangle' | 'circle' }

/**
 * Un elemento libre nuevo, arriba de los demás. Nace con valores del celular (los de
 * escritorio heredan): en la parte de arriba de la sección, a un lado del borde.
 */
export function addElement(
  canvas: DesignValues[],
  element: NewElement,
): { canvas: DesignValues[]; ref: string } | null {
  if (canvas.length >= MAX_ELEMENTS) return null
  const top = Math.max(0, ...freeLayers(canvas).map((l) => l.layer)) + 1
  let row: DesignValues
  if (element.kind === 'text') {
    row = { tipo: 'texto', texto: 'Escribe aquí', tamano: '6', alineacion: 'centro', x: '25', y: '10', ancho: '50' }
  } else if (element.kind === 'image') {
    row = { tipo: 'imagen', imagen: element.file, x: '20', y: '10', ancho: '60' }
  } else if (element.shape === 'line') {
    row = { tipo: 'forma', forma: 'linea', color: 'accent', borde: '2', x: '25', y: '15', ancho: '50' }
  } else if (element.shape === 'circle') {
    row = { tipo: 'forma', forma: 'circulo', color: 'accent', x: '35', y: '10', ancho: '30' }
  } else {
    row = { tipo: 'forma', forma: 'rectangulo', color: 'accent', x: '25', y: '10', ancho: '50' }
  }
  row.capa = String(top)
  return { canvas: [...canvas, row], ref: `lienzo-${canvas.length + 1}` }
}

export interface LayerItem {
  ref: string
  label: string
  kind: 'text' | 'image' | 'shape' | 'target'
  layer: number
  hidden: boolean
  locked: boolean
}

function freeLayers(canvas: DesignValues[]): { ref: string; layer: number; order: number }[] {
  return canvas
    .map((row, order) => ({ row, order }))
    .filter(({ row }) => !row.objetivo && !!KINDS[plain(row.tipo)])
    .map(({ row, order }) => ({
      ref: `lienzo-${order + 1}`,
      layer: toNumber(row.capa) ?? 0,
      order,
    }))
}

const SHAPES: Record<string, string> = { linea: 'Línea', rectangulo: 'Rectángulo', circulo: 'Círculo' }

/** Cómo se llama un elemento en la lista de capas. */
export function labelOf(row: DesignValues): string {
  const target = parseTarget(row.objetivo)
  if (target) return target.kind === 'text' ? `Texto «${target.block}»` : `Imagen ${target.index + 1}`
  const kind = KINDS[plain(row.tipo)]
  if (kind === 'text') {
    const text = (row.texto ?? '').replace(/\s+/g, ' ').trim()
    return text.length > 26 ? `${text.slice(0, 25)}…` : text || 'Texto'
  }
  if (kind === 'image') return row.imagen || 'Imagen'
  return SHAPES[plain(row.forma)] ?? 'Forma'
}

/** Las capas de la sección, de arriba hacia abajo: libres (por capa) y luego los bloques que ya se acomodaron. */
export function listLayers(canvas: DesignValues[]): LayerItem[] {
  const free = freeLayers(canvas)
    .sort((a, b) => b.layer - a.layer || b.order - a.order)
    .map(({ ref, layer, order }) => {
      const row = canvas[order]
      const values = elementValues(canvas, ref, false)!
      return {
        ref,
        label: labelOf(row),
        kind: values.kind ?? ('shape' as const),
        layer,
        hidden: values.hidden,
        locked: values.locked,
      }
    })
  const targets = canvas
    .filter((row) => !!parseTarget(row.objetivo))
    .map((row) => ({
      ref: row.objetivo.trim(),
      label: labelOf(row),
      kind: 'target' as const,
      layer: 0,
      hidden: isOn(row.oculto),
      locked: isOn(row.bloqueado),
    }))
  return [...free, ...targets]
}

export type StackOp = 'front' | 'back' | 'forward' | 'backward'

/**
 * Orden de las capas de los elementos libres. Mueve los elegidos y deja las capas
 * numeradas 1, 2, 3… de abajo hacia arriba (las que ya existen en bloques no cuentan).
 */
export function restack(canvas: DesignValues[], refs: string[], op: StackOp): DesignValues[] {
  const order = freeLayers(canvas)
    .sort((a, b) => a.layer - b.layer || a.order - b.order)
    .map((l) => l.ref)
  const chosen = new Set(refs.filter((r) => order.includes(r)))
  if (!chosen.size) return canvas
  let next = order
  if (op === 'front') next = [...order.filter((r) => !chosen.has(r)), ...order.filter((r) => chosen.has(r))]
  else if (op === 'back') next = [...order.filter((r) => chosen.has(r)), ...order.filter((r) => !chosen.has(r))]
  else if (op === 'forward') {
    next = [...order]
    for (let i = next.length - 2; i >= 0; i--) {
      if (chosen.has(next[i]) && !chosen.has(next[i + 1])) [next[i], next[i + 1]] = [next[i + 1], next[i]]
    }
  } else {
    next = [...order]
    for (let i = 1; i < next.length; i++) {
      if (chosen.has(next[i]) && !chosen.has(next[i - 1])) [next[i], next[i - 1]] = [next[i - 1], next[i]]
    }
  }
  const layers = new Map(next.map((ref, i) => [ref, String(i + 1)]))
  return canvas.map((row, i) => {
    const layer = layers.get(`lienzo-${i + 1}`)
    return layer && !row.objetivo ? { ...row, capa: layer } : row
  })
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export interface Delta {
  dx: number
  dy: number
}
interface Area {
  x: number
  y: number
  width: number
  height: number
}

/** La caja que envuelve a varios elementos. */
export function unionBox(refs: string[], measures: Record<string, ArrangeMeasure>): Area | null {
  const boxes = refs.map((r) => measures[r]).filter(Boolean)
  if (!boxes.length) return null
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  }
}

/**
 * Cuánto (px) mover cada elemento para alinearlo con `area`: la sección, o la caja de
 * todos los elegidos.
 */
export function alignDeltas(
  refs: string[],
  measures: Record<string, ArrangeMeasure>,
  mode: AlignMode,
  area: Area,
): Record<string, Delta> {
  const out: Record<string, Delta> = {}
  for (const ref of refs) {
    const m = measures[ref]
    if (!m) continue
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = area.x - m.x
    else if (mode === 'hcenter') dx = area.x + area.width / 2 - (m.x + m.width / 2)
    else if (mode === 'right') dx = area.x + area.width - (m.x + m.width)
    else if (mode === 'top') dy = area.y - m.y
    else if (mode === 'vcenter') dy = area.y + area.height / 2 - (m.y + m.height / 2)
    else dy = area.y + area.height - (m.y + m.height)
    out[ref] = { dx: round(dx), dy: round(dy) }
  }
  return out
}

/** Reparte con el mismo espacio entre cajas (3 o más), sin mover la primera ni la última. */
export function distributeDeltas(
  refs: string[],
  measures: Record<string, ArrangeMeasure>,
  axis: 'h' | 'v',
): Record<string, Delta> {
  const boxes = refs
    .filter((r) => measures[r])
    .map((ref) => ({ ref, m: measures[ref] }))
    .sort((a, b) => (axis === 'h' ? a.m.x - b.m.x : a.m.y - b.m.y))
  if (boxes.length < 3) return {}
  const start = (b: { m: ArrangeMeasure }) => (axis === 'h' ? b.m.x : b.m.y)
  const size = (b: { m: ArrangeMeasure }) => (axis === 'h' ? b.m.width : b.m.height)
  const first = boxes[0]
  const last = boxes[boxes.length - 1]
  const span = start(last) + size(last) - start(first)
  const gap = (span - boxes.reduce((sum, b) => sum + size(b), 0)) / (boxes.length - 1)
  const out: Record<string, Delta> = {}
  let cursor = start(first)
  for (const b of boxes) {
    const delta = round(cursor - start(b))
    out[b.ref] = axis === 'h' ? { dx: delta, dy: 0 } : { dx: 0, dy: delta }
    cursor += size(b) + gap
  }
  return out
}

/** Mueve elementos px (de la vista) → % del ancho del contenedor, sobre lo que ya tenían. */
export function moveBy(
  canvas: DesignValues[],
  deltas: Record<string, Delta>,
  contentWidth: number,
  desktop: boolean,
): DesignValues[] {
  if (contentWidth <= 0) return canvas
  const changes = Object.entries(deltas)
    .filter(([, d]) => d.dx !== 0 || d.dy !== 0)
    .map(([ref, d]) => {
      const now = elementValues(canvas, ref, desktop)
      return {
        ref,
        values: {
          x: (now?.x ?? 0) + (d.dx / contentWidth) * 100,
          y: (now?.y ?? 0) + (d.dy / contentWidth) * 100,
        },
      }
    })
  return applyChanges(canvas, changes, desktop)
}

/* Desde aquí, lo que usa la vista previa mientras se arrastra (px de la pantalla). */

/** Una caja girada: centro, tamaño sin girar y giro en grados. */
export interface ProxyBox {
  cx: number
  cy: number
  width: number
  height: number
  rotation: number
}

/** Cómo estaba un elemento al empezar el gesto. */
export interface GestureStart {
  free: boolean
  x: number
  y: number
  rotation: number
  scale: number
  box: ProxyBox
}

/** Giro entre -180 y 180. */
export function normalizeAngle(deg: number): number {
  const n = ((((deg + 180) % 360) + 360) % 360) - 180
  return round(n === -180 ? 180 : n)
}

/**
 * Los valores que salen de mover, girar o cambiar de tamaño la caja de un elemento.
 * `frame` es la esquina y el ancho (px) de `.section__content`.
 * - Existente: x, y son el desplazamiento (lo que se movió el centro); el tamaño es la escala.
 * - Libre: x, y son su esquina superior izquierda; el tamaño es el ancho (con su escala aparte).
 */
export function valuesFromBox(
  start: GestureStart,
  now: ProxyBox,
  frame: { left: number; top: number; width: number },
): ArrangeValues {
  if (frame.width <= 0) return {}
  const pct = (px: number) => (px / frame.width) * 100
  const rotation = normalizeAngle(now.rotation)
  if (!start.free) {
    const ratio = start.box.width > 0 ? now.width / start.box.width : 1
    return {
      x: start.x + pct(now.cx - start.box.cx),
      y: start.y + pct(now.cy - start.box.cy),
      rotation,
      scale: start.scale * ratio,
    }
  }
  const s = start.scale > 0 ? start.scale : 1
  const layoutW = now.width / s
  const layoutH = now.height / s
  return {
    x: pct(now.cx - layoutW / 2 - frame.left),
    y: pct(now.cy - layoutH / 2 - frame.top),
    width: pct(layoutW),
    rotation,
  }
}

/** Medidas de un elemento (caja que lo envuelve y tamaño sin girar) relativas a la esquina del contenido. */
export function measureFrom(
  rect: { left: number; top: number; width: number; height: number },
  size: { w: number; h: number },
  origin: { left: number; top: number },
): ArrangeMeasure {
  return {
    x: round(rect.left - origin.left, 1),
    y: round(rect.top - origin.top, 1),
    width: round(rect.width, 1),
    height: round(rect.height, 1),
    w: round(size.w, 1),
    h: round(size.h, 1),
  }
}
