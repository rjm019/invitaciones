import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import {
  readFromPreview,
  type ArrangeBlock,
  type ArrangeChange,
  type ArrangeCopy,
  type ArrangeFrame,
  type ArrangeMeasure,
  wrap,
  type PreviewDisplay,
  type PreviewPatch,
  type ToPreview,
} from '@/services/previewProtocol'
import type { EventConfig } from '@/types/event'

export interface PreviewHandlers {
  /** La vista previa (re)cargó y ya tiene la config: lo que no va en ella se manda aquí. */
  onReady?: () => void
  onPick?: (key: string, block: string | null) => void
  onHover?: (key: string | null, block: string | null) => void
  onRendered?: (keys: string[]) => void
  onTokens?: (colors: Record<string, string>, fonts: Record<string, string>) => void
  /** «Acomodar»: lo elegido en la vista previa, con sus medidas. */
  onArrangeSelect?: (
    section: string | null,
    refs: string[],
    measures: Record<string, ArrangeMeasure>,
    frame: ArrangeFrame | null,
    blocks: ArrangeBlock[],
    copies: Record<string, ArrangeCopy>,
  ) => void
  /** «Acomodar»: se soltó un arrastre (o una flecha): los valores nuevos. */
  onArrangeChange?: (section: string, changes: ArrangeChange[], nudge: boolean) => void
  /** Pulsar y mover sobre un elemento en «Elegir»: pasar a «Acomodar» con ese elemento elegido. */
  onArrangeBegin?: (section: string, ref: string) => void
  /** Doble clic: el texto editado en el lugar. */
  onEditCommit?: (section: string, ref: string, text: string) => void
  /** Doble clic en un texto que sale de otro dato: abrir el campo que lo controla. */
  onEditOpen?: (section: string, block: string, text: string) => void
  /** Una tecla que el foco en la vista previa no deja llegar al editor (⌘Z, Supr…). */
  onKey?: (key: string, meta: boolean, shift: boolean) => void
}

/**
 * El editor del lado de su vista previa (el iframe /gestor/vista-previa): le manda la
 * config, el estilo y los textos al instante y qué sección mostrar, y escucha qué tocó la
 * persona. Solo acepta mensajes de ese iframe, del mismo origen y con forma conocida. Si el
 * iframe se recarga, le vuelve a mandar lo último en cuanto avisa que está listo.
 */
export function usePreviewHost(
  frame: Ref<HTMLIFrameElement | null>,
  handlers: PreviewHandlers = {},
) {
  const ready = ref(false)
  let last: { config: EventConfig; display: PreviewDisplay } | null = null

  function post(message: ToPreview): void {
    frame.value?.contentWindow?.postMessage(wrap(message), location.origin)
  }

  function onMessage(e: MessageEvent): void {
    if (e.origin !== location.origin || !frame.value || e.source !== frame.value.contentWindow)
      return
    const message = readFromPreview(e.data)
    if (!message) return
    switch (message.type) {
      case 'ready':
        ready.value = true
        if (last) post({ type: 'config', ...last })
        handlers.onReady?.()
        break
      case 'rendered':
        handlers.onRendered?.(message.keys)
        break
      case 'hover':
        handlers.onHover?.(message.key, message.block)
        break
      case 'pick':
        handlers.onPick?.(message.key, message.block)
        break
      case 'tokens':
        handlers.onTokens?.(message.colors, message.fonts)
        break
      case 'arrange-select':
        handlers.onArrangeSelect?.(
          message.section,
          message.refs,
          message.measures,
          message.frame,
          message.blocks,
          message.copies,
        )
        break
      case 'arrange-change':
        handlers.onArrangeChange?.(message.section, message.changes, message.nudge)
        break
      case 'key':
        handlers.onKey?.(message.key, message.meta, message.shift)
        break
      case 'arrange-begin':
        handlers.onArrangeBegin?.(message.section, message.ref)
        break
      case 'edit-commit':
        handlers.onEditCommit?.(message.section, message.ref, message.text)
        break
      case 'edit-open':
        handlers.onEditOpen?.(message.section, message.block, message.text)
        break
    }
  }

  function sendConfig(config: EventConfig, display: PreviewDisplay): void {
    last = { config, display }
    if (ready.value) post({ type: 'config', config, display })
  }

  function sendDisplay(display: PreviewDisplay): void {
    if (last) last = { ...last, display }
    if (ready.value) post({ type: 'display', display })
  }

  function sendPatch(patch: PreviewPatch): void {
    if (ready.value) post({ type: 'patch', patch })
  }

  function select(key: string | null): void {
    if (ready.value) post({ type: 'select', key })
  }

  function arrangeSelect(section: string | null, refs: string[]): void {
    if (ready.value) post({ type: 'arrange-select', section, refs })
  }

  function replay(): void {
    if (ready.value) post({ type: 'replay' })
  }

  /** El iframe se va a recargar: hasta que avise, no se le manda nada. */
  function reset(): void {
    ready.value = false
  }

  // Otro iframe (se volvió a montar) o ninguno: hasta que avise, no se le manda nada.
  watch(frame, (next, previous) => {
    if (next !== previous) ready.value = false
  })

  onMounted(() => window.addEventListener('message', onMessage))
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))

  return { ready, sendConfig, sendDisplay, sendPatch, select, arrangeSelect, replay, reset }
}
