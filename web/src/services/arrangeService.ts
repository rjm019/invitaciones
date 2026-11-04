import { parseTarget } from '@/services/canvasService'
import type {
  ArrangeBlock,
  ArrangeCopy,
  ArrangeMeasure,
  ArrangeValues,
} from '@/services/previewProtocol'
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
  height: [1, 600],
  rotation: [-360, 360],
  scale: [0.1, 5],
  scale_y: [0.1, 5],
  opacity: [0, 100],
  size: [0.5, 40],
} as const

type GeometryKey = keyof typeof RANGES

const COLUMN: Record<GeometryKey | 'hidden' | 'removed', string> = {
  x: 'x',
  y: 'y',
  width: 'ancho',
  height: 'alto',
  rotation: 'rotacion',
  scale: 'escala',
  scale_y: 'escala_y',
  opacity: 'opacidad',
  size: 'tamano',
  hidden: 'oculto',
  removed: 'eliminado',
}

/** Columnas que cambian con la pantalla (las demás valen para las dos; `tamano` es de las demás). */
const DEVICE_COLUMNS = Object.entries(COLUMN)
  .filter(([key]) => key !== 'size')
  .map(([, name]) => name)

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

export const column = (key: GeometryKey | 'hidden' | 'removed', desktop: boolean): string =>
  `${desktop && key !== 'size' ? 'e_' : ''}${COLUMN[key]}`

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

