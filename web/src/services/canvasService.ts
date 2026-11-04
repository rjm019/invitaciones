import type { CanvasElement, CanvasValues } from '@/types/event'

/**
 * Lienzo de una sección (lógica pura): qué valores tocan según el ancho de la pantalla y los
 * estilos que de ahí salen. Manda el celular; en escritorio (desde 64 rem, el mismo corte de
 * InvitationRenderer) cada valor `desktop` pisa al del celular y, si falta, hereda de él.
 *
 * Unidades: x, y y ancho son % del ancho de `.section__content`. Un elemento que ya existe
 * (`target`) se desplaza desde donde está; uno libre (`kind`) se coloca desde la esquina
 * superior izquierda de ese contenedor.
 */

/** Pantallas anchas: el mismo corte de escritorio de la página. */
export const DESKTOP_QUERY = '(min-width: 64rem)'

/** Elementos libres que se pueden agregar a un lienzo. */
export const FREE_KINDS = ['text', 'image', 'shape'] as const

/** Valores finales de un elemento en este ancho. */
export interface ResolvedCanvas {
  x: number
  y: number
  /** null = el elemento usa su ancho natural (o el que le da el servicio para los libres). */
  width: number | null
  /** % del ancho del contenedor (imagen y forma libres); null = conserva su proporción. */
  height: number | null
  rotation: number
  scale: number
  /** Escala vertical de un elemento que ya existe; null = igual a `scale`. */
  scaleY: number | null
  /** 0 a 100; null = sin tocar. */
  opacity: number | null
  hidden: boolean
  /** Elemento que ya existe, quitado (display: none): libera su espacio. */
  removed: boolean
  flipH: boolean
  flipV: boolean
  layer: number
}

/** Destino de un elemento que ya existe. */
export type CanvasTargetRef =
  { kind: 'text'; block: string; index: number } | { kind: 'image'; index: number }

/** "texto:title:0" → { kind: 'text', block: 'title', index: 0 }; "imagen:2" → { kind: 'image', index: 2 }. */
export function parseTarget(target: string | undefined): CanvasTargetRef | null {
  const text = /^texto:([a-z0-9_]{1,40}):(\d{1,3})$/.exec(target ?? '')
  if (text) return { kind: 'text', block: text[1], index: Number(text[2]) }
  const image = /^imagen:(\d{1,3})$/.exec(target ?? '')
  return image ? { kind: 'image', index: Number(image[1]) } : null
}

export function targetName(ref: CanvasTargetRef): string {
  return ref.kind === 'text' ? `texto:${ref.block}:${ref.index}` : `imagen:${ref.index}`
}

/** Los valores que tocan en este ancho: los de escritorio encima de los del celular. */
export function resolveCanvas(element: CanvasElement, desktop: boolean): ResolvedCanvas {
  const pick = <K extends keyof CanvasValues>(key: K): CanvasValues[K] =>
    desktop && element.desktop?.[key] !== undefined ? element.desktop[key] : element[key]
  return {
    x: pick('x') ?? 0,
    y: pick('y') ?? 0,
    width: pick('width') ?? null,
    height: pick('height') ?? null,
    rotation: pick('rotation') ?? 0,
    scale: pick('scale') ?? 1,
    scaleY: pick('scale_y') ?? null,
    opacity: pick('opacity') ?? null,
    hidden: pick('hidden') ?? false,
    removed: pick('removed') ?? false,
    flipH: element.flip_h ?? false,
    flipV: element.flip_v ?? false,
    layer: element.layer ?? 0,
  }
}

const round = (n: number) => Math.round(n * 100) / 100

/** % del ancho del contenedor → px (la medida con la que el desplazamiento sigue la proporción). */
export function percentToPx(percent: number, containerWidth: number): number {
  return round((percent / 100) * containerWidth)
}

/**
 * Propiedades CSS individuales (translate, rotate, scale, opacity, visibility) de un elemento
 * que ya existe (`scale` lleva la horizontal y la vertical; quitado = solo `display: none`). Nunca `transform`: es de los efectos. Solo salen las que cambian algo.
 * Sin ancho medido (0) no hay con qué convertir el desplazamiento y no se mueve.
 */
