<script setup lang="ts">
import { computed, ref } from 'vue'
import LiveItineraryBanner from '@/components/ui/LiveItineraryBanner.vue'
import { useEvent } from '@/composables/useEvent'
import { useLiveItinerary } from '@/composables/useLiveItinerary'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario de tendedero de ropita (`ropita`): una cuerda baja en zigzag por la sección
 * (cada tramo cruza de un lado al otro con una ligera comba y da la vuelta en la orilla) y
 * cada momento es una prenda colgada con dos pinzas (se turnan mameluco, babero, calcetines,
 * gorrito y vestido, en acuarela). La prenda va de un lado y la actividad del otro, y se
 * alternan; la hora va en una etiquetita de papel cosida a la prenda. Cada prenda se mece con
 * la brisa desde sus pinzas (la fase sale de su lugar). Con "línea que se llena", cada prenda
 * se cuelga cuando la cuerda llega a ella (cae con un balanceo que se amortigua; antes está
 * tenue). Con "en vivo", el día del evento el momento actual se resalta y lo pasado se
 * atenúa, igual que en los otros itinerarios. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const items = computed(() => event.value.itinerary)
const title = computed(() => props.section.title ?? 'Itinerario')
const peg = computed(() => resolveAsset.value('pinza.svg'))

const { live } = useLiveItinerary(
  () => items.value,
  () => event.value.starts_at,
  () => event.value.timezone,
  () => !!props.section.live,
)

// Cada tramo de cuerda es el "punto" que enciende la prenda cuando el scroll llega a él.
const fillOn = computed(() => props.section.effects.includes('timeline-fill') && !reduced.value)
const track = ref<HTMLElement | null>(null)
const stops = ref<HTMLElement[]>([])
const { active } = useTimelineProgress(track, stops, () => fillOn.value)

const rows = computed(() =>
  items.value.map((item, i) => ({
    ...item,
    garment: resolveAsset.value(`ropita-${(i % 5) + 1}.svg`),
  })),
)
</script>

