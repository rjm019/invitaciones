<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Capa de imagen: ventanas por las que se ven fotos que no se mueven. Al bajar, cada foto
 * parece haber estado siempre debajo de la página y la siguiente ventana pasa por encima
 * de ella. Las fotos (una por ventana) las pinta SectionShell; aquí van las ventanas, todas
 * del mismo alto ("variante": media, alta o pantalla), y sobre la primera el título y el
 * texto, si hay.
 */
const props = defineProps<{ section: ResolvedSection }>()
const windows = computed(() => Math.max(1, props.section.layers?.length ?? 0))
</script>

<template>
  <div class="layer" :class="`layer--${section.variant ?? 'media'}`">
    <div v-for="i in windows" :key="i" class="layer__window">
      <template v-if="i === 1">
        <h2 v-if="section.title" class="layer__title" data-text="title">{{ section.title }}</h2>
        <p v-if="section.text" class="layer__text" data-text="text">{{ section.text }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.layer {
  display: grid;
  container-type: inline-size;
}
.layer__window {
  position: relative;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--space-2);
  height: 60svh;
  padding: var(--space-3) var(--space-2);
  text-align: center;
}
.layer--alta .layer__window {
  height: 85svh;
}
.layer--pantalla .layer__window {
  height: 100svh;
}
/* Sombra arriba y abajo de cada ventana: la siguiente parece pasar por encima de la foto. */
.layer__window::before {
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
.layer__window > * {
  position: relative;
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
