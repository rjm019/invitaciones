<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasDesktop } from '@/composables/useSectionCanvas'
import { useEvent } from '@/composables/useEvent'
import { freeElements, freeVars, resolveCanvas } from '@/services/canvasService'
import type { CanvasElement } from '@/types/event'

/**
 * Los elementos libres del lienzo de una sección (texto, imagen o forma que se agregaron a
 * mano): en absoluto sobre `.section__content`, que es su contenedor, y recortados en la
 * orilla de la sección. Manda el celular; en escritorio cada elemento toma sus valores
 * propios. Solo lee variables y tokens: nada de colores ni medidas fijos. Se monta únicamente
 * si hay elementos libres.
 */
const props = defineProps<{ elements: CanvasElement[] }>()
const { resolveAsset } = useEvent()
const desktop = useCanvasDesktop()

const items = computed(() =>
  freeElements(props.elements)
    .filter((element) => !resolveCanvas(element, desktop.value).hidden)
    .map((element) => ({
      element,
      style: freeVars(element, desktop.value),
      image: element.kind === 'image' && element.image ? resolveAsset.value(element.image) : null,
    })),
)
</script>

<template>
  <div v-if="items.length" class="canvas-layer" data-canvas-layer aria-hidden="true">
    <template v-for="item in items" :key="item.element.id">
      <div
        class="canvas-el"
        :class="[
          `canvas-el--${item.element.kind}`,
          item.element.shape && `canvas-el--${item.element.shape}`,
          item.element.shape &&
            item.element.shape !== 'line' &&
            item.element.border &&
            'canvas-el--outlined',
        ]"
        :data-canvas-id="item.element.id"
        :style="item.style"
      >
        <template v-if="item.element.kind === 'text'">{{ item.element.text }}</template>
        <img v-else-if="item.image" :src="item.image" alt="" decoding="async" loading="lazy" />
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Un velo del tamaño del contenedor; lo recortado lo corta la sección (section--canvas). */
.canvas-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
/*
 * Las variables (--cv-*) vienen de canvasService.freeVars. Posición y medidas en cqw: % del
 * ancho de .section__content, el contenedor más cercano. Giro, escala y opacidad son las
 * propiedades individuales, para no chocar con el `transform` de los efectos.
 */
.canvas-el {
  position: absolute;
  left: calc(var(--cv-x) * 1cqw);
  top: calc(var(--cv-y) * 1cqw);
  width: calc(var(--cv-w) * 1cqw);
  z-index: var(--cv-layer, 0);
  rotate: var(--cv-rotate, 0deg);
  scale: var(--cv-scale-x, 1) var(--cv-scale-y, 1);
  opacity: var(--cv-opacity, 1);
  color: var(--cv-color, var(--color-text));
}
.canvas-el--text {
  font-family: var(--cv-font, var(--font-serif));
  font-size: calc(var(--cv-size, 5) * 1cqw);
  line-height: 1.2;
  text-align: var(--cv-align, center);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.canvas-el--image img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--cv-radius, 0);
  border: var(--cv-border, 0px) solid var(--cv-color, transparent);
}
.canvas-el--shape {
  aspect-ratio: 3 / 2;
  border-radius: var(--cv-radius, 0);
  background: var(--cv-color, var(--color-accent));
}
/* Con borde, solo el contorno (en la línea, el borde es su grosor). */
.canvas-el--outlined {
  background: transparent;
  border: var(--cv-border) solid var(--cv-color, var(--color-accent));
}
.canvas-el--circle {
  aspect-ratio: 1;
  border-radius: 50%;
}
.canvas-el--line {
  aspect-ratio: auto;
  height: var(--cv-border, 2px);
  border-radius: 0;
}
</style>
