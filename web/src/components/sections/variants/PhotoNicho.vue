<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { useParallax } from '@/composables/useParallax'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Foto en nicho (`nicho`): la foto recortada en arco detrás de un marco de hojalata repujada
 * (la imagen del marco va encima y su hueco es transparente), con gerberas y cempasúchil
 * abrazando las esquinas de abajo y una monarca posada arriba. El título y el texto van
 * debajo. Con "parallax", la foto se mueve un poco más lento que el marco. Sirve en cualquier
 * tema: cada dibujo es una ranura de adorno. La foto no es de carga diferida (`lazy`): con
 * ella, el hueco del marco podía quedar gris si la foto llegaba tarde al pasar de largo.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const photo = computed(() => props.section.image ?? event.value.media.portrait)
const alt = computed(
  () =>
    `Foto de ${event.value.celebrant.short_name || event.value.celebrant.full_name || 'la festejada'}`,
)
const asset = (slot: string, file: string) =>
  decorOr(props.section.decor, slot, resolveAsset.value(file))
const frame = computed(() => asset('tin', 'hojalata.svg'))
const gerbera = computed(() => asset('flowers', 'gerbera.svg'))
const marigold = computed(() => asset('marigold', 'cempasuchil.svg'))
const monarch = computed(() => asset('monarch', 'monarca.svg'))

const photoEl = ref<HTMLElement | null>(null)
const offset = useParallax(
  photoEl,
  0.06,
  () => props.section.effects.includes('parallax') && !reduced.value,
)
</script>

<template>
  <div class="pn">
    <div class="pn__stack">
      <!-- La foto, recortada en arco al tamaño del hueco del marco (en %). -->
      <div class="pn__window">
        <img
          v-if="photo"
          ref="photoEl"
          :src="photo"
          :alt="alt"
          class="pn__photo"
          :style="{ transform: offset ? `translateY(${offset}px)` : undefined }"
          decoding="async"
        />
      </div>
      <img v-if="frame" :src="frame" alt="" class="pn__frame" loading="lazy" />
      <img v-if="gerbera" :src="gerbera" alt="" class="pn__flower pn__flower--left" loading="lazy" />
      <img v-if="marigold" :src="marigold" alt="" class="pn__flower pn__flower--right" loading="lazy" />
      <img v-if="monarch" :src="monarch" alt="" class="pn__monarch" loading="lazy" />
    </div>
    <h2 v-if="section.title" class="pn__title" data-text="title">{{ section.title }}</h2>
    <p v-if="section.text" class="pn__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.pn {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  container-type: inline-size;
  text-align: center;
}
.pn__stack {
  position: relative;
  width: min(100cqi, 22rem);
  aspect-ratio: 3 / 4;
  /* Espacio arriba para la monarca y a los lados para las flores. */
  margin-top: 1.2rem;
}
/* El hueco del marco: x 16.7–83.3 %, y 17.5–89 %; la foto entra un poquito de más. */
.pn__window {
  position: absolute;
  left: 15.5%;
  top: 16.3%;
  width: 69%;
  height: 73.6%;
  overflow: hidden;
  border-radius: 999px 999px 0 0;
  background: color-mix(in srgb, var(--color-tinta, #3a2420) 25%, var(--color-paper, #fbf3e2));
}
.pn__photo {
  position: absolute;
  inset: -5% 0 auto;
  display: block;
  width: 100%;
  height: 110%;
  object-fit: cover;
  object-position: center top;
}
.pn__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  filter: drop-shadow(0 6px 9px rgb(0 0 0 / 0.35));
  pointer-events: none;
}
.pn__flower {
  position: absolute;
  bottom: 0;
  height: auto;
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
  pointer-events: none;
}
.pn__flower--left {
  left: -7%;
  width: 34%;
  rotate: -10deg;
}
.pn__flower--right {
  right: -7%;
  bottom: 3%;
  width: 31%;
  rotate: 12deg;
}
.pn__monarch {
  position: absolute;
  left: 50%;
  top: -3%;
  width: 16%;
  height: auto;
  translate: -50% 0;
  rotate: -8deg;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
  transform-origin: 50% 80%;
  animation: pn-flutter calc(5s * var(--motion-scale)) ease-in-out infinite alternate;
  pointer-events: none;
}
.pn__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 10cqi, 2.6rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.pn__text {
  max-width: 26rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
@keyframes pn-flutter {
  from {
    transform: translateY(0) rotate(-4deg);
  }
  to {
    transform: translateY(-0.3rem) rotate(5deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pn__monarch {
    animation: none;
  }
}
</style>
