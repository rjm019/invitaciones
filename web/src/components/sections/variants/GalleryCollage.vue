<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { decorOr } from '@/services/decorService'
import { galleryItems } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Galería en collage ("collage"): cada foto es una polaroid (marco crema y sombra suave)
 * girada entre -5° y 5° (según su lugar, siempre igual), un poco encimadas, con una cinta
 * washi de color arriba. Entre ellas se intercalan gerberas, cempasúchil y una monarca. Al
 * entrar a la pantalla, las polaroids caen a su lugar escalonadas (translate, rotate y
 * opacity). Al tocar una se abre el visor. Con "menos movimiento" ya están en su lugar.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? null)
const photos = computed(() => galleryItems(props.section.photos, resolveAsset.value))
const opened = ref<number | null>(null)

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { threshold: 0.1 })

// Giros fijos por lugar: nunca cambian entre cargas ni entre pantallas.
const TILTS = [-4, 3, -2, 5, -5, 2, 4, -3]
const TAPES = ['rosa', 'cempasuchil', 'talavera', 'nopal', 'amarillo', 'turquesa']
const flower = computed(() => decorOr(props.section.decor, 'flowers', resolveAsset.value('gerbera.svg')))
const marigold = computed(() =>
  decorOr(props.section.decor, 'marigold', resolveAsset.value('cempasuchil.svg')),
)
const monarch = computed(() => decorOr(props.section.decor, 'monarch', resolveAsset.value('monarca.svg')))
// Qué adorno va después de cada polaroid (cada tercera deja uno entre ella y la siguiente).
const trims = computed(() =>
  [flower.value, marigold.value, monarch.value].filter((src): src is string => !!src),
)
function trimFor(i: number): string | null {
  if (i % 3 !== 1 || !trims.value.length) return null
  return trims.value[Math.floor(i / 3) % trims.value.length] ?? null
}
</script>

<template>
  <div ref="root" class="gc" :class="{ 'is-in': inView }">
    <h2 v-if="title" class="gc__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="gc__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <ul class="gc__board">
      <li
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="gc__item"
        :style="{
          '--tilt': `${TILTS[i % TILTS.length]}deg`,
          '--i': i % 8,
          '--tape': `var(--color-${TAPES[i % TAPES.length]}, var(--color-accent))`,
        }"
      >
        <button
          type="button"
          class="gc__polaroid"
          :aria-label="photo.caption || `Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <span class="gc__tape" aria-hidden="true" />
          <img
            :src="photo.src"
            :srcset="photo.srcset"
            :sizes="photo.srcset ? '(min-width: 34rem) 15rem, 46vw' : undefined"
            :alt="photo.caption"
            class="gc__img fx-photo"
            loading="lazy"
            decoding="async"
          />
          <span v-if="photo.caption" class="gc__caption" data-text="caption">{{ photo.caption }}</span>
        </button>
        <img v-if="trimFor(i)" :src="trimFor(i)!" alt="" class="gc__trim" aria-hidden="true" />
      </li>
    </ul>
    <PhotoViewer v-model:index="opened" :photos="photos" @close="opened = null" />
  </div>
</template>

<style scoped>
.gc {
  --gc-paper: var(--color-paper, #fbf3e2);
  --gc-ink: var(--color-tinta, #3a2420);
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}
.gc__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.gc__subtitle {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.gc__board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6rem 0.4rem;
  width: 100%;
  margin: 0;
  padding: 0.8rem 0.4rem;
  list-style: none;
}
.gc__item {
  position: relative;
  /* un poco encimadas: cada una se mete bajo la anterior */
  margin: -0.4rem 0;
  /* cae a su lugar escalonada */
  opacity: 0;
  transform: translateY(-2.2rem) rotate(calc(var(--tilt) + 10deg));
  transition:
    transform calc(0.7s * var(--motion-scale)) cubic-bezier(0.3, 1.3, 0.5, 1)
      calc(var(--i) * 0.12s * var(--motion-scale)),
    opacity calc(0.5s * var(--motion-scale)) ease calc(var(--i) * 0.12s * var(--motion-scale));
}
.gc.is-in .gc__item {
  opacity: 1;
  transform: rotate(var(--tilt));
}
.gc__item:nth-child(even) {
  margin-top: 1.2rem;
}
.gc__polaroid {
  position: relative;
  display: grid;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.55rem 0.7rem;
  border: 0;
  background: var(--gc-paper);
  box-shadow:
    0 0.5rem 1rem -0.3rem rgb(0 0 0 / 0.4),
    0 0 0 1px rgb(0 0 0 / 0.06);
  cursor: pointer;
  text-align: center;
}
.gc__polaroid:focus-visible {
  outline: 2px solid var(--color-talavera, var(--color-primary));
  outline-offset: 4px;
}
.gc__img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.1);
}
.gc__caption {
  min-height: 1.1em;
  font-family: var(--t-caption-font, var(--font-script));
  font-size: calc(1.2rem * var(--t-caption-size, 1));
  line-height: 1.1;
  color: var(--t-caption-color, var(--gc-ink));
}
/* La cinta washi, atravesada arriba, un poco translúcida y con filo dentado. */
.gc__tape {
  position: absolute;
  top: -0.6rem;
  left: 50%;
  z-index: 1;
  width: 4.2rem;
  height: 1.3rem;
  translate: -50% 0;
  rotate: -3deg;
  background:
    repeating-linear-gradient(45deg, rgb(255 255 255 / 0.28) 0 0.35rem, transparent 0.35rem 0.7rem),
    color-mix(in srgb, var(--tape) 80%, transparent);
  clip-path: polygon(
    0 0,
    100% 0,
    97% 25%,
    100% 50%,
    97% 75%,
    100% 100%,
    0 100%,
    3% 75%,
    0 50%,
    3% 25%
  );
}
/* Adornos intercalados: una flor o la monarca asoma de una esquina de la polaroid. */
.gc__trim {
  position: absolute;
  right: -0.9rem;
  bottom: -1.1rem;
  width: 3.2rem;
  height: 3.2rem;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.25));
}
.gc__item:nth-child(even) .gc__trim {
  right: auto;
  left: -0.9rem;
}

@media (min-width: 34rem) {
  .gc__board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.8rem 0.6rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gc__item {
    opacity: 1;
    transform: rotate(var(--tilt));
    transition: none;
  }
}
</style>
