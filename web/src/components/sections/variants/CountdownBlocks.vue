<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { motionScale } from '@/composables/useMotionScale'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { pad2 } from '@/services/countdownService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cuenta regresiva en cubos de juguete (`cubos`): cuatro cubos de madera (días, horas, minutos
 * y segundos) en hilera, vistos de frente con un poco de volumen: la cara de arriba y la
 * lateral se asoman, con las esquinas redondeadas y un borde pintado. Cada uno es de un color
 * pastel de la paleta, apenas girado y a distinta altura, como recién apilados. El número va
 * en la cara de frente y la etiqueta debajo. Cuando un número cambia, su cubo da un cuarto de
 * vuelta (rotateX con perspectiva propia): sale la cara vieja y entra la nueva con un rebote
 * corto. Con "menos movimiento" los cubos no giran: el número cambia en su lugar. Sirve en
 * cualquier tema: los colores salen de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const title = computed(() => props.section.title ?? 'Inicia la cuenta regresiva')
const units = computed(() => [
  { value: String(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos' },
])

// Cada cubo tiene cuatro caras alrededor del eje X; la de frente es la `turn % 4`. Al cambiar
// el número se escribe en la cara de arriba (la que viene) y se da el cuarto de vuelta.
type Cube = { turn: number; faces: string[]; turning: boolean }
const cubes = ref<Cube[]>(
  units.value.map((u) => ({ turn: 0, faces: [u.value, '', '', ''], turning: false })),
)
const timers: ReturnType<typeof setTimeout>[] = []
watch(
  () => units.value.map((u) => u.value),
  (now, before) => {
    now.forEach((value, i) => {
      if (value === before[i]) return
      const cube = cubes.value[i]!
      // La cara que quedará arriba se vacía de una vez: solo se ve el número que entra.
      cube.faces[(cube.turn + 2) % 4] = ''
      cube.faces[(cube.turn + 1) % 4] = value
      cube.turn += 1
      cube.turning = true
      timers.push(setTimeout(() => (cube.turning = false), 700 * motionScale()))
    })
  },
)
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="cb">
    <h2 class="cb__title" data-text="title">{{ title }}</h2>

    <p v-if="left.isOver" class="cb__today">¡Hoy es el gran día!</p>
    <div v-else class="cb__row" role="timer" aria-live="off">
      <div v-for="(unit, i) in units" :key="unit.label" class="cb__item" :class="`cb__item--${i}`">
        <div class="cb__scene" aria-hidden="true">
          <div class="cb__cube" :class="{ 'is-turning': cubes[i]!.turning }">
            <div class="cb__spin" :style="{ '--turn': cubes[i]!.turn }">
              <div
                v-for="f in 4"
                :key="f"
                class="cb__face cb__face--front"
                :style="{ '--f': f - 1 }"
              >
                <span class="cb__number" data-text="digits">{{ cubes[i]!.faces[f - 1] }}</span>
              </div>
              <div class="cb__face cb__face--side cb__face--right" />
              <div class="cb__face cb__face--side cb__face--left" />
            </div>
          </div>
        </div>
        <span class="cb__label" data-text="units">{{ unit.label }}</span>
        <span class="cb__sr">{{ unit.value }} {{ unit.label }}</span>
      </div>
    </div>

    <p v-if="section.text" class="cb__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.cb {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.cb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 3rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.cb__row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
  gap: clamp(0.5rem, 3cqi, 1.6rem);
  width: min(100cqi, 40rem);
  padding: 1.4rem 0.4rem 0.4rem;
}
.cb__item {
  position: relative;
  --s: clamp(3.4rem, 19cqi, 7rem);
  display: grid;
  justify-items: center;
  gap: 0.85rem;
  /* Cada color es un pastel de la paleta; el borde, el mismo más oscuro. */
  --c: color-mix(in srgb, var(--color-primary) 42%, #fff);
}
.cb__item--1 {
  --c: var(--color-durazno, color-mix(in srgb, var(--color-accent) 30%, #fff));
}
.cb__item--2 {
  --c: var(--color-cielo, color-mix(in srgb, var(--color-accent) 55%, #fff));
}
.cb__item--3 {
  --c: var(--color-mantequilla, color-mix(in srgb, var(--color-oro, var(--color-primary)) 32%, #fff));
}
/* Apenas girados y a distinta altura, como recién apilados. */
.cb__item--0 .cb__scene {
  rotate: -3deg;
  translate: 0 0.2rem;
}
.cb__item--1 .cb__scene {
  rotate: 2.4deg;
  translate: 0 -0.7rem;
}
.cb__item--2 .cb__scene {
  rotate: -1.6deg;
  translate: 0 0.35rem;
}
.cb__item--3 .cb__scene {
  rotate: 3.4deg;
  translate: 0 -0.35rem;
}
.cb__scene {
  width: var(--s);
  height: var(--s);
  /* Perspectiva propia: cada cubo gira como si fuera el único. */
  perspective: calc(var(--s) * 7);
}
/* La inclinación fija deja ver la cara de arriba y la lateral. */
.cb__cube {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(-17deg) rotateY(-24deg);
}
.cb__cube.is-turning {
  animation: cb-hop calc(0.46s * var(--motion-scale)) ease-out;
}
.cb__spin {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--s) / -2)) rotateX(calc(var(--turn) * -90deg));
  transition: transform calc(0.42s * var(--motion-scale)) cubic-bezier(0.3, 1.45, 0.5, 1);
}
.cb__face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 2px solid color-mix(in srgb, var(--c) 62%, #5a4640);
  border-radius: calc(var(--s) * 0.13);
  background:
    radial-gradient(ellipse at 30% 22%, rgb(255 255 255 / 0.55), transparent 62%),
    var(--c);
  box-shadow: inset 0 0 0 calc(var(--s) * 0.05) color-mix(in srgb, var(--c) 82%, #fff);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.cb__face--front {
  transform: rotateX(calc(var(--f) * 90deg)) translateZ(calc(var(--s) / 2));
}
/* Los costados, un poco más oscuros: les da la sombra del volumen. */
.cb__face--side {
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.12), rgb(0 0 0 / 0.1)),
    color-mix(in srgb, var(--c) 82%, #5a4640);
  box-shadow: none;
}
.cb__face--right {
  transform: rotateY(90deg) translateZ(calc(var(--s) / 2));
}
.cb__face--left {
  transform: rotateY(-90deg) translateZ(calc(var(--s) / 2));
}
.cb__number {
  font-family: var(--t-digits-font, var(--font-button, var(--font-serif)));
  font-weight: 800;
  font-size: calc(var(--s) * 0.46 * var(--t-digits-size, 1));
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1;
  color: var(--t-digits-color, var(--color-text));
}
.cb__label {
  font-family: var(--t-units-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(0.62rem, 3cqi, 0.82rem) * var(--t-units-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-units-color, var(--color-text));
}
.cb__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.cb__today,
.cb__text {
  max-width: 26rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
@keyframes cb-hop {
  0%,
  100% {
    translate: 0 0;
  }
  38% {
    translate: 0 -0.4rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cb__cube.is-turning {
    animation: none;
  }
  .cb__spin {
    transition: none;
  }
}
</style>
