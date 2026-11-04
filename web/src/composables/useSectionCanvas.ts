import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import {
  DESKTOP_QUERY,
  existingStyle,
  parseTarget,
  resolveCanvas,
  targetElements,
  type CanvasTargetRef,
} from '@/services/canvasService'
import type { CanvasElement } from '@/types/event'

/** Un bloque de la sección que el lienzo puede acomodar. */
export interface CanvasTarget {
  /** "texto:title:0" o "imagen:1": lo que se escribe en `objetivo`. */
  target: string
  kind: 'text' | 'image'
  /** Bloque de texto (`data-text`), solo en los textos. */
  block?: string
  /** Orden entre los del mismo bloque (o entre las imágenes). */
  index: number
  el: HTMLElement
}

/**
 * El editor lo prende mientras se arrastra un elemento (modo «Acomodar»): los estilos que
 * se escriben a mano en ese momento no los pisa el lienzo; al apagarlo se acomoda de nuevo.
 */
export const canvasPaused = ref(false)

/** Lo que pinta el lienzo no se vuelve a acomodar a sí mismo. */
const LAYER = '[data-canvas-layer]'

/**
 * Los bloques que se pueden acomodar en una sección, en orden de aparición: cada
 * `[data-text="<bloque>"]` (numerado dentro de su bloque) y cada `<img>`. Es la forma de
 * nombrar un elemento (`objetivo`) y la que usará el editor para saber qué hay en pantalla.
 */
export function listCanvasTargets(root: ParentNode): CanvasTarget[] {
  const out: CanvasTarget[] = []
  const seen: Record<string, number> = {}
  for (const el of root.querySelectorAll<HTMLElement>('[data-text]')) {
    if (el.closest(LAYER)) continue
    const block = el.dataset.text ?? ''
    if (!/^[a-z0-9_]{1,40}$/.test(block)) continue
    const index = (seen[block] = (seen[block] ?? -1) + 1)
    out.push({ target: `texto:${block}:${index}`, kind: 'text', block, index, el })
  }
  let image = 0
  for (const el of root.querySelectorAll<HTMLImageElement>('img')) {
    if (el.closest(LAYER)) continue
    out.push({ target: `imagen:${image}`, kind: 'image', index: image, el })
    image++
  }
  return out
}

/** El elemento de la sección que nombra un `objetivo`, o null si no está (o no es un objetivo). */
export function findCanvasTarget(root: ParentNode, target: string): HTMLElement | null {
  const ref: CanvasTargetRef | null = parseTarget(target)
  if (!ref) return null
  return listCanvasTargets(root).find((t) => t.target === target)?.el ?? null
}

