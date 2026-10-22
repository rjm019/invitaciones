<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { motionScale } from '@/composables/useMotionScale'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { galleryItems, stepIndex } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería "diapositivas": una pantalla de Times Square donde las fotos se cambian solas,
 * como un gif. Cada foto se ve completa (sin recortar) sobre un reflejo borroso de ella
 * misma, se funde con la siguiente y se acerca apenas mientras está. Solo cambia mientras
 * se ve en pantalla; con "menos movimiento" no cambia sola (se elige con los puntos). Al
 * tocarla se abre el visor a pantalla completa.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()
const reduced = useReducedMotion()

/** Segundos que se queda cada foto (a velocidad 1). */
const HOLD = 3.4
const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const current = ref(0)
const opened = ref<number | null>(null)

const root = ref<HTMLElement | null>(null)
const visible = useInView(root, { once: false, threshold: 0.35 })
const playing = computed(
  () => visible.value && !reduced.value && opened.value === null && photos.value.length > 1,
)

let timer: ReturnType<typeof setInterval> | undefined
watch(
  playing,
  (on) => {
    clearInterval(timer)
    if (on) {
      timer = setInterval(
        () => (current.value = stepIndex(current.value, 1, photos.value.length)),
        HOLD * 1000 * motionScale(),
      )
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div ref="root" class="ny-screen" :style="{ '--ny-screen-hold': `${HOLD}s` }">
    <h2 v-if="title" class="ny-screen__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="ny-screen__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>

    <button
      v-if="photos.length"
      type="button"
      class="ny-screen__frame"
      :aria-label="`Ver la foto ${current + 1} de ${photos.length}`"
      @click="opened = current"
    >
      <span
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="ny-screen__slide"
        :class="{ 'is-current': i === current }"
        aria-hidden="true"
      >
        <span class="ny-screen__blur" :style="{ backgroundImage: `url(&quot;${photo.src}&quot;)` }" />
        <img :src="photo.src" alt="" class="ny-screen__photo" loading="lazy" decoding="async" />
      </span>
    </button>

    <p v-if="photos[current]?.caption" class="ny-screen__caption" data-text="caption">
      {{ photos[current].caption }}
    </p>

    <div v-if="photos.length > 1" class="ny-screen__dots" role="tablist" aria-label="Fotos">
      <button
        v-for="(photo, i) in photos"
        :key="photo.src"
        type="button"
        role="tab"
        class="ny-screen__dot"
        :class="{ 'is-current': i === current }"
        :aria-selected="i === current"
        :aria-label="`Foto ${i + 1}`"
        @click="current = i"
      />
    </div>

    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.ny-screen {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 30rem;
  margin: 0 auto;
  text-align: center;
}
.ny-screen__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-screen__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
/* La pantalla: marco de metal con doble filo y un resplandor, como un anuncio luminoso. */
.ny-screen__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  padding: 0;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  outline: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  outline-offset: 5px;
  background: var(--color-night, #000);
  box-shadow:
    0 0 2.2rem color-mix(in srgb, var(--color-primary-soft) 30%, transparent),
    0 1.2rem 2.4rem rgb(0 0 0 / 0.5);
  cursor: zoom-in;
}
.ny-screen__frame:focus-visible {
  outline: 2px solid var(--color-primary-strong);
}
.ny-screen__slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity calc(1.1s * var(--motion-scale)) ease-in-out;
}
.ny-screen__slide.is-current {
  opacity: 1;
}
/* El reflejo borroso llena la pantalla; la foto va completa encima. */
.ny-screen__blur {
  position: absolute;
  inset: -10%;
  background: center / cover no-repeat;
  filter: blur(18px) brightness(0.55);
}
.ny-screen__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* Mientras está, la foto se acerca apenas (Ken Burns). */
.ny-screen__slide.is-current .ny-screen__photo {
  animation: ny-screen-zoom calc((var(--ny-screen-hold) + 1.2s) * var(--motion-scale)) ease-out
    forwards;
}
@keyframes ny-screen-zoom {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}
.ny-screen__caption {
  margin: 0;
  font-family: var(--t-caption-font, var(--font-caps));
  font-size: calc(0.72rem * var(--t-caption-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-caption-color, var(--color-text));
}
.ny-screen__dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}
.ny-screen__dot {
  width: 0.55rem;
  height: 0.55rem;
  padding: 0;
  border: 1px solid var(--color-primary);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: transform calc(0.3s * var(--motion-scale)) ease-out;
}
.ny-screen__dot.is-current {
  background: var(--color-primary);
  transform: scale(1.25);
}
.ny-screen__dot:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .ny-screen__slide {
    transition: none;
  }
  .ny-screen__slide.is-current .ny-screen__photo {
    animation: none;
  }
}
</style>
