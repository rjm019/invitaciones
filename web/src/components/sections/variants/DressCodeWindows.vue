<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Código de vestimenta de Nueva York ("vitrinas"): dos escaparates de la Quinta Avenida
 * con su toldo a rayas y la luz encendida, cada uno con su figura (vestido y traje). Abajo,
 * el texto y los colores sugeridos como muestras de tela.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Dress Code')
const colors = computed(() => event.value.dress_code.colors)
const windows = computed(() =>
  [props.section.decor.woman, props.section.decor.man].filter((src): src is string => !!src),
)
</script>

<template>
  <div class="ny-dress">
    <h2 class="ny-dress__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="ny-dress__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>

    <div v-if="windows.length" class="ny-dress__street" aria-hidden="true">
      <div v-for="(src, i) in windows" :key="i" class="ny-dress__window" data-cascade>
        <span class="ny-dress__awning" />
        <span class="ny-dress__glass">
          <img :src="src" alt="" class="ny-dress__figure" />
        </span>
      </div>
    </div>

    <p v-if="section.text" class="ny-dress__text" data-text="text">{{ section.text }}</p>

    <ul v-if="colors.length" class="ny-dress__swatches" aria-label="Colores sugeridos">
      <li
        v-for="color in colors"
        :key="color"
        class="ny-dress__swatch"
        :style="{ '--swatch': color }"
        :title="color"
      />
    </ul>
  </div>
</template>

<style scoped>
.ny-dress {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
.ny-dress__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-dress__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.ny-dress__street {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: clamp(0.8rem, 5cqi, 1.4rem);
  width: 100%;
  padding-bottom: 0.6rem;
  border-bottom: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.ny-dress__window {
  display: grid;
}
/* El toldo: rayas de dos tonos con la orilla en ondas. */
.ny-dress__awning {
  height: 1.7rem;
  background: repeating-linear-gradient(
    90deg,
    var(--color-primary-strong) 0 0.55rem,
    var(--color-night) 0.55rem 1.1rem
  );
  -webkit-mask:
    linear-gradient(#000 0 0) top / 100% 70% no-repeat,
    radial-gradient(circle at 50% 0, #000 0.5rem, transparent 0.52rem) 0 70% / 1.1rem 30% repeat-x;
  mask:
    linear-gradient(#000 0 0) top / 100% 70% no-repeat,
    radial-gradient(circle at 50% 0, #000 0.5rem, transparent 0.52rem) 0 70% / 1.1rem 30% repeat-x;
  filter: drop-shadow(0 0.25rem 0.25rem rgb(0 0 0 / 0.35));
}
/* El escaparate: marco plateado, luz cálida desde arriba y la figura parada al centro. */
.ny-dress__glass {
  display: grid;
  place-items: end center;
  aspect-ratio: 3 / 4.4;
  margin-top: -0.2rem;
  padding: 10% 12% 6%;
  border: 3px solid var(--color-primary);
  border-top-width: 0;
  background:
    radial-gradient(
      90% 60% at 50% 0,
      color-mix(in srgb, var(--color-primary-soft) 38%, transparent),
      transparent 70%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary) 18%, var(--color-night)),
      var(--color-night)
    );
  box-shadow: inset 0 -0.6rem 0 color-mix(in srgb, var(--color-primary) 30%, var(--color-night));
}
.ny-dress__figure {
  width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 0.6rem color-mix(in srgb, var(--color-primary-soft) 45%, transparent));
}
.ny-dress__text {
  max-width: 22rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(1.02rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
/* Muestras de tela: cuadritos con la esquina doblada. */
.ny-dress__swatches {
  display: flex;
  gap: 0.7rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ny-dress__swatch {
  width: 2.2rem;
  aspect-ratio: 1;
  background:
    linear-gradient(
      225deg,
      color-mix(in srgb, var(--color-text) 25%, transparent) 0 0.45rem,
      transparent 0.46rem
    ),
    var(--swatch);
  clip-path: polygon(0 0, calc(100% - 0.45rem) 0, 100% 0.45rem, 100% 100%, 0 100%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 60%, transparent);
}
</style>
