<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Vestimenta editorial ("editorial"): una página de revista de moda nupcial. Arriba el
 * título en versalitas y el código (`subtitulo`, "Formal") como titular grande; luego la
 * descripción, la paleta como muestras de papel (con el pliegue de una muestra de
 * imprenta), lo que conviene evitar y, si las hay, las fotos de referencia en marcos finos
 * con su pie. El botón de ejemplos (`enlace`) solo aparece si la sección lo trae.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Código de vestimenta')
const colors = computed(() => event.value.dress_code.colors)
const restrictions = computed(() => props.section.restrictions ?? [])
const references = computed(() =>
  (props.section.references ?? []).flatMap((r) => {
    const photo = resolveAsset.value(r.photo)
    return photo ? [{ photo, caption: r.caption }] : []
  }),
)
</script>

<template>
  <div class="dr">
    <p class="dr__kicker" data-text="title">{{ title }}</p>
    <h2 v-if="section.subtitle" class="dr__headline" data-text="subtitle">{{ section.subtitle }}</h2>
    <span class="dr__rule" aria-hidden="true" />
    <p v-if="section.text" class="dr__text" data-text="text">{{ section.text }}</p>

    <div v-if="colors.length" class="dr__palette">
      <p class="dr__label">Paleta sugerida</p>
      <ul class="dr__swatches" aria-label="Colores sugeridos">
        <li
          v-for="color in colors"
          :key="color"
          class="dr__swatch"
          :style="{ '--swatch': color }"
          :aria-label="color"
        >
          <span class="dr__chip" />
        </li>
      </ul>
    </div>

    <div v-if="restrictions.length" class="dr__avoid">
      <p class="dr__label">Te pedimos evitar</p>
      <ul class="dr__list">
        <li v-for="(line, i) in restrictions" :key="i">{{ line }}</li>
      </ul>
    </div>

    <div v-if="references.length" class="dr__refs">
      <figure v-for="(ref, i) in references" :key="i" class="dr__ref">
        <img :src="ref.photo" :alt="ref.caption" class="dr__img fx-photo" loading="lazy" decoding="async" />
        <figcaption v-if="ref.caption" class="dr__caption">{{ ref.caption }}</figcaption>
      </figure>
    </div>

    <a
      v-if="section.link"
      :href="section.link"
      class="dr__button inv-btn"
      data-text="button"
      target="_blank"
      rel="noopener"
    >
      {{ section.button ?? 'Ver ejemplos' }}
    </a>
  </div>
</template>

<style scoped>
.dr {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.dr__kicker {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.76rem * var(--t-title-size, 1));
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-borgona, var(--color-accent)));
  margin-right: -0.34em;
}
.dr__headline {
  margin: -0.2rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(3rem, 17cqi, 4.8rem) * var(--t-subtitle-size, 1));
  line-height: 0.95;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
  margin-right: -0.1em;
}
.dr__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}
.dr__text {
  max-width: 30ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.15rem, 5cqi, 1.32rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.dr__label {
  margin: 0 0 0.7rem;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
.dr__palette,
.dr__avoid {
  width: 100%;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
}
.dr__swatches {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Muestra de papel: el color arriba, la pestaña blanca abajo y el pliegue de la esquina. */
.dr__swatch {
  width: clamp(3rem, 15cqi, 4.2rem);
  padding: 0.25rem 0.25rem 0.9rem;
  background: var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(59 52 46 / 0.14),
    0 6px 10px -6px rgb(59 52 46 / 0.35);
}
.dr__chip {
  display: block;
  aspect-ratio: 1;
  background:
    linear-gradient(225deg, rgb(255 255 255 / 0.25) 0 12%, transparent 12.5%),
    var(--swatch);
}
.dr__list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-serif);
  font-size: 1.08rem;
  line-height: 1.35;
}
.dr__list li::before {
  content: '— ';
  color: var(--color-borgona, var(--color-accent));
}
.dr__refs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 6.2rem), 1fr));
  gap: 0.8rem;
  width: 100%;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
}
.dr__ref {
  display: grid;
  gap: 0.45rem;
  margin: 0;
}
.dr__img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  padding: 0.3rem;
  background: var(--color-paper, var(--color-surface));
  outline: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent);
  outline-offset: -1px;
}
.dr__caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.92rem;
  line-height: 1.3;
  color: color-mix(in srgb, var(--color-text) 78%, transparent);
}
.dr__button {
  display: inline-block;
  padding: 0.6rem 1.1rem;
  border: var(--btn-border, 1px solid currentColor);
  border-radius: var(--btn-radius, 2px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.72rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.2em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-text)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
</style>
