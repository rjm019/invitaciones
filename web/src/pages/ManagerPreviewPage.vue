<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import PreviewStage from '@/components/manager/PreviewStage.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import {
  readToPreview,
  wrap,
  type FromPreview,
  type PreviewDisplay,
  type PreviewPatch,
} from '@/services/previewProtocol'
import { applyPreviewPatch } from '@/services/previewService'
import type { EventConfig } from '@/types/event'

/**
 * /gestor/vista-previa: la invitación dentro del editor (va en un iframe). El editor le
 * manda la config del borrador y, al instante, el estilo y los textos; ella le avisa qué
 * sección o qué texto tocó la persona, y qué secciones sí se pintaron. Nunca pide nada al
 * servidor por su cuenta: todo llega del editor.
 */
const PALETTE = [
  'bg',
  'text',
  'primary',
  'primary-strong',
  'primary-soft',
  'accent',
  'accent-soft',
  'accent-strong',
  'surface',
  'frame',
  'panel',
  'panel-alt',
  'panel-warm',
  'paper',
]
const FONTS = ['script', 'script-mono', 'serif', 'caps', 'display', 'button', 'engraved']

const config = shallowRef<EventConfig | null>(null)
const display = ref<PreviewDisplay>({
  envelope: 'open',
  guest: 'general',
  muted: true,
  mode: 'select',
  labels: {},
})
const stageKey = ref(0)
const reduced = useReducedMotion()

const selected = ref<string | null>(null)
const hovered = ref<{ key: string; block: string | null } | null>(null)
const rects = ref<{ hover: DOMRect | null; text: DOMRect | null; selected: DOMRect | null }>({
  hover: null,
  text: null,
  selected: null,
})
let hoverEl: HTMLElement | null = null
let textEl: HTMLElement | null = null
/** Una sección recién agregada aún no está en la página: se busca cuando aparezca. */
let pendingScroll: string | null = null

const picking = computed(() => display.value.mode === 'select')
const hoverLabel = computed(() =>
  hovered.value ? (display.value.labels[hovered.value.key] ?? hovered.value.key) : '',
)

function post(message: FromPreview): void {
  if (window.parent !== window) window.parent.postMessage(wrap(message), location.origin)
}

function sectionEl(key: string | null): HTMLElement | null {
  return key ? document.querySelector<HTMLElement>(`[data-section-key="${key}"]`) : null
}

/** El sobre, el invitado o el sonido cambian cómo arranca la invitación: se vuelve a montar. */
function remountFor(next: PreviewDisplay): boolean {
  const now = display.value
  return now.envelope !== next.envelope || now.guest !== next.guest || now.muted !== next.muted
}

function onMessage(e: MessageEvent): void {
  if (e.origin !== location.origin || e.source !== window.parent) return
  const message = readToPreview(e.data)
  if (!message) return
  switch (message.type) {
    case 'config':
      if (config.value && remountFor(message.display)) stageKey.value++
      display.value = message.display
      config.value = message.config
      break
    case 'display':
      if (remountFor(message.display)) stageKey.value++
      display.value = message.display
      break
    case 'patch':
      queuePatch(message.patch)
      break
    case 'select':
      selected.value = message.key
      scrollToSelected()
      break
    case 'replay':
      stageKey.value++
      window.scrollTo(0, 0)
      break
  }
}

/** Lo que llega al instante se aplica una vez por cuadro (con cada tecla, solo lo último). */
let queued: PreviewPatch | null = null
let patchFrame = 0
function queuePatch(patch: PreviewPatch): void {
  queued = patch
  if (patchFrame) return
  patchFrame = requestAnimationFrame(() => {
    patchFrame = 0
    if (config.value && queued) config.value = applyPreviewPatch(config.value, queued)
    queued = null
  })
}

function scrollToSelected(): void {
  const el = sectionEl(selected.value)
  pendingScroll = el ? null : selected.value
  if (!el) return
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.8
  el.scrollIntoView({
    behavior: reduced.value ? 'auto' : 'smooth',
    block: tall ? 'start' : 'center',
  })
}

/** Elegir: un toque en la sección (o en uno de sus textos) la abre en el editor. */
function targetOf(e: Event): { section: HTMLElement | null; text: HTMLElement | null } {
  const target = e.target instanceof Element ? e.target : null
  const section = target?.closest<HTMLElement>('[data-section-key]') ?? null
  const text = target?.closest<HTMLElement>('[data-text]') ?? null
  return { section, text: text && section?.contains(text) ? text : null }
}

function onPointerMove(e: PointerEvent): void {
  if (!picking.value) return
  const { section, text } = targetOf(e)
  hoverEl = section
  textEl = text
  const key = section?.dataset.sectionKey ?? null
  const block = text?.dataset.text ?? null
  if (key !== (hovered.value?.key ?? null) || block !== (hovered.value?.block ?? null)) {
    hovered.value = key ? { key, block } : null
    post({ type: 'hover', key, block })
  }
  measure()
}

function onPointerLeave(): void {
  hoverEl = null
  textEl = null
  if (hovered.value) post({ type: 'hover', key: null, block: null })
  hovered.value = null
  measure()
}

