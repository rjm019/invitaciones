<script setup lang="ts">
import { computed } from 'vue'
import RibbonBow from '@/components/ui/RibbonBow.vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Foto en retrato (`retrato`): la foto recortada en un óvalo con doble filete del color del
 * listón (como el medallón de la bendición), colgada de un moño de listón con dos tiras que
 * bajan hasta el óvalo. Todo el conjunto se mece muy despacio como un cuadro colgado: un
 * péndulo desde el moño (rotate de ±1.5°). Una ramita con margaritas abraza el pie del óvalo.
 * El título y el texto van debajo. Sin foto, el óvalo queda vacío, como en los otros diseños
 * de foto. Con "menos movimiento" el cuadro cuelga quieto. Sirve en cualquier tema: el filete
 * y el listón salen del primario de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const photo = computed(() => props.section.image ?? event.value.media.portrait)
const alt = computed(
  () =>
    `Foto de ${event.value.celebrant.short_name || event.value.celebrant.full_name || 'la festejada'}`,
)
const sprig = computed(() => decorOr(props.section.decor, 'sprig', resolveAsset.value('ramita.svg')))
const daisy = computed(() =>
  decorOr(props.section.decor, 'daisy', resolveAsset.value('margarita.svg')),
)
</script>

<template>
  <div class="pp">
    <div class="pp__hang">
      <RibbonBow class="pp__bow" sway size="5.6rem" />
      <!-- Las dos tiras de listón: salen del nudo y bajan al óvalo. -->
      <svg class="pp__straps" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 0C44 14 34 28 30 41" class="pp__strap" />
        <path d="M50 0C56 14 66 28 70 41" class="pp__strap" />
        <path d="M50 0C44 14 34 28 30 41" class="pp__strap-shine" />
        <path d="M50 0C56 14 66 28 70 41" class="pp__strap-shine" />
      </svg>
      <div class="pp__oval">
        <div class="pp__window">
          <img v-if="photo" :src="photo" :alt="alt" class="pp__photo fx-photo" decoding="async" />
        </div>
      </div>
      <div v-if="sprig || daisy" class="pp__foot" aria-hidden="true">
        <img v-if="sprig" :src="sprig" alt="" class="pp__sprig" loading="lazy" />
        <img v-if="daisy" :src="daisy" alt="" class="pp__daisy" loading="lazy" />
        <img v-if="sprig" :src="sprig" alt="" class="pp__sprig pp__sprig--r" loading="lazy" />
      </div>
    </div>
    <h2 v-if="section.title" class="pp__title" data-text="title">{{ section.title }}</h2>
    <p v-if="section.text" class="pp__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.pp {
  --pp-line: var(--color-primary);
  --pp-line-soft: color-mix(in srgb, var(--color-primary) 55%, var(--color-paper, #fdf8f0));
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  container-type: inline-size;
  text-align: center;
}
/* El cuadro cuelga del moño: el péndulo gira desde arriba. */
.pp__hang {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100cqi, 17.5rem);
  padding-bottom: 2.2rem;
  transform-origin: 50% 0;
  animation: pp-swing calc(7s * var(--motion-scale)) ease-in-out infinite alternate;
}
.pp__bow {
  position: relative;
  z-index: 2;
  margin-bottom: -1.7rem;
}
.pp__straps {
  position: relative;
  z-index: 1;
  width: 62%;
  height: 3.6rem;
  margin-bottom: -0.35rem;
  overflow: visible;
}
.pp__strap {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.pp__strap-shine {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.45;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  transform: translateX(-1px);
}
/* El óvalo: crema, con un filete y, por dentro, otro más fino; la foto va dentro. */
.pp__oval {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 4 / 5;
  padding: 0.85rem;
  border: 1.5px solid var(--pp-line);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 0.7), transparent 60%),
    var(--color-paper, #fdf8f0);
  box-shadow:
    0 1.1rem 1.8rem -1.1rem color-mix(in srgb, var(--color-primary) 60%, transparent),
    inset 0 0 1.2rem color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.pp__oval::before {
  content: '';
  position: absolute;
  inset: 0.4rem;
  border: 1px solid var(--pp-line-soft);
  border-radius: inherit;
  pointer-events: none;
}
.pp__window {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-paper, #fdf8f0));
}
.pp__photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
}
/* Ramita con margaritas al pie, abrazando el óvalo. */
.pp__foot {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 78%;
  translate: -50% 0;
  pointer-events: none;
}
.pp__sprig {
  width: 40%;
  height: auto;
  margin-bottom: 0.3rem;
  rotate: 8deg;
  transform-origin: 100% 50%;
}
.pp__sprig--r {
  scale: -1 1;
}
.pp__daisy {
  width: 2.1rem;
  height: 2.1rem;
  margin: 0 -0.3rem 0.2rem;
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.18));
}
.pp__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 11cqi, 2.8rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
.pp__text {
  max-width: 26rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
@keyframes pp-swing {
  from {
    transform: rotate(-1.5deg);
  }
  to {
    transform: rotate(1.5deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pp__hang {
    animation: none;
  }
}
</style>