<template>
  <div class="ic" :class="{ 'ic--drop': fillOn }">
    <h2 class="ic__title" data-text="title">{{ title }}</h2>
    <LiveItineraryBanner :state="live" :moments="items" />

    <ol ref="track" class="ic__list">
      <li
        v-for="(item, i) in rows"
        :key="`${item.time}-${item.label}`"
        class="ic__stop"
        :class="[
          i % 2 === 0 ? 'is-left' : 'is-right',
          { 'is-lit': i < active, 'is-past': live?.past[i], 'is-now': live?.current === i },
        ]"
        :style="{ '--i': i }"
        data-cascade
      >
        <!-- Un tramo de la cuerda, con su comba; la vuelta de la orilla la dibuja el ::after. -->
        <svg
          ref="stops"
          class="ic__rope"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 3Q50 21 100 3" class="ic__twine" />
        </svg>

        <div class="ic__garment">
          <div class="ic__sway">
            <img v-if="item.garment" :src="item.garment" alt="" class="ic__img" loading="lazy" />
            <template v-if="peg">
              <img :src="peg" alt="" class="ic__peg ic__peg--a" aria-hidden="true" />
              <img :src="peg" alt="" class="ic__peg ic__peg--b" aria-hidden="true" />
            </template>
            <time class="ic__tag" data-text="time" :datetime="item.time">{{
              time12h(item.time)
            }}</time>
          </div>
        </div>

        <p class="ic__label" data-text="activity">{{ item.label }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ic {
  --ic-twine: color-mix(in srgb, var(--color-oro, var(--color-primary)) 80%, var(--color-text));
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  max-width: 30rem;
  margin: 0 auto;
}
.ic__title {
  margin: 0 0 var(--space-2);
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.3rem, 12cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
/* Las vueltas de la cuerda caben en el relleno de la lista. */
.ic__list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  margin: 0;
  padding: 0.2rem 1.5rem 0;
  list-style: none;
}
.ic__stop {
  position: relative;
  display: grid;
  grid-template-columns: 7.6rem minmax(0, 1fr);
  align-items: center;
  column-gap: 0.8rem;
  min-height: 9.6rem;
}
.ic__stop.is-right {
  grid-template-columns: minmax(0, 1fr) 7.6rem;
}
.ic__stop.is-right .ic__garment {
  order: 2;
}
.ic__stop.is-past {
  opacity: 0.55;
}

/* La cuerda: un tramo con comba arriba de cada fila y, en la orilla, la vuelta hacia la fila de abajo. */
.ic__rope {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1.2rem;
  overflow: visible;
  pointer-events: none;
}
.ic__twine {
  fill: none;
  stroke: var(--ic-twine);
  stroke-width: 2;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.ic__stop:not(:last-child)::after {
  content: '';
  position: absolute;
  top: calc(0.15rem - 1px);
  width: 1.5rem;
  height: 100%;
  border: 2px solid var(--ic-twine);
  pointer-events: none;
}
.ic__stop.is-left:not(:last-child)::after {
  right: -1.5rem;
  border-left: 0;
  border-radius: 0 1.5rem 1.5rem 0;
}
.ic__stop.is-right:not(:last-child)::after {
  left: -1.5rem;
  border-right: 0;
  border-radius: 1.5rem 0 0 1.5rem;
}

/* La prenda: cuelga de dos pinzas; al llegar la cuerda cae y se amortigua. */
.ic__garment {
  align-self: start;
  position: relative;
  margin-top: 0.7rem;
  width: 7.6rem;
}
.ic__sway {
  position: relative;
  transform-origin: 50% 0;
  animation: ic-sway calc((5s + var(--i) * 0.5s) * var(--motion-scale)) ease-in-out
    calc(var(--i) * -1.7s * var(--motion-scale)) infinite alternate;
}
.ic__img {
  display: block;
  width: 100%;
  height: 6.6rem;
  object-fit: contain;
  object-position: 50% 0;
  filter: drop-shadow(0 0.3rem 0.3rem rgb(0 0 0 / 0.12));
}
.ic__peg {
  position: absolute;
  top: -0.6rem;
  width: 0.5rem;
  height: auto;
}
.ic__peg--a {
  left: 24%;
}
.ic__peg--b {
  right: 24%;
}
/* La etiquetita de papel, cosida con puntadas y un ojalillo, en la esquina de abajo. */
.ic__tag {
  position: absolute;
  bottom: -0.2rem;
  left: 50%;
  display: grid;
  place-items: center;
  min-width: 4.4rem;
  padding: 0.28rem 0.7rem 0.28rem 1.1rem;
  rotate: -5deg;
  border-radius: 0.2rem;
  background: var(--color-paper, #fdf8f0);
  box-shadow:
    0 0.25rem 0.4rem -0.2rem rgb(0 0 0 / 0.3),
    0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent);
  font-family: var(--t-time-font, var(--font-button, var(--font-serif)));
  font-weight: 700;
  font-size: calc(0.92rem * var(--t-time-size, 1));
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: var(--t-time-color, var(--color-primary-strong, var(--color-text)));
}
.ic__stop.is-right .ic__tag {
  left: auto;
  right: 50%;
  rotate: 5deg;
}
.ic__tag::before {
  content: '';
  position: absolute;
  inset: 0.18rem;
  border: 1px dashed color-mix(in srgb, var(--color-primary) 60%, transparent);
  border-radius: 0.12rem;
}
.ic__tag::after {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 50%;
  width: 0.28rem;
  height: 0.28rem;
  translate: 0 -50%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 55%, var(--color-paper, #fdf8f0));
}
.ic__label {
  margin: 0;
  padding-top: 1.1rem;
  font-family: var(--t-activity-font, var(--font-serif));
  font-weight: 500;
  font-size: calc(clamp(1.1rem, 5cqi, 1.3rem) * var(--t-activity-size, 1));
  line-height: 1.25;
  color: var(--t-activity-color, var(--color-text));
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.ic__stop.is-left .ic__label {
  text-align: left;
}
.ic__stop.is-right .ic__label {
  text-align: right;
}

/* Con "línea que se llena": tenue y arriba hasta que la cuerda llega; luego se cuelga. */
.ic--drop .ic__stop:not(.is-lit) .ic__garment {
  opacity: 0.25;
  transform: translateY(-1.2rem);
}
.ic--drop .ic__stop.is-lit .ic__garment {
  transform-origin: 50% 0;
  animation: ic-drop calc(1.5s * var(--motion-scale)) ease-out both;
}
.ic__stop.is-now .ic__tag {
  background: var(--color-primary);
  color: var(--color-paper, #fdf8f0);
  animation: ic-now calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.ic__stop.is-now .ic__tag::before {
  border-color: color-mix(in srgb, var(--color-paper, #fdf8f0) 70%, transparent);
}
.ic__stop.is-now .ic__tag::after {
  background: var(--color-paper, #fdf8f0);
}

@keyframes ic-sway {
  from {
    rotate: -2.6deg;
  }
  to {
    rotate: 2.6deg;
  }
}
@keyframes ic-drop {
  0% {
    opacity: 0.25;
    transform: translateY(-1.2rem) rotate(0);
  }
  18% {
    opacity: 1;
    transform: translateY(0) rotate(10deg);
  }
  42% {
    transform: rotate(-7deg);
  }
  64% {
    transform: rotate(4deg);
  }
  82% {
    transform: rotate(-1.8deg);
  }
  100% {
    opacity: 1;
    transform: rotate(0);
  }
}
@keyframes ic-now {
  0%,
  100% {
    scale: 1;
  }
  50% {
    scale: 1.08;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ic__sway,
  .ic--drop .ic__stop.is-lit .ic__garment,
  .ic__stop.is-now .ic__tag {
    animation: none;
  }
  .ic--drop .ic__stop:not(.is-lit) .ic__garment {
    opacity: 1;
    transform: none;
  }
}
</style>
