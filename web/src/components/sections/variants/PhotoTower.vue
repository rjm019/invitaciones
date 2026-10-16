<script setup lang="ts">
import { computed, ref } from 'vue'
import SpriteDecor from '@/components/ui/SpriteDecor.vue'
import { useEvent } from '@/composables/useEvent'
import { useParallax } from '@/composables/useParallax'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { decorOr } from '@/services/decorService'
import { TITLE_SPARKLES } from '@/themes/_shared/sprites'
import type { ResolvedSection } from '@/types/event'

/**
 * Foto de Nueva York ("ventana"): la foto en la silueta de la punta de un rascacielos art
 * déco (escalonada, como el Empire State), con filo plateado. Detrás, la noche y la
 * ciudad: una foto sin fondo queda frente a Manhattan. Las iniciales van en un medallón
 * sobre el escalón más alto. Con "parallax", la foto se mueve un poco más lento.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const photo = computed(() => props.section.image ?? event.value.media.portrait)
const alt = computed(
  () =>
    `Foto de ${event.value.celebrant.short_name || event.value.celebrant.full_name || 'la festejada'}`,
)
const stars = computed(() =>
  decorOr(props.section.decor, 'stars', resolveAsset.value('destellos-titulo.svg')),
)
const starSprite = computed(() =>
  'stars' in props.section.decor ? props.section.sprites?.stars : TITLE_SPARKLES,
)

const photoEl = ref<HTMLElement | null>(null)
const offset = useParallax(
  photoEl,
  0.06,
  () => props.section.effects.includes('parallax') && !reduced.value,
)
</script>

<template>
  <div class="ny-window">
    <SpriteDecor
      v-if="stars"
      :src="stars"
      :sprite="starSprite"
      motion="twinkle"
      class="ny-window__stars"
    />
    <div class="ny-window__tower">
      <div class="ny-window__glass">
        <span class="ny-window__city" aria-hidden="true" />
        <img
          v-if="photo"
          ref="photoEl"
          :src="photo"
          :alt="alt"
          class="ny-window__photo"
          :style="{ transform: offset ? `translateY(${offset}px)` : undefined }"
          loading="lazy"
          decoding="async"
        />
      </div>
      <h2 v-if="section.title" class="ny-window__medal" data-text="title">{{ section.title }}</h2>
    </div>
  </div>
</template>

<style scoped>
.ny-window {
  --tower: polygon(
    0 100%,
    0 26%,
    9% 26%,
    9% 17%,
    21% 17%,
    21% 9%,
    35% 9%,
    35% 2%,
    65% 2%,
    65% 9%,
    79% 9%,
    79% 17%,
    91% 17%,
    91% 26%,
    100% 26%,
    100% 100%
  );
  container-type: inline-size;
  position: relative;
  width: min(100%, 21rem);
  margin: 0 auto;
}
.ny-window__stars {
  position: absolute;
  inset: -6% -12% auto;
  z-index: 2;
  pointer-events: none;
}
/* El filo: la misma silueta un poco más grande, en plata, detrás del vidrio. */
.ny-window__tower {
  position: relative;
  aspect-ratio: 3 / 4;
  padding: 3px;
  clip-path: var(--tower);
  background: linear-gradient(
    160deg,
    var(--color-primary-soft),
    var(--color-primary) 45%,
    var(--color-primary-strong) 60%,
    var(--color-primary)
  );
  filter: drop-shadow(0 1rem 1.6rem rgb(0 0 0 / 0.5));
}
.ny-window__glass {
  position: relative;
  height: 100%;
  overflow: hidden;
  clip-path: var(--tower);
  background: radial-gradient(
    120% 70% at 50% 30%,
    color-mix(in srgb, var(--color-primary) 22%, var(--color-night)),
    var(--color-night) 70%
  );
}
/* La ciudad al fondo (la misma máscara del horizonte de la orilla de las franjas). */
.ny-window__city {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38%;
  background: color-mix(in srgb, var(--color-primary) 30%, var(--color-night));
  -webkit-mask: url('../../../effects/assets/borde-arriba.svg') 0 100% / auto 100% repeat-x;
  mask: url('../../../effects/assets/borde-arriba.svg') 0 100% / auto 100% repeat-x;
}
.ny-window__photo {
  position: absolute;
  inset: 6% 0 0;
  width: 100%;
  height: 94%;
  object-fit: cover;
  object-position: center top;
}
/* Las iniciales en un medallón sobre el escalón más alto. */
.ny-window__medal {
  position: absolute;
  top: 4%;
  left: 50%;
  display: grid;
  place-items: center;
  min-width: 3.2rem;
  height: 3.2rem;
  margin: 0;
  padding: 0 0.6rem;
  translate: -50% 0;
  border: 1px solid var(--color-primary);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-night) 80%, transparent);
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(1.3rem * var(--t-title-size, 1));
  letter-spacing: 0.08em;
  color: var(--t-title-color, var(--color-primary-soft));
}
</style>
