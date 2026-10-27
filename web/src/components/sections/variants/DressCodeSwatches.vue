<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Código de vestimenta en muestrario ("muestrario"): cada color sugerido es un retazo de
 * tela con sus bordes cortados en zigzag (tijera de picos), una costura y un ligero giro,
 * como las muestras de una modista. Sin colores en el evento, el muestrario usa los
 * pasteles del tema (--color-pastel-*). El botón ("Ver ejemplos") lleva al enlace propio de
 * la sección (`enlace`, ya validado como https por el servidor); sin enlace, no aparece.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Dress Code')
const PASTELS = ['rosa', 'durazno', 'amarillo', 'celeste', 'lila', 'verde']
const swatches = computed(() => {
  const chosen = event.value.dress_code.colors
  return chosen.length
    ? chosen.map((c) => ({ key: c, color: c }))
    : PASTELS.map((p) => ({ key: p, color: `var(--color-pastel-${p}, var(--color-accent))` }))
})
const link = computed(() => props.section.link ?? null)
const button = computed(() => props.section.button ?? 'Ver ejemplos')
</script>

<template>
  <div class="swatches">
    <h2 class="swatches__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="swatches__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <p v-if="section.text" class="swatches__text" data-text="text">{{ section.text }}</p>

    <ul class="swatches__row" aria-label="Colores sugeridos">
      <li
        v-for="(s, i) in swatches"
        :key="s.key"
        class="swatches__item"
        :style="{ '--swatch': s.color, '--turn': `${[-4, 3, -2, 5, -5, 2][i % 6]}deg` }"
        data-cascade
      >
        <span class="swatches__cloth" :title="s.key" />
      </li>
    </ul>

    <a
      v-if="link"
      :href="link"
      class="swatches__button inv-btn"
      data-text="button"
      target="_blank"
      rel="noopener"
    >
      {{ button }}
    </a>
  </div>
</template>

<style scoped>
.swatches {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.swatches__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.swatches__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(1rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-primary));
}
.swatches__text {
  max-width: 28rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
.swatches__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.9rem;
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
}
.swatches__item {
  width: clamp(4.4rem, 22cqi, 6rem);
  aspect-ratio: 4 / 5;
  rotate: var(--turn, 0deg);
  filter: drop-shadow(0 4px 5px rgb(0 0 0 / 0.3));
}
/* El retazo: tela del color, borde en zigzag y una costura punteada por dentro. */
.swatches__cloth {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.32), transparent 40%, rgb(0 0 0 / 0.14)),
    var(--swatch);
  --z: 0.32rem;
  clip-path: polygon(
    0 0,
    12.5% var(--z),
    25% 0,
    37.5% var(--z),
    50% 0,
    62.5% var(--z),
    75% 0,
    87.5% var(--z),
    100% 0,
    calc(100% - var(--z)) 12.5%,
    100% 25%,
    calc(100% - var(--z)) 37.5%,
    100% 50%,
    calc(100% - var(--z)) 62.5%,
    100% 75%,
    calc(100% - var(--z)) 87.5%,
    100% 100%,
    87.5% calc(100% - var(--z)),
    75% 100%,
    62.5% calc(100% - var(--z)),
    50% 100%,
    37.5% calc(100% - var(--z)),
    25% 100%,
    12.5% calc(100% - var(--z)),
    0 100%,
    var(--z) 87.5%,
    0 75%,
    var(--z) 62.5%,
    0 50%,
    var(--z) 37.5%,
    0 25%,
    var(--z) 12.5%
  );
}
.swatches__cloth::after {
  content: '';
  position: absolute;
  inset: 0.55rem;
  border: 1.5px dashed rgb(255 255 255 / 0.65);
  mix-blend-mode: soft-light;
}
</style>