/** Lo que ya vale un campo de geometría (para no escribir lo que no cambió). */
function currentOf(values: ElementValues | null, key: GeometryKey): number | null {
  if (!values) return null
  if (key === 'scale_y') return values.scaleY ?? values.scale
  if (key === 'opacity') return values.opacity
  return values[key]
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
      if (key === 'scale_y') {
        // Igual a la escala horizontal = vacío (hereda de ella); en escritorio, si el celular
        // tiene su propia vertical, se escribe tal cual para no heredarla.
        const horizontal = values.scale !== undefined ? clampValue('scale', values.scale) : (before?.scale ?? 1)
        const inherited = desktop ? toNumber(row.escala_y) : null
        if (Math.abs(value - horizontal) < 0.005 && inherited === null) {
          row = withValue(row, name, '')
          continue
        }
      }
      // Lo que no cambió y aún no está escrito se deja vacío (así el archivo queda corto).
      const same = before && currentOf(before, key) === value
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
  /** Forma agregada que es una línea (su alto es su grosor: no se estira). */
  line: boolean
  x: number
  y: number
  /** % del contenedor; null = su ancho natural. */
  width: number | null
  /** % del contenedor (imagen y forma agregadas); null = conserva su proporción. */
  height: number | null
  rotation: number
  scale: number
  /** Escala vertical propia de un elemento de la sección; null = igual a `scale`. */
  scaleY: number | null
  /** Tamaño del texto agregado (% del ancho); null = el de siempre. */
  size: number | null
  opacity: number
  hidden: boolean
  /** Elemento de la sección quitado de la vista (libera su espacio). */
  removed: boolean
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
  const removedDesktop = desktop ? (row[column('removed', true)] ?? '').trim() : ''
  return {
    free: isFreeRef(ref),
    kind: KINDS[plain(row.tipo)] ?? null,
    line: plain(row.tipo) === 'forma' && plain(row.forma) === 'linea',
    x: pick('x') ?? 0,
    y: pick('y') ?? 0,
    width: pick('width'),
    height: pick('height'),
    rotation: pick('rotation') ?? 0,
    scale: pick('scale') ?? 1,
    scaleY: pick('scale_y'),
    size: pick('size'),
    opacity: pick('opacity') ?? 100,
    hidden: hiddenDesktop !== '' ? isOn(hiddenDesktop) : isOn(row.oculto),
    removed: removedDesktop !== '' ? isOn(removedDesktop) : isOn(row.eliminado),
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

/** Quita un elemento libre. Los bloques que ya existen se quitan con `setRemoved`. */
export function removeElements(canvas: DesignValues[], refs: string[]): DesignValues[] {
  const drop = new Set(refs.filter(isFreeRef).map((ref) => rowIndex(canvas, ref)))
  return canvas.filter((_, i) => !drop.has(i))
}

/**
 * Quita (o devuelve) un bloque que ya existe: `display: none`, así que libera su espacio. En
 * la vista de computadora solo se escribe `e_eliminado` (el celular no se toca): quitarlo es
 * «SI»; devolverlo es «NO» si el celular lo tiene quitado, o vacío si no.
 */
export function setRemoved(
  canvas: DesignValues[],
  ref: string,
  removed: boolean,
  desktop: boolean,
): DesignValues[] {
  if (isFreeRef(ref)) return canvas
  const column_ = column('removed', desktop)
  const index = rowIndex(canvas, ref)
  const mobile = index >= 0 ? isOn(canvas[index].eliminado) : false
  const value = removed ? 'SI' : desktop && mobile ? 'NO' : ''
  const next = setColumns(canvas, ref, { [column_]: value })
  const at = rowIndex(next, ref)
  if (at >= 0 && isEmptyTarget(next[at])) return next.filter((_, i) => i !== at)
  return next
}

/** La capa más alta de la sección (los bloques y los elementos agregados comparten el orden). */
function topLayer(canvas: DesignValues[]): number {
  return Math.max(0, ...canvas.map((row) => toNumber(row.capa) ?? 0))
}

/** Lo que el iframe leyó de un bloque de la sección para poder copiarlo. */
export interface DuplicateContext {
  copies: Record<string, ArrangeCopy>
  measures: Record<string, ArrangeMeasure>
  /** Ancho (px) de la unidad (%): `.section__content`. */
  content: number
  desktop: boolean
}

const OFFSET = 3

/** Un elemento libre nuevo que copia un bloque de la sección (queda fijo: no sigue al original). */
function copyOfBlock(
  canvas: DesignValues[],
  ref: string,
  ctx: DuplicateContext,
  layer: number,
): DesignValues | null {
  const copy = ctx.copies[ref]
  const m = ctx.measures[ref]
  if (!copy || !m || ctx.content <= 0) return null
  const now = elementValues(canvas, ref, ctx.desktop)
  if (!now || now.removed) return null
  const pct = (px: number) => (px / ctx.content) * 100
  const x = clampValue('x', pct(m.x + m.width / 2 - m.w / 2) + OFFSET)
  const y = clampValue('y', pct(m.y + m.height / 2 - m.h / 2) + OFFSET)
  const row: DesignValues = {}
  let width: number
  let height: number | null = null
  if (copy.kind === 'text') {
    row.tipo = 'texto'
    row.texto = copy.text
    if (copy.font) row.letra = copy.font
    row.tamano = String(clampValue('size', copy.size))
    if (copy.color) row.color = copy.color
    row.alineacion = { left: 'izquierda', center: 'centro', right: 'derecha' }[copy.align]
    // Un poco de holgura: el redondeo no debe partir una línea que antes cabía.
    width = clampValue('width', pct(m.w) * 1.04)
  } else {
    row.tipo = 'imagen'
    row.imagen = copy.src
    width = clampValue('width', pct(m.w))
    const h = pct(m.h)
    if (copy.aspect > 0 && Math.abs(m.w / m.h - copy.aspect) / copy.aspect > 0.03) {
      height = clampValue('height', h)
    }
  }
  // Nace con valores del celular; si se copia desde escritorio, también los de escritorio.
  const set = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    row[column(key, false)] = String(value)
    if (ctx.desktop) row[column(key, true)] = String(value)
  }
  set('x', x)
  set('y', y)
  set('width', width)
  if (height !== null) set('height', height)
  if (now.rotation !== 0) row.rotacion = String(clampValue('rotation', now.rotation))
  if (now.opacity < 100) row.opacidad = String(clampValue('opacity', now.opacity))
  if (now.flipH) row.voltear_h = 'SI'
  if (now.flipV) row.voltear_v = 'SI'
  row.capa = String(layer)
  return row
}

/**
 * Copia de un elemento un poco corrida y encima de todos. Un elemento agregado se copia tal
 * cual; un texto o una imagen de la sección se copia como un elemento agregado, con lo que el
 * iframe leyó de él (`ctx`). Es una copia fija: si después se edita el original, no cambia.
 */
export function duplicateElements(
  canvas: DesignValues[],
  refs: string[],
  ctx?: DuplicateContext,
): { canvas: DesignValues[]; refs: string[] } {
  let out = canvas
  const created: string[] = []
  let top = topLayer(canvas)
  for (const ref of refs) {
    if (out.length >= MAX_ELEMENTS) break
    if (!isFreeRef(ref)) {
      const row = ctx ? copyOfBlock(out, ref, ctx, top + 1) : null
      if (!row) continue
      top++
      out = [...out, row]
      created.push(`lienzo-${out.length}`)
      continue
    }
    const index = rowIndex(out, ref)
    if (index < 0) continue
    const copy = { ...out[index] }
    for (const prefix of ['', 'e_']) {
      const x = toNumber(copy[`${prefix}x`])
      const y = toNumber(copy[`${prefix}y`])
      if (x !== null) copy[`${prefix}x`] = String(clampValue('x', x + OFFSET))
      if (y !== null) copy[`${prefix}y`] = String(clampValue('y', y + OFFSET))
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
  const top = topLayer(canvas) + 1
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
  /** Bloque de la sección quitado (sale tachado y se puede restaurar). */
  removed: boolean
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

interface Stacked {
  ref: string
  layer: number
  /** Los bloques de la sección van debajo de los agregados de la misma capa. */
  free: boolean
  order: number
}

/**
 * Todos los elementos de la sección, de abajo hacia arriba: los bloques que ya existen (los
 * que la vista previa enumeró, más los que ya tienen fila) y los agregados. Se ordena por
 * capa; a igual capa, primero los bloques (en su orden de aparición) y luego los agregados.
 */
function stackItems(canvas: DesignValues[], blocks: ArrangeBlock[]): Stacked[] {
  const items: Stacked[] = []
  const known = new Set<string>()
  blocks.forEach((block, order) => {
    known.add(block.ref)
    const at = rowIndex(canvas, block.ref)
    items.push({ ref: block.ref, layer: at >= 0 ? (toNumber(canvas[at].capa) ?? 0) : 0, free: false, order })
  })
  canvas.forEach((row, at) => {
    const ref = (row.objetivo ?? '').trim()
    if (!parseTarget(ref) || known.has(ref)) return
    items.push({ ref, layer: toNumber(row.capa) ?? 0, free: false, order: blocks.length + at })
  })
  for (const f of freeLayers(canvas)) items.push({ ref: f.ref, layer: f.layer, free: true, order: f.order })
  return items.sort((a, b) => a.layer - b.layer || Number(a.free) - Number(b.free) || a.order - b.order)
}

/**
 * Las capas de la sección, de arriba hacia abajo: todo lo que la vista previa enumeró (los
 * textos e imágenes de la sección, toquen o no) y lo agregado, en el orden en que se apilan.
 */
export function listLayers(canvas: DesignValues[], blocks: ArrangeBlock[] = []): LayerItem[] {
  const labels = new Map(blocks.map((b) => [b.ref, b.label]))
  return stackItems(canvas, blocks)
    .reverse()
    .map(({ ref, layer }) => {
      const at = rowIndex(canvas, ref)
      const row = at >= 0 ? canvas[at] : ({ objetivo: ref } as DesignValues)
      const values = elementValues(canvas, ref, false)!
      return {
        ref,
        label: isFreeRef(ref) ? labelOf(row) : labelOfBlock(ref, labels.get(ref)),
        kind: isFreeRef(ref) ? (values.kind ?? ('shape' as const)) : ('target' as const),
        layer,
        hidden: values.hidden,
        locked: values.locked,
        removed: values.removed,
      }
    })
}

/** Nombre de un bloque de la sección: su texto (o «Imagen n») y, en los textos, su bloque. */
function labelOfBlock(ref: string, label: string | undefined): string {
  const target = parseTarget(ref)
  if (!target) return ref
  if (target.kind === 'image') return label ? `Imagen ${target.index + 1} · ${label}` : `Imagen ${target.index + 1}`
  return label ? `«${label}»` : `Texto «${target.block}»`
}

export type StackOp = 'front' | 'back' | 'forward' | 'backward'

/**
 * Orden de las capas de todos los elementos de la sección (bloques que ya existen y
 * agregados). Mueve los elegidos y numera 1, 2, 3… de abajo hacia arriba desde el primer
 * elemento que ya estaba acomodado, era agregado o se movió; los bloques sin tocar que
 * quedan debajo de todos no reciben fila. Si faltara lugar para las filas, no cambia nada.
 */
export function restack(
  canvas: DesignValues[],
  refs: string[],
  op: StackOp,
  blocks: ArrangeBlock[] = [],
): DesignValues[] {
  const items = stackItems(canvas, blocks)
  const order = items.map((i) => i.ref)
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
  const touched = new Set(items.filter((i) => i.free || i.layer !== 0).map((i) => i.ref))
  const first = next.findIndex((r) => chosen.has(r) || touched.has(r))
  let out = canvas
  for (let i = first; i < next.length; i++) {
    const ref = next[i]
    const layer = String(i - first + 1)
    const at = rowIndex(out, ref)
    if (at >= 0) {
      if (out[at].capa === layer) continue
      out = out.map((row, n) => (n === at ? { ...row, capa: layer } : row))
    } else {
      const created = ensureRow(out, ref)
      if (!created) return canvas
      created.canvas[created.index] = { ...created.canvas[created.index], capa: layer }
      out = created.canvas
    }
  }
  return out
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
  /** Escala vertical de un elemento de la sección (la horizontal si no tiene la suya). */
  scaleY: number
  box: ProxyBox
  /** Qué tipo de elemento agregado es (null en los de la sección). */
  kind?: 'text' | 'image' | 'shape' | 'line' | null
  /** Ya trae alto propio (imagen o forma agregadas). */
  sized?: boolean
  /** Tamaño del texto agregado (% del ancho) y su ancho (%). */
  size?: number
}

/** Cómo se está estirando: hacia dónde va el tirador (-1, 0 o 1 en cada eje). */
export interface ResizeInfo {
  direction: [number, number]
  /** Altura real (px) que el texto toma con el ancho nuevo; sin ella no se corrige la posición. */
  textHeight?: number
  /** Escribir también el tamaño de la letra (solo en la vista de celular). */
  writeSize: boolean
}

/** Giro entre -180 y 180. */
export function normalizeAngle(deg: number): number {
  const n = ((((deg + 180) % 360) + 360) % 360) - 180
  return round(n === -180 ? 180 : n)
}

const rotate = (x: number, y: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
}

/**
 * El centro de un texto estirado cuando su alto lo da el propio texto: el punto que no se
 * mueve (la esquina opuesta al tirador; en un lado, la esquina de arriba de ese borde) se
 * queda donde estaba y la caja se acomoda a la altura real. Con giro también funciona.
 */
export function anchorTextCenter(
  start: ProxyBox,
  direction: [number, number],
  width: number,
  height: number,
  rotation: number,
): { cx: number; cy: number } {
  const fx = -direction[0]
  const fy = direction[1] === 0 ? -1 : -direction[1]
  const [px, py] = rotate((fx * start.width) / 2, (fy * start.height) / 2, start.rotation)
  const [qx, qy] = rotate((fx * width) / 2, (fy * height) / 2, rotation)
  return { cx: start.cx + px - qx, cy: start.cy + py - qy }
}

/**
 * Los valores que salen de mover, girar o cambiar de tamaño la caja de un elemento.
 * `frame` es la esquina y el ancho (px) de `.section__content`.
 * - De la sección: x, y son el desplazamiento (lo que se movió el centro); el tamaño son las
 *   escalas, cada una con su eje (un lado estira solo uno; una esquina, los dos igual).
 * - Agregado: x, y son su esquina superior izquierda; el tamaño es el ancho (y el alto en
 *   imagen y forma si se deformó). En un texto, una esquina cambia la letra y el ancho juntos
 *   y su alto lo da el texto (`resize.textHeight`).
 */
export function valuesFromBox(
  start: GestureStart,
  now: ProxyBox,
  frame: { left: number; top: number; width: number },
  resize?: ResizeInfo,
): ArrangeValues {
  if (frame.width <= 0) return {}
  const pct = (px: number) => (px / frame.width) * 100
  const rotation = normalizeAngle(now.rotation)
  if (!start.free) {
    const rw = start.box.width > 0 ? now.width / start.box.width : 1
    const rh = start.box.height > 0 ? now.height / start.box.height : 1
    return {
      x: start.x + pct(now.cx - start.box.cx),
      y: start.y + pct(now.cy - start.box.cy),
      rotation,
      scale: start.scale * rw,
      scale_y: start.scaleY * rh,
    }
  }
  const s = start.scale > 0 ? start.scale : 1
  let box = now
  const extra: ArrangeValues = {}
  if (start.kind === 'text') {
    const [dx, dy] = resize?.direction ?? [0, 0]
    if (resize && resize.textHeight !== undefined && (dx !== 0 || dy !== 0)) {
      box = { ...now, height: resize.textHeight, ...anchorTextCenter(start.box, resize.direction, now.width, resize.textHeight, now.rotation) }
    }
    if (resize?.writeSize && dx !== 0 && dy !== 0 && start.size !== undefined && start.box.width > 0) {
      extra.size = start.size * (now.width / start.box.width)
    }
  } else if (start.kind === 'image' || start.kind === 'shape') {
    const was = start.box.height > 0 ? start.box.width / start.box.height : 1
    const is = now.height > 0 ? now.width / now.height : 1
    if (start.sized || Math.abs(is - was) / was > 0.005) extra.height = pct(now.height / s)
  }
  const layoutW = box.width / s
  const layoutH = box.height / s
  return {
    x: pct(box.cx - layoutW / 2 - frame.left),
    y: pct(box.cy - layoutH / 2 - frame.top),
    width: pct(layoutW),
    rotation,
    ...extra,
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
