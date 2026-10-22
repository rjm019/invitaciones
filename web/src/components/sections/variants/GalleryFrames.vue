<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería de Nueva York ("marcos"): la pared de una galería de arte de Chelsea. Cada foto
 * va en un marco de plata (metal con reflejos y filo pulido) colgado de un cable con su
 * foco de galería encendido arriba. Cada foto conserva su forma: las horizontales ocupan
 * todo el ancho y las verticales van de dos en dos (sin recortarlas; el lugar se aparta con
 * sus medidas antes de que carguen). Al tocar una foto se abre el visor a pantalla
 * completa. El pie va en una placita debajo, como la cartela de una obra.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Galería')
/** A partir de esta proporción (ancho / alto) la foto va a todo el ancho. */
const WIDE = 1.15
const photos = computed(() =>
  (event.value.gallery ?? []).flatMap((p, i) => {
    const src = resolveAsset.value(p.photo)
    if (!src) return []
    const ratio = p.width && p.height ? p.width / p.height : null
    // Sin medidas (una URL de fuera): una de cada tres a todo el ancho, como antes.
    const wide = ratio === null ? i % 3 === 0 : ratio >= WIDE
    return [{ src, caption: p.caption, wide, ratio: ratio ?? (wide ? 4 / 3 : 3 / 4) }]
  }),
)
const opened = ref<number | null>(null)
</script>

<template>
  <div class="ny-wall">
    <h2 class="ny-wall__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="ny-wall__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <div class="ny-wall__frames">
      <figure
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="ny-wall__piece"
        :class="{ 'ny-wall__piece--wide': photo.wide }"
        data-cascade
      >
        <span class="ny-wall__lamp" aria-hidden="true" />
        <button
          type="button"
          class="ny-wall__frame fx-photo"
          :aria-label="photo.caption || `Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <img
            :src="photo.src"
            :alt="photo.caption"
            class="ny-wall__img"
            :style="{ aspectRatio: photo.ratio }"
            loading="lazy"
            decoding="async"
          />
        </button>
        <figcaption v-if="photo.caption" class="ny-wall__plaque" data-text="caption">
          {{ photo.caption }}
        </figcaption>
      </figure>
    </div>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.ny-wall {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.ny-wall__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-wall__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.ny-wall__frames {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: row dense;
  gap: var(--space-3) var(--space-2);
  align-items: end;
  width: 100%;
  padding-top: 0.6rem;
}
.ny-wall__piece {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  margin: 0;
  padding-top: 1.6rem;
}
/* Las horizontales ocupan todo el ancho, como la obra principal de la pared. */
.ny-wall__piece--wide {
  grid-column: 1 / -1;
}
/* El cable del que cuelga el marco y el foco de galería sobre él. */
.ny-wall__piece::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1.1rem;
  background: color-mix(in srgb, var(--color-primary) 70%, transparent);
}
.ny-wall__lamp {
  position: absolute;
  top: 1.05rem;
  left: 50%;
  width: 1.4rem;
  height: 0.5rem;
  translate: -50% 0;
  border-radius: 0.7rem 0.7rem 0 0;
  background: linear-gradient(180deg, var(--color-primary-soft), var(--color-primary-strong));
  box-shadow: 0 0.4rem 0.9rem 0.1rem color-mix(in srgb, var(--color-primary-soft) 55%, transparent);
}
/* El marco: el metal con sus reflejos en diagonal y un filo pulido. */
.ny-wall__frame {
  width: 100%;
  padding: 0.5rem;
  border: 0;
  background: linear-gradient(
    135deg,
    var(--color-primary-strong) 0%,
    var(--color-primary) 24%,
    var(--color-primary-soft) 46%,
    var(--color-primary) 64%,
    var(--color-primary-strong) 82%,
    var(--color-primary) 100%
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary-soft) 80%, transparent),
    0 1rem 1.6rem rgb(0 0 0 / 0.45);
  cursor: zoom-in;
}
.ny-wall__frame:focus-visible {
  outline: 2px solid var(--color-primary-strong);
  outline-offset: 3px;
}
.ny-wall__img {
  display: block;
  width: 100%;
  object-fit: cover;
  border: 1px solid rgb(0 0 0 / 0.55);
}
/* La cartela: placa pequeña con el pie de foto. */
.ny-wall__plaque {
  max-width: 100%;
  padding: 0.2rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  font-family: var(--t-caption-font, var(--font-caps));
  font-size: calc(0.68rem * var(--t-caption-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-caption-color, var(--color-text));
}
</style>
