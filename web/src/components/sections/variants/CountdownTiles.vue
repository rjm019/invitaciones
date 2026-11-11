<script setup lang="ts">
import { computed } from 'vue'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { pad2 } from '@/services/countdownService'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cuenta regresiva en azulejos (`azulejos`): cuatro azulejos cuadrados (días, horas,
 * minutos y segundos) de fondo crema con filo doble de talavera, esquinitas azules y un
 * dibujo de azulejo muy tenue detrás del número, que se lee siempre. Entre ellos, una
 * florecita. Cuando un número cambia, su azulejo da un saltito (scale). Sirve en cualquier
 * tema: el azulejo y las flores salen de la ranura de adorno o de los compartidos.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const title = computed(() => props.section.title ?? 'Inicia la cuenta regresiva')
const tileArt = computed(() => {
  const own = decorOr(props.section.decor, 'tile', null)
  if (own) return [own, own, own, own]
  if ('tile' in props.section.decor) return []
  return [1, 2, 3, 4].map((n) => resolveAsset.value(`azulejo-${n}.svg`))
})
const units = computed(() => [
  { value: String(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos' },
])
const flower = computed(() =>
  decorOr(props.section.decor, 'flowers', resolveAsset.value('gerbera.svg')),
)
</script>

<template>
  <div class="ct">
    <h2 class="ct__title" data-text="title">{{ title }}</h2>

    <p v-if="left.isOver" class="ct__today">¡Hoy es el gran día!</p>
    <div v-else class="ct__board" role="timer" aria-live="off">
      <div class="ct__grid">
        <div
          v-for="(unit, i) in units"
          :key="`${unit.label}-${unit.value}`"
          class="ct__tile"
          data-cascade
        >
          <img v-if="tileArt[i]" :src="tileArt[i]" alt="" class="ct__art" loading="lazy" />
          <span class="ct__number" data-text="digits">{{ unit.value }}</span>
          <span class="ct__label" data-text="units">{{ unit.label }}</span>
        </div>
      </div>
      <template v-if="flower">
        <img :src="flower" alt="" class="ct__flower ct__flower--a" loading="lazy" />
        <img :src="flower" alt="" class="ct__flower ct__flower--b" loading="lazy" />
        <img :src="flower" alt="" class="ct__flower ct__flower--c" loading="lazy" />
      </template>
    </div>

    <p v-if="section.text" class="ct__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.ct {
  --ct-blue: var(--color-talavera, var(--color-primary));
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.ct__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 3rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.ct__board {
  position: relative;
  width: min(100cqi, 34rem);
}
/* Celular: 2 × 2; ancho: los cuatro en fila. */
.ct__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}
.ct__tile {
  position: relative;
  isolation: isolate;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.15rem;
  aspect-ratio: 1;
  overflow: hidden;
  border: 3px solid var(--ct-blue);
  border-radius: 0.35rem;
  background:
    radial-gradient(circle at 0 0, var(--ct-blue) 0 0.7rem, transparent 0.75rem),
    radial-gradient(circle at 100% 0, var(--ct-blue) 0 0.7rem, transparent 0.75rem),
    radial-gradient(circle at 0 100%, var(--ct-blue) 0 0.7rem, transparent 0.75rem),
    radial-gradient(circle at 100% 100%, var(--ct-blue) 0 0.7rem, transparent 0.75rem),
    var(--color-paper, #fbf3e2);
  box-shadow:
    inset 0 0 0 3px var(--color-paper, #fbf3e2),
    inset 0 0 0 4px var(--ct-blue),
    0 0.5rem 0.9rem -0.5rem rgb(0 0 0 / 0.45);
  animation: ct-hop calc(0.5s * var(--motion-scale)) ease-out;
}
/* El dibujo de azulejo, muy tenue, para que el número se lea. */
.ct__art {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.16;
}
.ct__number {
  font-family: var(--t-digits-font, var(--font-display));
  font-size: calc(clamp(2.2rem, 15cqi, 3.6rem) * var(--t-digits-size, 1));
  line-height: 1;
  color: var(--t-digits-color, var(--ct-blue));
  font-variant-numeric: tabular-nums;
}
.ct__label {
  font-family: var(--t-units-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(0.62rem, 3cqi, 0.8rem) * var(--t-units-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-units-color, var(--color-tinta, #3a2420));
}
/* Florecitas en los huecos entre los azulejos. */
.ct__flower {
  position: absolute;
  top: 50%;
  width: 2.1rem;
  height: auto;
  translate: -50% -50%;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
  pointer-events: none;
}
.ct__flower--a,
.ct__flower--c {
  display: none;
}
.ct__flower--b {
  left: 50%;
}
@container (min-width: 30rem) {
  .ct__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.1rem;
  }
  .ct__flower--a,
  .ct__flower--c {
    display: block;
  }
  .ct__flower--a {
    left: 25%;
  }
  .ct__flower--c {
    left: 75%;
  }
  .ct__number {
    font-size: calc(clamp(1.6rem, 6cqi, 2.4rem) * var(--t-digits-size, 1));
  }
}
.ct__today,
.ct__text {
  max-width: 26rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
@keyframes ct-hop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.07);
  }
  100% {
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ct__tile {
    animation: none;
  }
}
</style>
