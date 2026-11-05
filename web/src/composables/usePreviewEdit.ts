import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { canvasHitAt, listCanvasTargets, type CanvasHit } from '@/composables/useSectionCanvas'
import { realText } from '@/services/realTextService'

/** El texto que se está escribiendo en su lugar (null si ninguno). Lo leen «Elegir» y «Acomodar». */
export const inlineEditEl = shallowRef<HTMLElement | null>(null)
export const inlineEditing = computed(() => inlineEditEl.value !== null)

/** Lo que dice un texto al leerlo editado: saltos de línea de verdad, sin espacios duros. */
export function readEdited(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  clone.querySelectorAll('div, p').forEach((block) => {
    if (block.previousSibling) block.prepend('\n')
  })
  return (clone.textContent ?? '').replace(/ /g, ' ').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n')
}

export interface PreviewEditDeps {
  /** Se puede editar (todos los modos menos «Probar»). */
  enabled: () => boolean
  /** ¿El bloque de esta sección se escribe en un campo suyo? */
  editable: (section: string, block: string) => boolean
  /** Nodos del editor que no cuentan (el velo y la caja de «Acomodar»). */
  skip: (node: HTMLElement) => boolean
  commit: (section: string, ref: string, text: string) => void
  open: (section: string, block: string, text: string) => void
  /** Empezó o terminó una edición (quita o devuelve las cajas de «Acomodar»). */
  onChange?: (editing: boolean, section: string | null) => void
}

const DOUBLE_TAP_MS = 400
const TAP_MS = 350
const TAP_SLOP = 12

/**
 * Doble clic (o doble toque) sobre un texto de la invitación: lo escribe en su lugar. El
 * texto se muestra tal cual (sin las letras partidas de los efectos) y al salir se devuelve
 * el DOM original para que Vue lo vuelva a pintar. Enter guarda, Shift+Enter hace salto de
 * línea, Esc cancela y un clic afuera guarda. Los textos que no se escriben en la sección
 * (nombres, fecha…) no se editan: `open` lleva al campo que los controla.
 */
export function usePreviewEdit(deps: PreviewEditDeps): void {
  let saved: ChildNode[] = []
  let original = ''
  let target: { section: string; ref: string } | null = null
  let previousWhiteSpace = ''
  let finishing = false

  function textHit(x: number, y: number): (CanvasHit & { kind: 'text'; block: string | null }) | null {
    const hit = canvasHitAt(x, y, deps.skip)
    if (!hit) return null
    if (hit.ref.startsWith('lienzo-')) {
      return hit.el.classList.contains('canvas-el--text') ? { ...hit, kind: 'text', block: null } : null
    }
    const found = listCanvasTargets(hit.section).find((t) => t.el === hit.el)
    return found?.kind === 'text' ? { ...hit, kind: 'text', block: found.block ?? null } : null
  }

  function begin(x: number, y: number): boolean {
    if (!deps.enabled() || inlineEditEl.value) return false
    const hit = textHit(x, y)
    if (!hit) return false
    const section = hit.section.dataset.sectionKey ?? ''
    if (!section) return false
    if (hit.block && !deps.editable(section, hit.block)) {
      deps.open(section, hit.block, realText(hit.el, { lines: true }).slice(0, 600))
      return true
    }
    const el = hit.el
    original = hit.block ? realText(el, { lines: true }) : (el.textContent ?? '')
    saved = [...el.childNodes]
    previousWhiteSpace = el.style.whiteSpace
    el.replaceChildren(document.createTextNode(original))
    el.style.whiteSpace = 'pre-wrap'
    el.classList.add('is-inline-editing')
    el.setAttribute('contenteditable', 'plaintext-only')
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
    el.spellcheck = false
    target = { section, ref: hit.ref }
    finishing = false
    inlineEditEl.value = el
    deps.onChange?.(true, section)
    el.addEventListener('keydown', onKeydown)
    el.addEventListener('paste', onPaste)
    document.addEventListener('pointerdown', onOutside, true)
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    return true
  }

  function finish(save: boolean): void {
    const el = inlineEditEl.value
    if (!el || finishing) return
    finishing = true
    const text = readEdited(el)
    el.removeEventListener('keydown', onKeydown)
    el.removeEventListener('paste', onPaste)
    document.removeEventListener('pointerdown', onOutside, true)
    el.removeAttribute('contenteditable')
    el.classList.remove('is-inline-editing')
    el.style.whiteSpace = previousWhiteSpace
    el.replaceChildren(...saved)
    window.getSelection()?.removeAllRanges()
    const done = target
    saved = []
    target = null
    inlineEditEl.value = null
    deps.onChange?.(false, done?.section ?? null)
    if (save && done && text.trim() !== original.trim()) deps.commit(done.section, done.ref, text)
  }

  function onKeydown(e: KeyboardEvent): void {
    // Mientras se escribe, nada de lo del editor actúa (Supr, flechas, ⌘D, tiradores).
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
    } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      finish(true)
    }
  }

  /** Pegar siempre texto plano. */
  function onPaste(e: ClipboardEvent): void {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    document.execCommand('insertText', false, text)
  }

  function onOutside(e: Event): void {
    const el = inlineEditEl.value
    if (el && !(e.target instanceof Node && el.contains(e.target))) finish(true)
  }

  function onDblClick(e: MouseEvent): void {
    if (begin(e.clientX, e.clientY)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // Doble toque: dos toques cortos y juntos (con el dedo no llega `dblclick` si se cancela el toque).
  let touch: { x: number; y: number; t: number } | null = null
  let lastTap: { x: number; y: number; t: number } | null = null
  function onTouchStart(e: TouchEvent): void {
    const p = e.touches[0]
    touch = e.touches.length === 1 && p ? { x: p.clientX, y: p.clientY, t: performance.now() } : null
  }
  function onTouchEnd(e: TouchEvent): void {
    const p = e.changedTouches[0]
    const start = touch
    touch = null
    if (!p || !start || inlineEditEl.value) return
    const now = performance.now()
    if (now - start.t > TAP_MS || Math.hypot(p.clientX - start.x, p.clientY - start.y) > TAP_SLOP) {
      lastTap = null
      return
    }
    if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(p.clientX - lastTap.x, p.clientY - lastTap.y) < TAP_SLOP * 2) {
      lastTap = null
      if (begin(p.clientX, p.clientY) && e.cancelable) e.preventDefault()
      return
    }
    lastTap = { x: p.clientX, y: p.clientY, t: now }
  }

  window.addEventListener('dblclick', onDblClick, true)
  window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  window.addEventListener('touchend', onTouchEnd, { capture: true, passive: false })
  onBeforeUnmount(() => {
    window.removeEventListener('dblclick', onDblClick, true)
    window.removeEventListener('touchstart', onTouchStart, true)
    window.removeEventListener('touchend', onTouchEnd, true)
    finish(false)
  })
}
