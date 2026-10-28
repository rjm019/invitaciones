<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Historia: un mensaje de bienvenida (el texto de la sección) y, si los hay, los momentos
 * de la historia en orden (año, título, texto y una foto opcional), en una línea de
 * tiempo sobria. Sin momentos, solo se ve el mensaje. Solo tokens del tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Nuestra historia')
const moments = computed(() =>
  (props.section.moments ?? []).map((m) => ({ ...m, photo: m.photo ? resolveAsset.value(m.photo) : null })),
)
</script>

<template>
  <div class="story">
    <h2 class="story__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="story__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <p v-if="section.text" class="story__welcome" data-text="text">{{ section.text }}</p>

    <ol v-if="moments.length" class="story__moments">
      <li v-for="(moment, i) in moments" :key="i" class="story__moment">
        <p v-if="moment.year" class="story__year" data-text="year">{{ moment.year }}</p>
        <h3 class="story__moment-title" data-text="moment">{{ moment.title }}</h3>
        <p v-if="moment.text" class="story__detail" data-text="detail">{{ moment.text }}</p>
        <img
          v-if="moment.photo"
          :src="moment.photo"
          :alt="moment.title"
          class="story__photo"
          loading="lazy"
          decoding="async"
        />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.story {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 0.5rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.story__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 9cqi, 2.6rem) * var(--t-title-size, 1));
  letter-spacing: 0.12em;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-primary));
}
.story__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.05rem, 5cqi, 1.3rem) * var(--t-subtitle-size, 1));
  color: var(--t-subtitle-color, var(--color-text));
}
.story__welcome {
  max-width: 28rem;
  margin: 0.4rem 0 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.55;
  white-space: pre-line;
  color: var(--t-text-color, var(--color-text));
}
/* Línea de tiempo: un filete fino a la izquierda y cada momento a su lado. */
.story__moments {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  margin: var(--space-3) 0 0;
  padding: 0 0 0 1.1rem;
  border-left: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  list-style: none;
  text-align: left;
}
.story__moment {
  display: grid;
  gap: 0.3rem;
}
.story__year {
  margin: 0;
  font-family: var(--t-year-font, var(--font-caps));
  font-size: calc(0.95rem * var(--t-year-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-year-color, var(--color-primary));
}
.story__moment-title {
  margin: 0;
  font-family: var(--t-moment-font, var(--font-serif));
  font-weight: 600;
  font-size: calc(clamp(1.1rem, 5.4cqi, 1.4rem) * var(--t-moment-size, 1));
  line-height: 1.25;
  color: var(--t-moment-color, var(--color-text));
}
.story__detail {
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-size: calc(var(--text-body) * var(--t-detail-size, 1));
  line-height: 1.5;
  white-space: pre-line;
  color: var(--t-detail-color, var(--color-text));
}
.story__photo {
  display: block;
  width: 100%;
  max-height: 22rem;
  margin-top: 0.4rem;
  padding: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  object-fit: cover;
}
</style>
