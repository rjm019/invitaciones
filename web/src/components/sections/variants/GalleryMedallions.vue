<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import RibbonBow from '@/components/ui/RibbonBow.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería en medallones (`medallones`): un listón en guirnalda (una comba suave por foto)
 * cruza cada fila y de él cuelgan las fotos en óvalos con doble filete, cada una de un
 * moñito atado al listón y de un hilo, a alturas alternas (la de lugar par cuelga corta y la
 * impar, larga). Cada óvalo se mece a su ritmo (la fase sale de su lugar). En celular van dos
 * por fila y en ancho tres, y cada fila tiene su propio tramo de listón. Al llegar, los
 * óvalos bajan a su lugar escalonados. Cada foto es un botón que abre el visor. Con "menos
 * movimiento" quedan colgados y quietos. Sirve en cualquier tema: el listón sale del primario.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const opened = ref<number | null>(null)

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { threshold: 0.1 })
</script>

<template>
  <div ref="root" class="gm" :class="{ 'is-in': inView }">
    <h2 v-if="title" class="gm__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="gm__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <ul class="gm__board">
      <li
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="gm__item"
        :class="i % 2 ? 'is-long' : 'is-short'"
        :style="{ '--i': i % 8 }"
      >
        <!-- Un tramo de listón: la comba termina a la misma altura que empieza, y los tramos vecinos se unen. -->
        <svg class="gm__garland" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 3Q50 33 100 3" class="gm__ribbon" />
          <path d="M0 2Q50 32 100 2" class="gm__shine" />
        </svg>
        <RibbonBow class="gm__bow" size="2.5rem" />
        <div class="gm__hang">
          <span class="gm__thread" aria-hidden="true" />
          <button
            type="button"
            class="gm__oval"
            :aria-label="photo.caption || `Ver foto ${i + 1}`"
            @click="opened = i"
          >
            <img
              :src="photo.src"
              :srcset="photo.srcset"
              :sizes="photo.srcset ? '(min-width: 34rem) 11rem, 40vw' : undefined"
              :alt="photo.caption"
              class="gm__img fx-photo"
              loading="lazy"
              decoding="async"
            />
          </button>
          <span v-if="photo.caption" class="gm__caption" data-text="caption">{{ photo.caption }}</span>
        </div>
      </li>
    </ul>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.gm {
  --gm-line: var(--color-primary);
  --gm-line-soft: color-mix(in srgb, var(--color-primary) 55%, var(--color-paper, #fdf8f0));
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}
.gm__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.gm__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.gm__board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem 0;
  width: 100%;
  margin: 0;
  padding: 0.6rem 0 0;
  list-style: none;
}
.gm__item {
  --drop: 1.1rem;
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  /* lugar para la comba del listón arriba */
  padding: 2.1rem 0.7rem 0.6rem;
}
.gm__item.is-long {
  --drop: 3.2rem;
}
.gm__garland {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2rem;
  overflow: visible;
}
.gm__ribbon {
  fill: none;
  stroke: var(--gm-line);
  stroke-width: 5;
  vector-effect: non-scaling-stroke;
}
.gm__shine {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.45;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
/* El moñito atado al listón, en el punto más bajo de la comba. */
.gm__bow {
  position: absolute;
  top: 0.95rem;
  left: 50%;
  z-index: 2;
  translate: -50% 0;
}
/* El óvalo cuelga de un hilo y se mece desde el moño. */
.gm__hang {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  width: 100%;
  transform-origin: 50% 0;
  /* cae a su lugar escalonado */
  opacity: 0;
  translate: 0 -1.4rem;
  transition:
    opacity calc(0.6s * var(--motion-scale)) ease calc(var(--i) * 0.14s * var(--motion-scale)),
    translate calc(0.8s * var(--motion-scale)) cubic-bezier(0.3, 1.3, 0.5, 1)
      calc(var(--i) * 0.14s * var(--motion-scale));
}
.gm.is-in .gm__hang {
  opacity: 1;
  translate: 0 0;
  animation: gm-swing calc((5.2s + var(--i) * 0.45s) * var(--motion-scale)) ease-in-out
    calc(var(--i) * -1.3s * var(--motion-scale)) infinite alternate;
}
.gm__thread {
  width: 1px;
  height: var(--drop);
  background: color-mix(in srgb, var(--color-oro, var(--gm-line)) 80%, transparent);
}
.gm__oval {
  position: relative;
  display: block;
  width: 86%;
  aspect-ratio: 4 / 5;
  padding: 0.5rem;
  border: 1.5px solid var(--gm-line);
  border-radius: 50%;
  background: var(--color-paper, #fdf8f0);
  box-shadow:
    0 0.9rem 1.2rem -0.9rem color-mix(in srgb, var(--color-primary) 60%, transparent),
    inset 0 0 0.9rem color-mix(in srgb, var(--color-primary) 10%, transparent);
  cursor: pointer;
}
.gm__oval::before {
  content: '';
  position: absolute;
  inset: 0.24rem;
  border: 1px solid var(--gm-line-soft);
  border-radius: inherit;
  pointer-events: none;
}
.gm__oval:focus-visible {
  outline: 2px solid var(--color-primary-strong, var(--color-primary));
  outline-offset: 4px;
}
.gm__img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.gm__caption {
  margin-top: 0.4rem;
  font-family: var(--t-caption-font, var(--font-script-mono, var(--font-script)));
  font-size: calc(1.2rem * var(--t-caption-size, 1));
  line-height: 1.1;
  color: var(--t-caption-color, var(--color-primary-strong, var(--color-text)));
}

@container (min-width: 32rem) {
  .gm__board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@keyframes gm-swing {
  from {
    rotate: -2.2deg;
  }
  to {
    rotate: 2.2deg;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gm__hang {
    opacity: 1;
    translate: 0 0;
    transition: none;
  }
  .gm.is-in .gm__hang {
    animation: none;
  }
}
</style>
