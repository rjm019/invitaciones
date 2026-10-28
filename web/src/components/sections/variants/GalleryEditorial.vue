<script setup lang="ts">
import { computed, ref } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería editorial ("editorial"): una doble página de revista. Las fotos van en marcos
 * finos de papel (un margen claro y un filete de un pelo) con su pie en itálica, en una
 * composición asimétrica que se repite cada cinco: una grande, dos chicas desfasadas y dos
 * medianas. En el celular, dos columnas con la grande arriba. Al tocar una foto se abre el
 * visor a pantalla completa (con sus miniaturas).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const opened = ref<number | null>(null)
// El lugar de cada foto en el ciclo de cinco (grande, chica, chica, mediana, mediana).
const SLOTS = ['hero', 'small', 'small', 'mid', 'mid'] as const
</script>

<template>
  <div class="ge">
    <header v-if="title || section.subtitle" class="ge__head">
      <p v-if="section.subtitle" class="ge__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
      <h2 v-if="title" class="ge__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
    </header>
    <div class="ge__grid">
      <figure
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="ge__piece"
        :class="`ge__piece--${SLOTS[i % SLOTS.length]}`"
      >
        <button
          type="button"
          class="ge__frame fx-photo"
          :aria-label="photo.caption || `Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <img
            :src="photo.src"
            :srcset="photo.srcset"
            :sizes="photo.srcset ? '(min-width: 64rem) 40rem, 100vw' : undefined"
            :alt="photo.caption"
            class="ge__img"
            loading="lazy"
            decoding="async"
          />
        </button>
        <figcaption v-if="photo.caption" class="ge__caption" data-text="caption">
          <span class="ge__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          {{ photo.caption }}
        </figcaption>
      </figure>
    </div>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.ge {
  container-type: inline-size;
  display: grid;
  gap: var(--space-3);
  max-width: 64rem;
  margin: 0 auto;
}
.ge__head {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  text-align: center;
}
.ge__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-borgona, var(--color-accent)));
}
.ge__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.9rem, 8.5cqi, 3rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
  margin-right: -0.14em;
}
.ge__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.4rem 1rem;
  align-items: start;
}
.ge__piece {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}
.ge__piece--hero {
  grid-column: 1 / -1;
}
/* La segunda chica baja un poco: la composición no queda en renglones parejos. */
.ge__piece--small:nth-child(5n + 3) {
  margin-top: 2.2rem;
}
.ge__frame {
  display: block;
  width: 100%;
  padding: 0.45rem;
  border: 0;
  background: var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(59 52 46 / 0.12),
    0 14px 22px -14px rgb(59 52 46 / 0.45);
  outline: 1px solid color-mix(in srgb, var(--color-text) 16%, transparent);
  outline-offset: -0.28rem;
  cursor: zoom-in;
}
.ge__frame:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
.ge__img {
  display: block;
  width: 100%;
  object-fit: cover;
  aspect-ratio: 4 / 5;
}
.ge__piece--hero .ge__img {
  aspect-ratio: 3 / 2;
}
.ge__piece--mid .ge__img {
  aspect-ratio: 1;
}
.ge__caption {
  font-family: var(--t-caption-font, var(--font-serif));
  font-style: italic;
  font-size: calc(0.98rem * var(--t-caption-size, 1));
  line-height: 1.3;
  color: var(--t-caption-color, color-mix(in srgb, var(--color-text) 80%, transparent));
}
.ge__index {
  margin-right: 0.4rem;
  font-family: var(--font-caps);
  font-style: normal;
  font-weight: 600;
  font-size: 0.72em;
  letter-spacing: 0.18em;
  color: var(--color-borgona, var(--color-accent));
}

/* Ancho: seis columnas; la grande ocupa cuatro y dos renglones, las chicas al lado. */
@container (min-width: 44rem) {
  .ge__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 2rem 1.4rem;
  }
  .ge__piece--hero {
    grid-column: span 4;
    grid-row: span 2;
  }
  .ge__piece--small {
    grid-column: span 2;
  }
  .ge__piece--small:nth-child(5n + 3) {
    margin-top: 0;
  }
  .ge__piece--mid {
    grid-column: span 3;
  }
  .ge__piece--mid:nth-child(5n) {
    margin-top: 3rem;
  }
  .ge__piece--hero .ge__img {
    aspect-ratio: 4 / 5;
  }
  .ge__piece--small .ge__img {
    aspect-ratio: 1;
  }
  .ge__piece--mid .ge__img {
    aspect-ratio: 3 / 2;
  }
}
</style>
