<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useScrollLock } from '@/composables/useScrollLock'
import { stepIndex, swipeAction } from '@/services/galleryService'

/**
 * Visor de fotos a pantalla completa: flechas y deslizar entre fotos, cerrar con Esc, con
 * el fondo o deslizando hacia abajo. Mientras está abierto la página no hace scroll, el
 * foco se queda dentro y al cerrar regresa a la foto que lo abrió.
 */
const props = defineProps<{
  photos: { src: string; caption: string }[]
  /** Foto abierta; null = cerrado. */
  index: number | null
}>()
const emit = defineEmits<{ close: []; 'update:index': [value: number] }>()

const open = computed(() => props.index !== null && props.photos.length > 0)
const current = computed(() => (props.index === null ? null : (props.photos[props.index] ?? null)))
useScrollLock(() => open.value)

const root = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null

watch(open, async (isOpen) => {
  if (isOpen) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    closeButton.value?.focus()
  } else {
    opener?.focus()
    opener = null
  }
})

function go(step: 1 | -1) {
  if (props.index === null) return
  emit('update:index', stepIndex(props.index, step, props.photos.length))
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'Tab' && root.value) {
    // el foco da la vuelta dentro del visor
    const items = [...root.value.querySelectorAll<HTMLElement>('button')]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

let startX = 0
let startY = 0
function onTouchStart(e: TouchEvent) {
  startX = e.changedTouches[0].clientX
  startY = e.changedTouches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  const action = swipeAction(e.changedTouches[0].clientX - startX, e.changedTouches[0].clientY - startY)
  if (action === 'next') go(1)
  else if (action === 'prev') go(-1)
  else if (action === 'close') emit('close')
}

watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      ref="root"
      class="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos"
      @click.self="emit('close')"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <button
        ref="closeButton"
        type="button"
        class="viewer__btn viewer__close"
        aria-label="Cerrar"
        @click="emit('close')"
      >
        <AppIcon name="xmark" />
      </button>
      <button
        v-if="photos.length > 1"
        type="button"
        class="viewer__btn viewer__prev"
        aria-label="Foto anterior"
        @click="go(-1)"
      >
        <AppIcon name="chevron-left" />
      </button>
      <figure class="viewer__figure" @click.self="emit('close')">
        <img :key="current.src" :src="current.src" :alt="current.caption" class="viewer__img" />
        <figcaption v-if="current.caption" class="viewer__caption">{{ current.caption }}</figcaption>
      </figure>
      <button
        v-if="photos.length > 1"
        type="button"
        class="viewer__btn viewer__next"
        aria-label="Foto siguiente"
        @click="go(1)"
      >
        <AppIcon name="chevron-right" />
      </button>
      <p v-if="photos.length > 1" class="viewer__count">{{ (index ?? 0) + 1 }} / {{ photos.length }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.92);
  animation: viewer-in calc(0.25s * var(--motion-scale, 1)) ease-out;
}
.viewer__figure {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 100vw;
  max-height: 100dvh;
  margin: 0;
  padding: 3.5rem 0.5rem 2.5rem;
}
.viewer__img {
  max-width: 100%;
  max-height: calc(100dvh - 8rem);
  object-fit: contain;
  animation: viewer-photo calc(0.3s * var(--motion-scale, 1)) ease-out;
}
.viewer__caption {
  max-width: 32rem;
  padding: 0 1rem;
  text-align: center;
  font-family: var(--font-serif, serif);
  font-size: 0.95rem;
  color: #f3f3f1;
}
.viewer__btn {
  position: absolute;
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border: 1px solid rgb(255 255 255 / 0.35);
  border-radius: 50%;
  background: rgb(0 0 0 / 0.45);
  color: #fff;
  cursor: pointer;
}
.viewer__btn :deep(.app-icon) {
  width: 1.1rem;
  height: 1.1rem;
}
.viewer__btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}
.viewer__close {
  top: 0.8rem;
  right: 0.8rem;
}
.viewer__prev {
  left: 0.6rem;
  top: 50%;
  translate: 0 -50%;
}
.viewer__next {
  right: 0.6rem;
  top: 50%;
  translate: 0 -50%;
}
.viewer__count {
  position: absolute;
  bottom: 0.9rem;
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  color: rgb(255 255 255 / 0.75);
}
@keyframes viewer-in {
  from {
    opacity: 0;
  }
}
@keyframes viewer-photo {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}
@media (prefers-reduced-motion: reduce) {
  .viewer,
  .viewer__img {
    animation: none;
  }
}
</style>
