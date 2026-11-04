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
  props: string[]
  display: string | null
}

/**
 * Aplica el lienzo a los bloques que la sección ya pinta: `translate`, `rotate`, `scale`,
 * `opacity` y `visibility` en línea (propiedades individuales, nunca `transform`, que es de
 * los efectos; tampoco mueven el flujo). Un `span` en línea pasa a `inline-block` para que le
 * hagan caso. Reaplica si Vue vuelve a pintar (MutationObserver) o cambia el ancho, y lo
 * deja todo como estaba al desmontar. Sin elementos con `objetivo`, no observa nada.
 */
export function useSectionCanvas(
  root: Ref<HTMLElement | null>,
  canvas: Ref<CanvasElement[] | undefined>,
): void {
  const desktop = useCanvasDesktop()
  const width = ref(0)
  const applied = new Map<HTMLElement, Applied>()
  let resize: ResizeObserver | undefined
  let mutations: MutationObserver | undefined
  let frame = 0

  const content = () => root.value?.querySelector<HTMLElement>('.section__content') ?? null

  function release(el: HTMLElement, state: Applied): void {
    for (const prop of state.props) el.style.removeProperty(prop)
    if (state.display !== null) el.style.display = state.display
  }

  function clear(): void {
    for (const [el, state] of applied) release(el, state)
    applied.clear()
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
      for (const element of elements) {
        const found = targets.find((t) => t.target === element.target)
        if (!found) continue
        const style = existingStyle(resolveCanvas(element, desktop.value), width.value)
        const state: Applied = { props: Object.keys(style), display: null }
        if (state.props.length && getComputedStyle(found.el).display === 'inline') {
          state.display = found.el.style.display
          found.el.style.display = 'inline-block'
        }
        for (const [prop, value] of Object.entries(style)) found.el.style.setProperty(prop, value)
        applied.set(found.el, state)
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
        (r) => r.type === 'childList' || (r.target instanceof HTMLElement && applied.has(r.target)),
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
