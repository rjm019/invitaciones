<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Historia editorial ("editorial"): el texto es el protagonista, como la primera página de
 * un capítulo: título en mayúsculas espaciadas, el mensaje con una letra capitular y, a un
 * lado (debajo en el celular), la primera foto de la historia en un marco fino de papel
 * con su pie. Los momentos van al final en columnas, cada uno con su año grande y fino.
 * Sin tarjeta: vive sobre el fondo de la página. Solo tokens del tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Nuestra historia')
const moments = computed(() =>
  (props.section.moments ?? []).map((m) => ({
    ...m,
    photo: m.photo ? resolveAsset.value(m.photo) : null,
  })),
)
// La foto del capítulo: la primera que traiga un momento.
const feature = computed(() => moments.value.find((m) => m.photo) ?? null)
</script>

<template>
  <div class="se" :class="{ 'se--photo': feature }">
    <header class="se__head">
      <p v-if="section.subtitle" class="se__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
      <h2 class="se__title" data-text="title">{{ title }}</h2>
      <span class="se__rule" aria-hidden="true" />
    </header>

    <p v-if="section.text" class="se__text" data-text="text">{{ section.text }}</p>

    <figure v-if="feature" class="se__figure">
      <span class="se__mat">
        <img
          :src="feature.photo!"
          :alt="feature.title"
          class="se__photo fx-photo"
          loading="lazy"
          decoding="async"
        />
      </span>
      <figcaption class="se__caption" data-text="detail">
        <span v-if="feature.year">{{ feature.year }} · </span>{{ feature.title }}
      </figcaption>
    </figure>

    <ol v-if="moments.length" class="se__moments">
      <li v-for="(moment, i) in moments" :key="i" class="se__moment">
        <p v-if="moment.year" class="se__year" data-text="year">{{ moment.year }}</p>
        <h3 class="se__moment-title" data-text="moment">{{ moment.title }}</h3>
        <p v-if="moment.text" class="se__detail" data-text="detail">{{ moment.text }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.se {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  max-width: 60rem;
  margin: 0 auto;
}
.se__head {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  text-align: center;
}
.se__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-borgona, var(--color-accent)));
}
.se__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.9rem, 8.5cqi, 3rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
  margin-right: -0.14em;
}
.se__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}
.se__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.18rem, 4.9cqi, 1.32rem) * var(--t-text-size, 1));
  line-height: 1.6;
  color: var(--t-text-color, var(--color-text));
  text-wrap: pretty;
}
@container (min-width: 30rem) {
  .se__text {
    text-align: justify;
    hyphens: auto;
  }
}
/* La capitular: tres líneas de alto, en la letra de los títulos y en borgoña. */
.se__text::first-letter {
  float: left;
  margin: 0.08em 0.12em 0 0;
  font-family: var(--font-display);
  font-size: 3.9em;
  line-height: 0.82;
  color: var(--color-borgona, var(--color-accent));
}
.se__figure {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  margin: 0;
}
.se__mat {
  display: block;
  width: min(100%, 22rem);
  padding: 0.6rem 0.6rem 0.6rem;
  background: var(--color-paper, var(--color-surface));
  box-shadow: var(--shadow-card);
  outline: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
  outline-offset: -0.35rem;
}
.se__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}
.se__caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.se__moments {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--space-3) var(--space-3);
  margin: var(--space-1) 0 0;
  padding: var(--space-3) 0 0;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent);
  list-style: none;
}
.se__moment {
  display: grid;
  align-content: start;
  gap: 0.25rem;
  text-align: center;
}
.se__year {
  margin: 0;
  font-family: var(--t-year-font, var(--font-display));
  font-size: calc(2rem * var(--t-year-size, 1));
  line-height: 1;
  letter-spacing: 0.06em;
  color: var(--t-year-color, color-mix(in srgb, var(--color-text) 55%, transparent));
}
.se__moment-title {
  margin: 0.3rem 0 0;
  font-family: var(--t-moment-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.8rem * var(--t-moment-size, 1));
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--t-moment-color, var(--color-text));
}
.se__detail {
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.02rem * var(--t-detail-size, 1));
  line-height: 1.45;
  color: var(--t-detail-color, color-mix(in srgb, var(--color-text) 82%, transparent));
}

/* Ancho: el texto a la izquierda y la foto a la derecha; los momentos abajo. */
@container (min-width: 44rem) {
  .se--photo {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    column-gap: var(--space-5);
    align-items: center;
  }
  .se--photo .se__head,
  .se--photo .se__moments {
    grid-column: 1 / -1;
  }
}
</style>
