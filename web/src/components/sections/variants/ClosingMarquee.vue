<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre de Nueva York ("marquesina"): la despedida en la marquesina de un teatro de
 * Broadway, con su fila de focos alrededor que se encienden por turnos (dos capas de focos
 * que se alternan: solo opacity). Arriba, la corona del Chrysler; abajo, el texto final.
 */
const props = defineProps<{ section: ResolvedSection }>()
const title = computed(() => props.section.title ?? '¡Te esperamos!')
</script>

<template>
  <div class="ny-marquee">
    <img v-if="section.decor.crown" :src="section.decor.crown" alt="" class="ny-marquee__crown" />
    <div class="ny-marquee__board">
      <span class="ny-marquee__bulbs ny-marquee__bulbs--a" aria-hidden="true" />
      <span class="ny-marquee__bulbs ny-marquee__bulbs--b" aria-hidden="true" />
      <h2 class="ny-marquee__title" data-text="title">{{ title }}</h2>
    </div>
    <p v-if="section.text" class="ny-marquee__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.ny-marquee {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
.ny-marquee__crown {
  width: 2.6rem;
  margin-bottom: -0.6rem;
}
.ny-marquee__board {
  --bulb: 0.42rem;
  --gap: 1.15rem;
  position: relative;
  width: min(100%, 21rem);
  padding: 2.2rem 1.8rem;
  border: 2px solid var(--color-primary);
  border-radius: 0.5rem;
  background: radial-gradient(
    80% 90% at 50% 50%,
    color-mix(in srgb, var(--color-primary) 16%, var(--color-night)),
    var(--color-night)
  );
  box-shadow:
    0 0 0 0.35rem color-mix(in srgb, var(--color-night) 85%, var(--color-primary)),
    0 0 0 calc(0.35rem + 1px) var(--color-primary),
    0 1.4rem 2.6rem rgb(0 0 0 / 0.55);
}
/*
 * Los focos: dos filas de puntos alrededor del letrero (corridas medio espacio) que se
 * prenden por turnos; así parece que la luz corre.
 */
.ny-marquee__bulbs {
  position: absolute;
  inset: 0.55rem;
  border-radius: 0.3rem;
  pointer-events: none;
  --dot: radial-gradient(
    circle,
    #fff 0 calc(var(--bulb) * 0.35),
    var(--color-primary-soft) calc(var(--bulb) * 0.55),
    transparent calc(var(--bulb) * 1.1)
  );
  background:
    var(--dot) 0 0 / var(--gap) calc(var(--bulb) * 2.2) repeat-x,
    var(--dot) 0 100% / var(--gap) calc(var(--bulb) * 2.2) repeat-x,
    var(--dot) 0 0 / calc(var(--bulb) * 2.2) var(--gap) repeat-y,
    var(--dot) 100% 0 / calc(var(--bulb) * 2.2) var(--gap) repeat-y;
  animation: ny-bulbs calc(1.2s * var(--motion-scale)) steps(1, end) infinite;
}
/* La segunda fila, corrida medio espacio en cada orilla (entre foco y foco de la primera). */
.ny-marquee__bulbs--b {
  background-position:
    calc(var(--gap) / 2) 0,
    calc(var(--gap) / 2) 100%,
    0 calc(var(--gap) / 2),
    100% calc(var(--gap) / 2);
  animation-delay: calc(-0.6s * var(--motion-scale));
}
@keyframes ny-bulbs {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
.ny-marquee__title {
  position: relative;
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.4rem, 13cqi, 3.4rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary-soft));
  text-shadow: 0 0 0.35em color-mix(in srgb, var(--color-primary-soft) 55%, transparent);
}
.ny-marquee__text {
  max-width: 22rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(1.05rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
@media (prefers-reduced-motion: reduce) {
  .ny-marquee__bulbs {
    animation: none;
  }
}
</style>