export function existingStyle(r: ResolvedCanvas, containerWidth: number): Record<string, string> {
  // Quitado: ya no ocupa lugar (display: none); nada más importa.
  if (r.removed) return { display: 'none' }
  const out: Record<string, string> = {}
  const dx = percentToPx(r.x, containerWidth)
  const dy = percentToPx(r.y, containerWidth)
  if (dx !== 0 || dy !== 0) out.translate = `${dx}px ${dy}px`
  if (r.rotation !== 0) out.rotate = `${r.rotation}deg`
  const scaleY = r.scaleY ?? r.scale
  if (r.scale !== 1 || scaleY !== 1 || r.flipH || r.flipV) {
    out.scale = `${r.flipH ? -r.scale : r.scale} ${r.flipV ? -scaleY : scaleY}`
  }
  if (r.opacity !== null) out.opacity = String(round(r.opacity / 100))
  if (r.hidden) out.visibility = 'hidden'
  return out
}

/** Un color de la config (hex o token de la paleta) como valor CSS. */
export function canvasColor(color: string | undefined): string | undefined {
  if (!color) return undefined
  return color.startsWith('#') ? color : `var(--color-${color})`
}

/** Los elementos libres, de abajo hacia arriba (por capa; a igual capa, por su orden). */
export function freeElements(canvas: CanvasElement[] | undefined): CanvasElement[] {
  return (canvas ?? [])
    .map((element, order) => ({ element, order }))
    .filter(({ element }) => !element.target && !!element.kind)
    .sort((a, b) => (a.element.layer ?? 0) - (b.element.layer ?? 0) || a.order - b.order)
    .map(({ element }) => element)
}

/** Los que acomodan algo que ya existe en la sección. */
export function targetElements(canvas: CanvasElement[] | undefined): CanvasElement[] {
  return (canvas ?? []).filter((element) => !!parseTarget(element.target))
}

/** ¿La sección acomoda algo? (activa el recorte en su orilla). */
export function hasCanvas(canvas: CanvasElement[] | undefined): boolean {
  return freeElements(canvas).length > 0 || targetElements(canvas).length > 0
}

/** Ancho que toma un elemento libre si no trae el suyo (% del contenedor). */
const FREE_WIDTH = { text: 50, image: 30, shape: 30 } as const

/** ¿Un elemento libre admite alto propio? Imagen y forma (menos la línea: su alto es su grosor). */
export function hasFreeHeight(element: CanvasElement): boolean {
  return element.kind === 'image' || (element.kind === 'shape' && element.shape !== 'line')
}

/**
 * Variables CSS de un elemento libre (las lee CanvasLayer.vue): la posición y el ancho en
 * % del ancho del contenedor, el giro, la escala con volteo, la opacidad y su aspecto.
 */
export function freeVars(element: CanvasElement, desktop: boolean): Record<string, string> {
  const r = resolveCanvas(element, desktop)
  const vars: Record<string, string> = {
    '--cv-x': String(r.x),
    '--cv-y': String(r.y),
    '--cv-w': String(r.width ?? FREE_WIDTH[element.kind ?? 'text']),
    '--cv-rotate': `${r.rotation}deg`,
    '--cv-scale-x': String(r.flipH ? -r.scale : r.scale),
    '--cv-scale-y': String(r.flipV ? -r.scale : r.scale),
    '--cv-layer': String(r.layer),
  }
  if (r.height !== null && hasFreeHeight(element)) vars['--cv-h'] = String(r.height)
  if (r.opacity !== null) vars['--cv-opacity'] = String(round(r.opacity / 100))
  if (element.size !== undefined) vars['--cv-size'] = String(element.size)
  if (element.radius !== undefined) vars['--cv-radius'] = `${element.radius}%`
  if (element.border !== undefined) vars['--cv-border'] = `${element.border}px`
  const color = canvasColor(element.color)
  if (color) vars['--cv-color'] = color
  if (element.font) vars['--cv-font'] = `'${element.font}', var(--font-serif)`
  if (element.align) vars['--cv-align'] = element.align
  return vars
}
