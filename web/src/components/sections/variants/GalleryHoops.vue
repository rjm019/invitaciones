<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería en bastidores ("bastidor"): cada foto va en un aro de bordado: el aro de madera
 * clara con su tornillo arriba, la tela de lino tensada alrededor de la foto y una puntada
 * discontinua que la rodea. Una de cada tres foto es más grande (ocupa todo el ancho) y las
 * demás van de dos en dos, un poco escalonadas. La foto se recorta en círculo (la
 * miniatura `srcset` se usa como en las otras galerías) y al tocarla se abre el visor a
 * pantalla completa con la foto entera. El pie va debajo, como una etiqueta cosida.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const opened = ref<number | null>(null)
</script>

<template>
  <div class="hoops">
    <h2 v-if="title" class="hoops__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="hoops__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <div class="hoops__grid">
      <figure
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="hoops__piece"
        :class="{ 'hoops__piece--feature': i % 3 === 0 }"
        data-cascade
      >
        <button
          type="button"
          class="hoops__hoop"
          :aria-label="photo.caption || `Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <span class="hoops__screw" aria-hidden="true" />
          <span class="hoops__cloth">
            <img
              :src="photo.src"
              :srcset="photo.srcset"
              :sizes="
                photo.srcset
                  ? i % 3 === 0
                    ? '(min-width: 34rem) 20rem, 72vw'
                    : '(min-width: 34rem) 14rem, 44vw'
                  : undefined
              "
              :alt="photo.caption"
              class="hoops__img fx-photo"
              loading="lazy"
              decoding="async"
            />
          </span>
        </button>
        <figcaption v-if="photo.caption" class="hoops__label" data-text="caption">
          {{ photo.caption }}
        </figcaption>
      </figure>
    </div>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.hoops {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.hoops__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.hoops__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.hoops__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-2);
  align-items: start;
  width: 100%;
  padding-top: 0.6rem;
}
.hoops__piece {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  margin: 0;
}
/* Las pares (la segunda de cada pareja) bajan un poco: se ve cosido a mano, no en cuadrícula. */
.hoops__piece:not(.hoops__piece--feature):nth-child(3n) {
  margin-top: 1.4rem;
}
.hoops__piece--feature {
  grid-column: 1 / -1;
}
.hoops__piece--feature .hoops__hoop {
  width: min(100%, 17rem);
}

/* El aro: madera clara en dos anillos (el de fuera y el que aprieta la tela). */
.hoops__hoop {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  padding: 0.5rem;
  border: 0;
  border-radius: 50%;
  background:
    radial-gradient(
      circle at 50% 50%,
      transparent 0 calc(50% - 0.5rem),
      rgb(0 0 0 / 0.22) calc(50% - 0.5rem + 1px) calc(50% - 0.5rem + 3px),
      transparent calc(50% - 0.5rem + 4px)
    ),
    linear-gradient(
      135deg,
      var(--color-primary-soft) 0%,
      var(--color-primary) 38%,
      color-mix(in srgb, var(--color-primary) 72%, #7b6a4a) 62%,
      var(--color-primary-soft) 100%
    );
  box-shadow:
    0 0.7rem 1.4rem rgb(0 0 0 / 0.32),
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary-strong) 55%, transparent);
  cursor: pointer;
  transition: transform calc(0.3s * var(--motion-scale)) ease;
}
.hoops__hoop:hover {
  transform: rotate(-1.5deg);
}
.hoops__hoop:focus-visible {
  outline: 2px solid var(--color-primary-strong);
  outline-offset: 4px;
}
/* El tornillo del aro, arriba, con su tuerca. */
.hoops__screw {
  position: absolute;
  top: -0.55rem;
  left: 50%;
  width: 1.5rem;
  height: 0.95rem;
  translate: -50% 0;
  border-radius: 0.25rem 0.25rem 0.1rem 0.1rem;
  background: linear-gradient(
    180deg,
    var(--color-primary-soft),
    color-mix(in srgb, var(--color-primary) 70%, #7b6a4a)
  );
  box-shadow:
    0 0.2rem 0.4rem rgb(0 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary-strong) 50%, transparent);
}
.hoops__screw::after {
  content: '';
  position: absolute;
  top: 0.18rem;
  left: 50%;
  width: 0.5rem;
  height: 0.5rem;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, var(--color-primary));
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.25);
}
/* La tela de lino tensada: trama de hilos cruzados y la puntada discontinua alrededor. */
.hoops__cloth {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.65rem;
  border-radius: 50%;
  background:
    repeating-linear-gradient(0deg, rgb(255 255 255 / 0.18) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgb(0 0 0 / 0.06) 0 1px, transparent 1px 3px),
    var(--color-paper, #f3eedf);
  box-shadow: inset 0 0.15rem 0.5rem rgb(0 0 0 / 0.25);
}
.hoops__cloth::before {
  content: '';
  position: absolute;
  inset: 0.28rem;
  border: 1.5px dashed color-mix(in srgb, var(--color-accent) 85%, var(--color-night, #000));
  border-radius: 50%;
  pointer-events: none;
}
.hoops__img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-night, #000) 30%, transparent);
}
.hoops__label {
  max-width: 100%;
  margin: 0;
  padding: 0.15rem 0.7rem;
  font-family: var(--t-caption-font, var(--font-serif));
  font-style: italic;
  font-size: calc(0.95rem * var(--t-caption-size, 1));
  line-height: 1.25;
  color: var(--t-caption-color, var(--color-text));
  /* La etiqueta cosida: filo de puntadas arriba y abajo. */
  border-block: 1px dashed color-mix(in srgb, var(--color-primary) 60%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .hoops__hoop {
    transition: none;
  }
  .hoops__hoop:hover {
    transform: none;
  }
}
</style>
