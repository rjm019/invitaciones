<script setup lang="ts">
import { computed, ref } from 'vue'
import LiveItineraryBanner from '@/components/ui/LiveItineraryBanner.vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useEvent } from '@/composables/useEvent'
import { useLiveItinerary } from '@/composables/useLiveItinerary'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import { ENGRAVED_ICONS, momentDrawing } from '@/services/engravedIconService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario con el sello de la casa ("sello"): un hilo fino baja por el centro y cada
 * momento cuelga de él en zigzag, con su hora en versalitas, la actividad en serif y, del
 * otro lado del hilo, su dibujo de línea (la iglesia, las copas, el plato, el pastel, la
 * pareja que baila, la luna con fuegos, el auto…; momentDrawing lo elige por el ícono o por
 * las palabras). Con "línea que se llena", al bajar la página el hilo se entinta de borgoña
 * y un lacre con el monograma viaja por él; cada momento se enciende al pasar el lacre: su
 * nudo se tiñe, el texto se asienta y el dibujo se traza parte por parte. Sin ese efecto o
 * con menos movimiento todo se ve encendido y el lacre descansa al pie. Con "en vivo", el día
 * del evento marca "Ahora" y atenúa lo pasado (como los demás itinerarios). Solo tokens.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const reduced = useReducedMotion()

const items = computed(() => event.value.itinerary)
const title = computed(() => props.section.title ?? 'Itinerario')
const { live } = useLiveItinerary(
  () => items.value,
  () => event.value.starts_at,
  () => event.value.timezone,
  () => !!props.section.live,
)

const track = ref<HTMLElement | null>(null)
const stops = ref<HTMLElement[]>([])
const { fill, active } = useTimelineProgress(
  track,
  stops,
  () => props.section.effects.includes('timeline-fill') && !reduced.value,
)

const rows = computed(() =>
  items.value.map((item) => ({
    ...item,
    drawing: ENGRAVED_ICONS[momentDrawing(item.icon, item.label)],
  })),
)

// El lacre baja con el hilo (su contenedor mide lo mismo que la lista) y se ladea apenas.
const travelerStyle = computed(() => ({ transform: `translateY(${fill.value * 100}%)` }))
const sealStyle = computed(() => ({ transform: `rotate(${(fill.value - 0.5) * 28}deg)` }))
</script>

<template>
  <div class="isl">
    <h2 class="isl__title" data-text="title">{{ title }}</h2>
    <span class="isl__rule" aria-hidden="true" />
    <LiveItineraryBanner :state="live" :moments="items" />

    <ol ref="track" class="isl__list">
      <span class="isl__thread" aria-hidden="true">
        <span class="isl__thread-fill" :style="{ transform: `scaleY(${fill})` }" />
      </span>
      <span class="isl__traveler" :style="travelerStyle" aria-hidden="true">
        <span class="isl__seal" :style="sealStyle">
          <WaxSeal size="2.7rem" tone="burgundy" :seed="`${section.id}-sello`" />
        </span>
      </span>

      <li
        v-for="(item, i) in rows"
        :key="`${item.time}-${item.label}`"
        class="isl__stop"
        :class="[
          i % 2 === 0 ? 'is-left' : 'is-right',
          {
            'is-on': i < active,
            'is-past': live?.past[i],
            'is-now': live?.current === i,
          },
        ]"
      >
        <span class="isl__text">
          <time class="isl__time" data-text="time" :datetime="item.time">{{
            time12h(item.time)
          }}</time>
          <span class="isl__label" data-text="activity">{{ item.label }}</span>
        </span>
        <span ref="stops" class="isl__node" aria-hidden="true" />
        <span class="isl__art" aria-hidden="true">
          <!-- eslint-disable-next-line vue/no-v-html -- dibujos fijos del código, sin datos del evento -->
          <svg viewBox="0 0 48 48" class="isl__drawing" v-html="item.drawing" />
        </span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.isl {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 0.9rem;
  max-width: 34rem;
  margin: 0 auto;
}
.isl__title {
  margin: 0;
  margin-right: -0.16em;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.5rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.isl__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}

