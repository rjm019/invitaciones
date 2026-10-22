<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería: las fotos de su lista "fotos" en una cuadrícula de miniaturas (puede haber
 * varias galerías en la invitación, cada una con las suyas). Al tocar una se
 * abre el visor a pantalla completa (deslizar, flechas, Esc). El pie de foto es opcional.
 * Con "cascada" las fotos entran una tras otra.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

// Con varias galerías repartidas, el título solo va si la sección lo trae.
const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const opened = ref<number | null>(null)
</script>

<template>
  <div class="gallery">
    <h2 v-if="title" class="gallery__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="gallery__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <div class="gallery__grid">
      <button
        v-for="(photo, i) in photos"
        :key="photo.src"
        type="button"
        class="gallery__item fx-photo"
        data-cascade
        :aria-label="photo.caption || `Ver foto ${i + 1}`"
        @click="opened = i"
      >
        <img :src="photo.src" :alt="photo.caption" class="gallery__img" loading="lazy" decoding="async" />
      </button>
    </div>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.gallery {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.gallery__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.gallery__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.5rem), 1fr));
  gap: 0.5rem;
  width: 100%;
}
.gallery__item {
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: var(--color-surface, transparent);
  cursor: zoom-in;
}
.gallery__item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.gallery__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