/** En modo elegir, ningún toque llega a la invitación (no abre enlaces ni envía formularios). */
function onPick(e: Event): void {
  if (!picking.value) return
  e.preventDefault()
  e.stopPropagation()
  if (e.type !== 'click') return
  const { section, text } = targetOf(e)
  const key = section?.dataset.sectionKey
  if (!key) return
  selected.value = key
  post({ type: 'pick', key, block: text?.dataset.text ?? null })
  measure()
}

let frame = 0
function measure(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    rects.value = {
      hover: picking.value && hoverEl ? hoverEl.getBoundingClientRect() : null,
      text: picking.value && textEl ? textEl.getBoundingClientRect() : null,
      selected: sectionEl(selected.value)?.getBoundingClientRect() ?? null,
    }
  })
}

const box = (rect: DOMRect | null) =>
  rect
    ? {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }
    : undefined

/** Qué secciones sí se ven (la playlist sin enlace, el hospedaje sin hoteles… no) y los colores del tema. */
let lastRendered = ''
let renderTimer: ReturnType<typeof setTimeout> | undefined
function reportRendered(): void {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    const keys = [...document.querySelectorAll<HTMLElement>('[data-section-key]')]
      .map((el) => el.dataset.sectionKey ?? '')
      .filter(Boolean)
    const joined = keys.join('|')
    if (joined !== lastRendered) {
      lastRendered = joined
      post({ type: 'rendered', keys })
    }
    if (pendingScroll && pendingScroll === selected.value && sectionEl(pendingScroll)) {
      scrollToSelected()
    }
    const style = getComputedStyle(document.documentElement)
    post({
      type: 'tokens',
      colors: Object.fromEntries(
        PALETTE.map((t) => [t, style.getPropertyValue(`--color-${t}`).trim()]),
      ),
      fonts: Object.fromEntries(
        FONTS.map((r) => [r, style.getPropertyValue(`--font-${r}`).trim()]),
      ),
    })
    measure()
  }, 250)
}

const observer =
  typeof MutationObserver === 'undefined' ? null : new MutationObserver(reportRendered)

watch(picking, (on) => {
  document.documentElement.classList.toggle('is-picking', on)
  if (!on) onPointerLeave()
})

onMounted(() => {
  document.title = 'Vista previa'
  window.addEventListener('message', onMessage)
  document.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerleave', onPointerLeave)
  for (const type of ['click', 'pointerdown', 'mousedown', 'submit']) {
    document.addEventListener(type, onPick, true)
  }
  window.addEventListener('scroll', measure, { passive: true })
  window.addEventListener('resize', measure)
  observer?.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'data-theme'],
  })
  document.documentElement.classList.add('is-picking')
  post({ type: 'ready' })
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerleave', onPointerLeave)
  for (const type of ['click', 'pointerdown', 'mousedown', 'submit']) {
    document.removeEventListener(type, onPick, true)
  }
  window.removeEventListener('scroll', measure)
  window.removeEventListener('resize', measure)
  observer?.disconnect()
  cancelAnimationFrame(frame)
  cancelAnimationFrame(patchFrame)
  clearTimeout(renderTimer)
  document.documentElement.classList.remove('is-picking')
})
</script>

<template>
  <PreviewStage v-if="config" :key="stageKey" :event="config" :display="display" />
  <p v-else class="preview-waiting">Cargando la vista previa…</p>

  <div class="preview-overlay" aria-hidden="true">
    <div v-if="rects.selected" class="preview-overlay__selected" :style="box(rects.selected)" />
    <div v-if="rects.hover" class="preview-overlay__hover" :style="box(rects.hover)">
      <span class="preview-overlay__label">✎ Editar {{ hoverLabel }}</span>
    </div>
    <div v-if="rects.text" class="preview-overlay__text" :style="box(rects.text)" />
  </div>
</template>

<style>
/* Estilos del editor (no de la invitación): colores fijos, encima de todo. */
.is-picking body,
.is-picking body * {
  cursor: pointer !important;
}
/* Un toque en Spotify (otro sitio, no lo escuchamos) también elige su sección. */
.is-picking iframe {
  pointer-events: none;
}
.preview-waiting {
  margin: 30vh auto 0;
  font-family: system-ui, sans-serif;
  color: #64748b;
  text-align: center;
}
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}
.preview-overlay__hover,
.preview-overlay__selected,
.preview-overlay__text {
  position: fixed;
  box-sizing: border-box;
  border-radius: 10px;
}
.preview-overlay__selected {
  outline: 3px solid #4f46e5;
  outline-offset: -3px;
}
.preview-overlay__hover {
  outline: 2px solid rgb(79 70 229 / 0.55);
  outline-offset: -2px;
  background: rgb(79 70 229 / 0.04);
}
.preview-overlay__text {
  border-radius: 4px;
  outline: 2px dashed #4f46e5;
  outline-offset: 2px;
}
.preview-overlay__label {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font:
    600 12px/1.6 system-ui,
    sans-serif;
  box-shadow: 0 2px 8px rgb(15 23 42 / 0.25);
  white-space: nowrap;
}
</style>