/* Tres columnas: texto | hilo | dibujo (y al revés en los renglones de la derecha). */
.isl__list {
  --node: 2.6rem;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--node) minmax(0, 1fr);
  row-gap: 0.55rem;
  width: 100%;
  margin: 0.4rem 0 0;
  padding: 1.6rem 0 1.9rem;
  list-style: none;
}
.isl__thread {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  translate: -50% 0;
  background: color-mix(in srgb, var(--color-text) 26%, transparent);
}
/* Remates del hilo: un rombo arriba y otro abajo. */
.isl__thread::before,
.isl__thread::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 0.4rem;
  aspect-ratio: 1;
  translate: -50% -50%;
  rotate: 45deg;
  border: 1px solid color-mix(in srgb, var(--color-text) 45%, transparent);
  background: var(--color-bg);
}
.isl__thread::before {
  top: 0;
}
.isl__thread::after {
  top: 100%;
}
.isl__thread-fill {
  position: absolute;
  inset: 0;
  background: var(--color-borgona, var(--color-accent));
  transform-origin: top;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
/* El viajero mide lo que la lista: moverlo un 100 % lo lleva al pie. */
.isl__traveler {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  width: 0;
  height: 100%;
  pointer-events: none;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
.isl__seal {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 2.7rem;
  translate: -50% -50%;
  filter: drop-shadow(0 3px 3px rgb(0 0 0 / 0.25));
  transition: transform calc(0.3s * var(--motion-scale)) ease-out;
}
.isl__seal :deep(.seal) {
  display: block;
}

.isl__stop {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
  align-items: center;
}
.isl__node {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  position: relative;
  z-index: 1;
  width: 0.6rem;
  aspect-ratio: 1;
  rotate: 45deg;
  border: 1px solid color-mix(in srgb, var(--color-text) 55%, transparent);
  background: var(--color-bg);
}
/* El nudo encendido: borgoña, con un destello que se abre una vez. */
.isl__node::before,
.isl__node::after {
  content: '';
  position: absolute;
  inset: -1px;
  background: var(--color-borgona, var(--color-accent));
  opacity: 0;
  transform: scale(0.4);
  transition:
    opacity calc(0.45s * var(--motion-scale)) ease,
    transform calc(0.45s * var(--motion-scale)) var(--ease-out, ease-out);
}
.isl__node::after {
  inset: -0.4rem;
  background: none;
  border: 1px solid var(--color-borgona, var(--color-accent));
}
.is-on .isl__node::before {
  opacity: 1;
  transform: none;
}
.is-on .isl__node::after {
  animation: isl-ring calc(0.9s * var(--motion-scale)) ease-out both;
}
@keyframes isl-ring {
  from {
    opacity: 0.8;
    transform: scale(0.5);
  }
  to {
    opacity: 0;
    transform: scale(1.6);
  }
}

.isl__text {
  grid-row: 1;
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  opacity: 0.35;
  transition:
    opacity calc(0.5s * var(--motion-scale)) ease,
    transform calc(0.6s * var(--motion-scale)) var(--ease-out, ease-out);
}
.isl__art {
  grid-row: 1;
  display: block;
  width: clamp(2.4rem, 11cqi, 3.1rem);
  color: var(--color-text);
}
.is-left .isl__text {
  grid-column: 1;
  padding-inline-end: 0.5rem;
  text-align: end;
  transform: translateX(-0.6rem);
}
.is-left .isl__art {
  grid-column: 3;
  justify-self: start;
  margin-inline-start: 0.4rem;
}
.is-right .isl__text {
  grid-column: 3;
  padding-inline-start: 0.5rem;
  text-align: start;
  transform: translateX(0.6rem);
}
.is-right .isl__art {
  grid-column: 1;
  justify-self: end;
  margin-inline-end: 0.4rem;
}
.is-on .isl__text {
  opacity: 1;
  transform: none;
}
.isl__time {
  font-family: var(--t-time-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.76rem * var(--t-time-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--t-time-color, var(--color-borgona, var(--color-accent)));
}
.isl__label {
  font-family: var(--t-activity-font, var(--font-serif));
  font-size: calc(clamp(1.04rem, 4.4cqi, 1.22rem) * var(--t-activity-size, 1));
  line-height: 1.2;
  color: var(--t-activity-color, var(--color-text));
  overflow-wrap: anywhere;
}

/* El dibujo: se traza parte por parte cuando el lacre pasa. */
.isl__drawing {
  display: block;
  width: 100%;
  height: auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
.isl__drawing :deep(> *) {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.is-on .isl__drawing :deep(> *) {
  animation: isl-draw calc(0.6s * var(--motion-scale)) var(--ease-out, ease-out) both;
}
.is-on .isl__drawing :deep(> :nth-child(2)) {
  animation-delay: calc(0.12s * var(--motion-scale));
}
.is-on .isl__drawing :deep(> :nth-child(3)) {
  animation-delay: calc(0.24s * var(--motion-scale));
}
.is-on .isl__drawing :deep(> :nth-child(4)) {
  animation-delay: calc(0.36s * var(--motion-scale));
}
.is-on .isl__drawing :deep(> :nth-child(n + 5)) {
  animation-delay: calc(0.48s * var(--motion-scale));
}
@keyframes isl-draw {
  from {
    opacity: 0;
    transform: translateY(2px) scale(0.7);
  }
  to {
    opacity: 0.9;
    transform: none;
  }
}

/* En vivo: lo pasado se atenúa y el momento actual late despacio (solo opacity). */
.isl__stop.is-past {
  opacity: 0.45;
}
.isl__stop.is-now .isl__label {
  font-style: italic;
  color: var(--color-borgona, var(--color-accent));
}
.isl__stop.is-now .isl__node::after {
  animation: isl-now calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes isl-now {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.3);
  }
}

/* Ancho (media fila en computadora): más aire entre momentos y dibujos más grandes. */
@container (min-width: 30rem) {
  .isl__list {
    row-gap: 1rem;
  }
  .isl__art {
    width: 3.6rem;
  }
  .isl__label {
    font-size: calc(1.3rem * var(--t-activity-size, 1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .isl__thread-fill,
  .isl__traveler,
  .isl__seal,
  .isl__text {
    transition: none;
  }
  .isl__node::before,
  .isl__node::after {
    transition: none;
  }
  .is-on .isl__node::after,
  .isl__stop.is-now .isl__node::after,
  .is-on .isl__drawing :deep(> *) {
    animation: none;
  }
  .is-on .isl__drawing :deep(> *) {
    opacity: 0.9;
  }
}
</style>
