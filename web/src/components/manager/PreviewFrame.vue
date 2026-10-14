<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PreviewDisplay } from '@/services/previewProtocol'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La vista previa del editor: la invitación de verdad (un iframe con /gestor/vista-previa)
 * en un marco de celular o de computadora, al tamaño real de esa pantalla y reducida para
 * que quepa. Arriba, cómo se ve: dispositivo, invitado general o personal, elegir o probar,
 * sonido y "Ver como invitado" (el sobre cerrado, como lo recibe un invitado).
 */
const props = defineProps<{
  device: 'phone' | 'desktop'
  display: PreviewDisplay
  ready: boolean
}>()
const emit = defineEmits<{
  device: [device: 'phone' | 'desktop']
  display: [display: Partial<Omit<PreviewDisplay, 'labels'>>]
  replay: []
}>()

const SIZE = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } }
const stage = ref<HTMLElement | null>(null)
const frame = ref<HTMLIFrameElement | null>(null)
const space = ref({ width: 600, height: 800 })
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!stage.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    space.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  observer.observe(stage.value)
})
onBeforeUnmount(() => observer?.disconnect())

const view = computed(() => {
  const base = SIZE[props.device]
  const pad = props.device === 'phone' ? 28 : 16
  const scale = Math.min(
    1,
    (space.value.width - pad * 2) / base.width,
    props.device === 'phone' ? (space.value.height - pad * 2) / base.height : 1,
  )
  // En computadora la pantalla llena el alto que queda (a escala).
  const height =
    props.device === 'desktop' ? Math.max(480, (space.value.height - pad * 2) / scale) : base.height
  return { scale, width: base.width, height }
})

defineExpose({ frame })
</script>

<template>
  <div class="preview">
    <div class="preview__bar" role="toolbar" aria-label="Vista previa">
      <div class="g-segmented" aria-label="Pantalla">
        <button
          type="button"
          :aria-pressed="device === 'phone'"
          title="Celular"
          @click="emit('device', 'phone')"
        >
          <ManagerIcon name="mobile-screen" />
          <span class="preview__label preview__label--device">Celular</span>
        </button>
        <button
          type="button"
          :aria-pressed="device === 'desktop'"
          title="Computadora"
          @click="emit('device', 'desktop')"
        >
          <ManagerIcon name="desktop" />
          <span class="preview__label preview__label--device">Computadora</span>
        </button>
      </div>
      <div class="g-segmented" aria-label="Al tocar la vista previa">
        <button
          type="button"
          :aria-pressed="display.mode === 'select'"
          title="Un toque elige la sección o el texto"
          @click="emit('display', { mode: 'select' })"
        >
          <ManagerIcon name="hand-pointer" /> <span class="preview__label">Elegir</span>
        </button>
        <button
          type="button"
          :aria-pressed="display.mode === 'try'"
          title="La invitación funciona de verdad (botones, formulario)"
          @click="emit('display', { mode: 'try' })"
        >
          <ManagerIcon name="play" /> <span class="preview__label">Probar</span>
        </button>
      </div>
      <select
        class="g-select preview__guest"
        :value="display.guest"
        aria-label="Como quién se ve"
        title="Enlace personal: una invitación de ejemplo con 4 lugares, para ver la confirmación"
        @change="
          emit('display', {
            guest: ($event.target as HTMLSelectElement).value as PreviewDisplay['guest'],
          })
        "
      >
        <option value="general">Enlace general</option>
        <option value="personal">Enlace personal</option>
      </select>
      <button
        type="button"
        class="g-icon-btn"
        :class="{ 'is-active': !display.muted }"
        :aria-label="display.muted ? 'Activar el sonido' : 'Silenciar'"
        :title="display.muted ? 'Sin sonido' : 'Con sonido'"
        @click="emit('display', { muted: !display.muted })"
      >
        <ManagerIcon :name="display.muted ? 'volume-xmark' : 'volume-high'" />
      </button>
      <span class="g-grow" />
      <button
        type="button"
        class="g-btn g-btn--small"
        title="Con el sobre cerrado, como lo recibe un invitado"
        @click="emit('replay')"
      >
        <ManagerIcon name="envelope" /> Ver como invitado
      </button>
      <button
        v-if="display.envelope === 'closed'"
        type="button"
        class="g-btn g-btn--ghost g-btn--small"
        @click="emit('display', { envelope: 'open' })"
      >
        Abrir el sobre
      </button>
    </div>

    <div ref="stage" class="preview__stage" :class="`preview__stage--${device}`">
      <div
        class="preview__device"
        :class="`preview__device--${device}`"
        :style="{ width: `${view.width * view.scale}px`, height: `${view.height * view.scale}px` }"
      >
        <iframe
          ref="frame"
          class="preview__frame"
          src="/gestor/vista-previa"
          title="Vista previa de la invitación"
          :style="{
            width: `${view.width}px`,
            height: `${view.height}px`,
            transform: `scale(${view.scale})`,
          }"
        />
        <div v-if="!ready" class="preview__loading">
          <ManagerIcon name="spinner" spin /> Preparando la vista previa…
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(60% 50% at 50% 0%, rgb(255 255 255 / 0.9) 0%, transparent 70%), #e9ebf0;
}
.preview__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--g-line);
  background: rgb(255 255 255 / 0.7);
  backdrop-filter: blur(8px);
}
.preview__guest {
  width: auto;
  min-height: 32px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 12.5px;
}
.preview__stage {
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
}
.preview__stage--desktop {
  place-items: start center;
  padding-top: 16px;
}
.preview__device {
  position: relative;
  overflow: hidden;
  background: #fff;
  box-shadow:
    0 24px 60px rgb(15 23 42 / 0.22),
    0 0 0 1px rgb(15 23 42 / 0.08);
}
.preview__device--phone {
  border-radius: 30px;
  outline: 10px solid #111827;
}
.preview__device--desktop {
  border-radius: 10px;
}
.preview__frame {
  display: block;
  border: 0;
  background: #fff;
  transform-origin: 0 0;
}
.preview__loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  grid-auto-flow: column;
  gap: 8px;
  background: #fff;
  color: var(--g-faint);
}
/* Con poco espacio, primero se quitan los textos del dispositivo (los íconos se entienden). */
@media (max-width: 1599px) {
  .preview__label--device {
    display: none;
  }
}
@media (max-width: 1360px) {
  .preview__label {
    display: none;
  }
}
</style>
