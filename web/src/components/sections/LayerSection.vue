<script setup lang="ts">
import type { ResolvedSection } from '@/types/event'

/**
 * Capa de imagen: una ventana por la que se ve una foto que no se mueve. Al bajar, la foto
 * parece haber estado siempre debajo de la página: las secciones de arriba y de abajo pasan
 * por encima de ella. La foto (fondo quieto) la pinta SectionShell; aquí solo van el alto
 * ("variante": media, alta o pantalla) y, si hay, un título y un texto sobre la foto.
 */
defineProps<{ section: ResolvedSection }>()
</script>

<template>
  <div class="layer" :class="`layer--${section.variant ?? 'media'}`">
    <h2 v-if="section.title" class="layer__title" data-text="title">{{ section.title }}</h2>
    <p v-if="section.text" class="layer__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.layer {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--space-2);
  min-height: 60svh;
  padding: var(--space-3) var(--space-2);
  text-align: center;
  container-type: inline-size;
  position: relative;
}
/* Sombra arriba y abajo: las secciones vecinas parecen pasar por encima de la foto. */
.layer::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgb(0 0 0 / 0.6),
    transparent 22%,
    transparent 78%,
    rgb(0 0 0 / 0.6)
  );
  pointer-events: none;
}
.layer > * {
  position: relative;
}
.layer--alta {
  min-height: 85svh;
}
.layer--pantalla {
  min-height: 100svh;
}
.layer__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.4rem, 12cqi, 3.6rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
  text-shadow: 0 0.15rem 1.2rem rgb(0 0 0 / 0.7);
}
.layer__text {
  max-width: 24rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display, var(--font-serif)));
  font-style: italic;
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
  text-shadow: 0 0.1rem 0.9rem rgb(0 0 0 / 0.75);
}
</style>
