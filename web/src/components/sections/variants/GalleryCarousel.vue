<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería "carrusel": las fotos en fila, en sus marcos de plata, y se deslizan de lado con
 * el dedo (el scroll del navegador, con imán en cada foto). Cada una conserva su forma: todas
 * miden lo mismo de alto. Flechas y puntos para quien no desliza; al tocar una foto se abre
 * el visor a pantalla completa.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()
const reduced = useReducedMotion()

const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const current = ref(0)
const opened = ref<number | null>(null)

const track = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
function observeSlides() {
  observer?.disconnect()
  if (!track.value || typeof IntersectionObserver === 'undefined') return
  // La foto que ocupa más de la mitad del carrusel es la actual (para los puntos).
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) current.value = Number((entry.target as HTMLElement).dataset.index)
      }
    },
    { root: track.value, threshold: 0.6 },
  )
  for (const slide of track.value.querySelectorAll('[data-index]')) observer.observe(slide)
}
onMounted(observeSlides)
// En el gestor las fotos cambian sin volver a montar la sección.
watch(
  () => photos.value.length,
  () => nextTick(observeSlides),
)
onBeforeUnmount(() => observer?.disconnect())

function go(index: number) {
  const slide = track.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)
  if (!track.value || !slide) return
  track.value.scrollTo({
    left: slide.offsetLeft - (track.value.clientWidth - slide.clientWidth) / 2,
    behavior: reduced.value ? 'auto' : 'smooth',
  })
}
</script>

<template>
  <div class="ny-reel">
    <h2 v-if="title" class="ny-reel__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="ny-reel__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>

    <div ref="track" class="ny-reel__track" tabindex="0" aria-label="Fotos; desliza de lado">
      <figure
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="ny-reel__slide"
        :data-index="i"
        :style="{ '--ny-reel-ratio': photo.ratio }"
      >
        <button
          type="button"
          class="ny-reel__frame fx-photo"
          :aria-label="photo.caption || `Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <img :src="photo.src" :alt="photo.caption" class="ny-reel__img" loading="lazy" decoding="async" />
        </button>
        <figcaption v-if="photo.caption" class="ny-reel__caption" data-text="caption">
          {{ photo.caption }}
        </figcaption>
      </figure>
    </div>

    <div v-if="photos.length > 1" class="ny-reel__nav">
      <button
        type="button"
        class="ny-reel__arrow"
        aria-label="Foto anterior"
        :disabled="current === 0"
        @click="go(current - 1)"
      >
        <AppIcon name="chevron-left" />
      </button>
      <span class="ny-reel__dots" aria-hidden="true">
        <span
          v-for="(photo, i) in photos"
          :key="photo.src"
          class="ny-reel__dot"
          :class="{ 'is-current': i === current }"
        />
      </span>
      <button
        type="button"
        class="ny-reel__arrow"
        aria-label="Foto siguiente"
        :disabled="current === photos.length - 1"
        @click="go(current + 1)"
      >
        <AppIcon name="chevron-right" />
      </button>
    </div>

    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.ny-reel {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 40rem;
  margin: 0 auto;
  text-align: center;
}
.ny-reel__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-reel__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
/* La fila: se desliza con el scroll del navegador, con imán al centro de cada foto. */
.ny-reel__track {
  --ny-reel-h: min(62svh, 26rem);
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  padding: 0.6rem 7cqi 1.2rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.ny-reel__track::-webkit-scrollbar {
  display: none;
}
.ny-reel__track:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.ny-reel__slide {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  flex: none;
  /* Todas del mismo alto, cada una con su forma; ninguna más ancha que el carrusel. */
  width: min(86cqi, calc(var(--ny-reel-h) * var(--ny-reel-ratio)));
  margin: 0;
  scroll-snap-align: center;
}
.ny-reel__frame {
  width: 100%;
  padding: 0.45rem;
  border: 0;
  background: linear-gradient(
    135deg,
    var(--color-primary-strong) 0%,
    var(--color-primary) 30%,
    var(--color-primary-soft) 50%,
    var(--color-primary) 70%,
    var(--color-primary-strong) 100%
  );
  box-shadow: 0 0.9rem 1.4rem rgb(0 0 0 / 0.45);
  cursor: zoom-in;
}
.ny-reel__frame:focus-visible {
  outline: 2px solid var(--color-primary-strong);
  outline-offset: 3px;
}
.ny-reel__img {
  display: block;
  width: 100%;
  aspect-ratio: var(--ny-reel-ratio);
  object-fit: cover;
}
.ny-reel__caption {
  font-family: var(--t-caption-font, var(--font-caps));
  font-size: calc(0.68rem * var(--t-caption-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-caption-color, var(--color-text));
}
.ny-reel__nav {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.ny-reel__arrow {
  display: grid;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  border-radius: 50%;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}
.ny-reel__arrow:disabled {
  opacity: 0.35;
  cursor: default;
}
.ny-reel__arrow :deep(.app-icon) {
  width: 0.9rem;
  height: 0.9rem;
}
.ny-reel__arrow:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.ny-reel__dots {
  display: flex;
  gap: 0.45rem;
}
.ny-reel__dot {
  width: 0.5rem;
  height: 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 50%;
  transition: transform calc(0.3s * var(--motion-scale)) ease-out;
}
.ny-reel__dot.is-current {
  background: var(--color-primary);
  transform: scale(1.25);
}
</style>