/** true en pantallas anchas (desde 64 rem); reacciona si cambia. */
export function useCanvasDesktop(): Ref<boolean> {
  const query = typeof matchMedia === 'function' ? matchMedia(DESKTOP_QUERY) : null
  const desktop = ref(query?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => (desktop.value = e.matches)
  query?.addEventListener('change', onChange)
  onBeforeUnmount(() => query?.removeEventListener('change', onChange))
  return desktop
}

interface Applied {
  /** Lo que había escrito en línea antes (propiedad → valor; '' = nada): es lo que se restaura. */
  saved: Map<string, string>
}

/** ¿Este elemento forma su propio contexto de apilamiento? (atrapa el z-index de sus hijos) */
export function formsStackingContext(el: Element): boolean {
  const cs = getComputedStyle(el)
  const positioned = !!cs.position && cs.position !== 'static'
  if (cs.position === 'fixed' || cs.position === 'sticky') return true
  if (positioned && cs.zIndex !== 'auto') return true
  if (cs.opacity !== '' && Number(cs.opacity) < 1) return true
  for (const prop of ['transform', 'translate', 'rotate', 'scale', 'filter', 'backdropFilter', 'perspective', 'clipPath', 'maskImage']) {
    const value = (cs as unknown as Record<string, string | undefined>)[prop]
    if (value && value !== 'none') return true
  }
  if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return true
  if (cs.isolation === 'isolate') return true
  if (/opacity|transform|filter|translate|rotate|scale/.test(cs.willChange)) return true
  if (/paint|layout|strict|content/.test(cs.contain)) return true
  if (cs.containerType && cs.containerType !== 'normal') return true
  const parent = el.parentElement ? getComputedStyle(el.parentElement).display : ''
  return /flex|grid/.test(parent) && cs.zIndex !== 'auto'
}

/**
 * Aplica el lienzo a los bloques que la sección ya pinta: `translate`, `rotate`, `scale`,
 * `opacity` y `visibility` en línea (propiedades individuales, nunca `transform`, que es de
 * los efectos; tampoco mueven el flujo). Un `span` en línea pasa a `inline-block` para que le
 * hagan caso; un elemento quitado (`removed`) es `display: none` y libera su espacio. Con una
 * `capa` distinta de 0 el bloque recibe `z-index` (y `position: relative` si era estático) y,
 * como un contexto de apilamiento atrapa a sus hijos, cada ancestro que lo forme, hasta
 * `.section__content`, recibe el mismo `z-index`. Reaplica si Vue vuelve a pintar
 * (MutationObserver) o cambia el ancho, y lo deja todo como estaba al desmontar. Sin
 * elementos con `objetivo`, no observa nada.
 */
export function useSectionCanvas(
  root: Ref<HTMLElement | null>,
  canvas: Ref<CanvasElement[] | undefined>,
): void {
  const desktop = useCanvasDesktop()
  const width = ref(0)
  const applied = new Map<HTMLElement, Applied>()
  /** Los bloques acomodados (no sus ancestros): sus cambios de estilo sí piden reaplicar. */
  const watched = new Set<HTMLElement>()
  let resize: ResizeObserver | undefined
  let mutations: MutationObserver | undefined
  let frame = 0

  const content = () => root.value?.querySelector<HTMLElement>('.section__content') ?? null

  /** Escribe una propiedad en línea guardando lo que había, para devolverlo en `release`. */
  function write(el: HTMLElement, prop: string, value: string): void {
    let state = applied.get(el)
    if (!state) applied.set(el, (state = { saved: new Map() }))
    if (!state.saved.has(prop)) state.saved.set(prop, el.style.getPropertyValue(prop))
    el.style.setProperty(prop, value)
  }

  function release(el: HTMLElement, state: Applied): void {
    for (const [prop, before] of state.saved) {
      if (before === '') el.style.removeProperty(prop)
      else el.style.setProperty(prop, before)
    }
  }

  function clear(): void {
    for (const [el, state] of applied) release(el, state)
    applied.clear()
    watched.clear()
  }

  /** Sube `layer` al bloque y a cada ancestro que forme contexto, hasta `.section__content`. */
  function raise(el: HTMLElement, layer: number, stops: HTMLElement | null, chain: Map<HTMLElement, number>): void {
    const own = chain.get(el)
    chain.set(el, own === undefined ? layer : Math.max(own, layer))
    for (let up = el.parentElement; up && up !== stops && up !== root.value; up = up.parentElement) {
      if (!formsStackingContext(up)) continue
      const seen = chain.get(up)
      chain.set(up, seen === undefined ? layer : Math.max(seen, layer))
    }
  }

  function apply(): void {
    frame = 0
    const section = root.value
    if (!section) return
    const elements = targetElements(canvas.value)
    // Pausa al observador: lo que se escribe aquí no lo despierta de nuevo.
    mutations?.disconnect()
    clear()
    if (elements.length && width.value > 0) {
      const targets = listCanvasTargets(section)
      const stops = content()
      const layers = new Map<HTMLElement, number>()
      for (const element of elements) {
        const found = targets.find((t) => t.target === element.target)
        if (!found) continue
        const resolved = resolveCanvas(element, desktop.value)
        const style = existingStyle(resolved, width.value)
        if (
          !resolved.removed &&
          Object.keys(style).length &&
          getComputedStyle(found.el).display === 'inline'
        ) {
          write(found.el, 'display', 'inline-block')
        }
        for (const [prop, value] of Object.entries(style)) write(found.el, prop, value)
        watched.add(found.el)
        if (resolved.layer !== 0 && !resolved.removed) raise(found.el, resolved.layer, stops, layers)
      }
      for (const [el, layer] of layers) {
        const cs = getComputedStyle(el)
        const parentDisplay = el.parentElement ? getComputedStyle(el.parentElement).display : ''
        if ((!cs.position || cs.position === 'static') && !/flex|grid/.test(parentDisplay)) write(el, 'position', 'relative')
        write(el, 'z-index', String(layer))
      }
    }
    observe()
  }

  function schedule(): void {
    if (frame || typeof requestAnimationFrame !== 'function') return
    frame = requestAnimationFrame(apply)
  }

  function observe(): void {
    if (!root.value || !targetElements(canvas.value).length) return
    mutations ??= new MutationObserver((records) => {
      // Un cambio de estilo ajeno (efectos, parallax) no pide nada; Vue al repintar sí.
      const relevant = records.some(
        (r) => r.type === 'childList' || (r.target instanceof HTMLElement && watched.has(r.target)),
      )
      if (relevant && !canvasPaused.value) schedule()
    })
    mutations.observe(root.value, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-text', 'src'],
    })
  }

  onMounted(() => {
    const el = content()
    if (el && typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0
        if (Math.abs(w - width.value) >= 1) width.value = Math.round(w)
      })
      resize.observe(el)
    } else if (el) {
      width.value = Math.round(el.getBoundingClientRect().width)
    }
    apply()
  })

  watch([canvas, desktop, width], apply, { deep: true, flush: 'post' })
  watch(canvasPaused, (paused) => {
    if (!paused) schedule()
  })

  onBeforeUnmount(() => {
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    frame = 0
    resize?.disconnect()
    mutations?.disconnect()
    clear()
  })
}
