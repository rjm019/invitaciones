<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { vReveal } from '@/directives/reveal'
import { backgroundVars } from '@/services/backgroundService'
import { motionTime, sparkles } from '@/services/effectsService'
import type { ResolvedSection } from '@/types/event'

/**
 * Envoltura de toda sección: es el ÚNICO lugar que pinta fondo, overlay y efectos.
 * Las secciones solo se ocupan de su contenido. Cada sección es un panel (fondo propio,
 * esquinas, sombra y línea fina del tema); la portada va sin panel, sobre el papel.
 */
const props = defineProps<{ section: ResolvedSection }>()
// El renderer le pone a la raíz su lugar en la cuadrícula de escritorio (class).
const { resolveAsset } = useEvent()

const style = computed(() => backgroundVars(props.section.background, resolveAsset.value))
const hasImage = computed(() => '--section-bg-image' in style.value)
const hasOverlay = computed(() => '--section-overlay' in style.value)

// destellos: estrellitas doradas que titilan detrás del contenido (siempre las mismas por sección).
const stars = computed(() =>
  props.section.effects.includes('sparkle') ? sparkles(props.section.id) : [],
)
// cascada: los elementos de la sección entran uno tras otro; necesita saber cuándo se ve.
const reveals = computed(() => props.section.effects.some((e) => e === 'reveal' || e === 'cascade'))

const classes = computed(() => [
  'section',
  `section--${props.section.type}`,
  props.section.variant && `section--${props.section.type}--${props.section.variant}`,
  ...props.section.effects.map((e) => `fx-${e}`),
  {
    'section--panel': props.section.panel,
    'section--has-bg': hasImage.value || '--section-bg-color' in style.value,
    'section--sticky-bg': hasImage.value && props.section.background?.attachment === 'sticky',
  },
])
</script>

<template>
  <section :id="section.id" :class="classes" :style="style">
    <div v-if="hasImage" class="section__bg" aria-hidden="true" />
    <div v-if="hasOverlay" class="section__overlay" aria-hidden="true" />
    <!-- cambio de color: tonos del tema que aparecen y se van sobre el fondo -->
    <div v-if="section.effects.includes('color-shift')" class="section__tint" aria-hidden="true">
      <span class="section__tint-layer" />
      <span class="section__tint-layer" />
    </div>
    <div v-if="stars.length" class="section__sparkles" aria-hidden="true">
      <span
        v-for="(star, i) in stars"
        :key="i"
        class="fx-sparkle-star"
        :style="{
          top: `${star.top}%`,
          left: `${star.left}%`,
          width: `${star.size}rem`,
          animationDelay: motionTime(star.delay),
          animationDuration: motionTime(star.duration),
        }"
      />
    </div>
    <div
      v-reveal="reveals"
      class="section__content"
      :class="{ 'is-cascade-only': !section.effects.includes('reveal') }"
    >
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  display: grid;
  align-content: center;
  padding: var(--section-padding-block, var(--space-4))
    var(--section-padding-inline, var(--space-2));
  /* background (no background-color): el color de un panel también puede ser un degradado */
  background: var(--section-bg-color, transparent);
}
/* Sin panel (portada): su contenido es lo que se ve; el espacio lo pone la página. */
.section:not(.section--panel) {
  padding-block: 0;
}
.section--panel {
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow);
  overflow: clip;
}
/* Línea fina por dentro del panel (como el filo de una tarjeta de papelería). */
.section--panel::after {
  content: '';
  position: absolute;
  inset: 0.4rem;
  border: var(--panel-border);
  border-radius: calc(var(--panel-radius) - 0.4rem);
  pointer-events: none;
}
.section--has-bg {
  overflow: hidden;
}
.section__bg {
  position: absolute;
  inset: 0;
  background-image: var(--section-bg-image);
  background-size: var(--section-bg-size, cover);
  background-repeat: var(--section-bg-repeat, no-repeat);
  background-position: center;
}
/* "fijo": el fondo se queda quieto mientras el contenido pasa (sin background-attachment: fixed, que falla en iOS) */
.section--sticky-bg {
  clip-path: inset(0 round var(--panel-radius));
}
.section--sticky-bg:not(.section--panel) {
  clip-path: inset(0);
}
.section--sticky-bg .section__bg {
  position: fixed;
}
.section__tint,
.section__tint-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.section__sparkles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.section__overlay {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / var(--section-overlay, 0));
}
/*
 * El contenido es un contenedor ("section"): las secciones se miden con cqi contra su
 * propio ancho, no contra la pantalla. Así se ven igual en un celular que en media fila
 * de escritorio.
 */
.section__content {
  position: relative;
  container: section / inline-size;
  width: 100%;
  max-width: var(--section-content-width, var(--section-max-width));
  margin-inline: auto;
}
</style>
