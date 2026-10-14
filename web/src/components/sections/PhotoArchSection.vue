<script setup lang="ts">
import { computed, ref } from 'vue'
import SpriteDecor from '@/components/ui/SpriteDecor.vue'
import { useEvent } from '@/composables/useEvent'
import { useParallax } from '@/composables/useParallax'
import { useReducedMotion } from '@/composables/useReducedMotion'
import type { ResolvedSection } from '@/types/event'

/**
 * Foto de la festejada (recortada, sin fondo) dentro de un arco dorado: la cabeza sale
 * por arriba del marco. Con "parallax", la foto se mueve un poco más lento que el marco.
 * Las mariposas doradas aletean y las estrellas titilan (SpriteDecor). El título del
 * layout (p. ej. "NAT") va en la esquina de arriba a la izquierda, que queda libre.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const reduced = useReducedMotion()

const photo = computed(() => event.value.media.portrait)
const alt = computed(
  () =>
    `Foto de ${event.value.celebrant.short_name || event.value.celebrant.full_name || 'la festejada'}`,
)

const photoEl = ref<HTMLElement | null>(null)
const offset = useParallax(
  photoEl,
  0.06,
  () => props.section.effects.includes('parallax') && !reduced.value,
)
</script>

<template>
  <div class="photo-arch">
    <h2 v-if="section.title" class="photo-arch__title">{{ section.title }}</h2>
    <SpriteDecor
      v-if="section.decor.butterflies"
      :src="section.decor.butterflies"
      :sprite="section.sprites?.butterflies"
      motion="flutter"
      class="photo-arch__butterflies"
    />
    <SpriteDecor
      v-if="section.decor.stars"
      :src="section.decor.stars"
      :sprite="section.sprites?.stars"
      motion="twinkle"
      class="photo-arch__stars"
    />

    <div class="photo-arch__stack">
      <img
        v-if="section.decor.frame"
        :src="section.decor.frame"
        alt=""
        class="photo-arch__frame"
        loading="lazy"
      />
      <div v-else class="photo-arch__frame photo-arch__frame--css" />
      <img
        v-if="photo"
        ref="photoEl"
        :src="photo"
        :alt="alt"
        class="photo-arch__photo"
        :style="{ transform: offset ? `translateY(${offset}px)` : undefined }"
        loading="lazy"
        decoding="async"
      />
    </div>
  </div>
</template>

<style scoped>
.photo-arch {
  position: relative;
  max-width: 26rem;
  margin: 0 auto;
}
/* Marco y foto en la misma celda, alineados abajo: la foto (más alta) sobresale arriba. */
.photo-arch__stack {
  display: grid;
  justify-items: center;
  align-items: end;
}
.photo-arch__stack > * {
  grid-area: 1 / 1;
}
.photo-arch__frame {
  width: 80%;
}
.photo-arch__frame--css {
  aspect-ratio: 920 / 1395;
  border-radius: 50% 50% 0 0 / 30% 30% 0 0;
  background: linear-gradient(180deg, var(--color-primary-soft), var(--color-primary-strong));
}
.photo-arch__photo {
  position: relative;
  width: 68%;
  max-height: 150cqi;
  margin-bottom: 4%;
  object-fit: contain;
  object-position: bottom;
  will-change: transform;
}
.photo-arch__title {
  position: absolute;
  top: 4%;
  left: 3%;
  z-index: 1;
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 400;
  font-size: clamp(2.2rem, 12cqi, 3.2rem);
  letter-spacing: 0.16em;
  line-height: 1;
  color: var(--color-primary);
}
.photo-arch__stars {
  position: absolute;
  top: 6%;
  right: 0;
  width: 30%;
  z-index: 1;
  pointer-events: none;
}
.photo-arch__butterflies {
  position: absolute;
  top: 34%;
  left: -2%;
  width: 26%;
  z-index: 1;
  pointer-events: none;
}
</style>
