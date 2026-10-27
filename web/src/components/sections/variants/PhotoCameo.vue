<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Foto en camafeo ("camafeo"): la foto en un óvalo, sobre un fondo oscuro de la paleta y
 * enmarcada por una carpeta de encaje (la ranura "encaje", o la compartida) que asoma por
 * detrás, con un filo fino y una perla arriba. Las iniciales o el apodo van abajo, en un
 * listón. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const photo = computed(() => props.section.image ?? event.value.media.portrait)
const alt = computed(
  () =>
    `Foto de ${event.value.celebrant.short_name || event.value.celebrant.full_name || 'la festejada'}`,
)
const lace = computed(() => decorOr(props.section.decor, 'lace', resolveAsset.value('encaje.svg')))
</script>

<template>
  <div class="cameo">
    <div class="cameo__stack">
      <img v-if="lace" :src="lace" alt="" class="cameo__lace" loading="lazy" />
      <div class="cameo__oval">
        <img v-if="photo" :src="photo" :alt="alt" class="cameo__photo" loading="lazy" decoding="async" />
      </div>
      <span class="cameo__pearl" aria-hidden="true" />
    </div>
    <h2 v-if="section.title" class="cameo__title" data-text="title">{{ section.title }}</h2>
  </div>
</template>

<style scoped>
.cameo {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  container-type: inline-size;
}
.cameo__stack {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100cqi, 22rem);
  aspect-ratio: 1;
  isolation: isolate;
}
/* La carpeta de encaje, un poco más grande que el óvalo. */
.cameo__lace {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.35));
}
.cameo__oval {
  width: 56%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 50%;
  background: var(--color-night, var(--color-surface));
  border: 3px solid var(--color-night, var(--color-surface));
  box-shadow:
    0 0 0 1px var(--color-primary),
    0 0 0 5px color-mix(in srgb, var(--color-night, var(--color-surface)) 85%, transparent),
    0 0 0 6px color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.cameo__photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
.cameo__pearl {
  position: absolute;
  top: 17%;
  left: 50%;
  width: 1.1rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, #f1ebdb 45%, #b7ad95 100%);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
}
.cameo__title {
  margin: 0;
  padding: 0.25em 1.6em;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.6rem, 9cqi, 2.4rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
  border-block: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
}
</style>
