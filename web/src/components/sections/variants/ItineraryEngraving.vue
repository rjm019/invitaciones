<script setup lang="ts">
import { computed, ref } from 'vue'
import LiveItineraryBanner from '@/components/ui/LiveItineraryBanner.vue'
import { useEvent } from '@/composables/useEvent'
import { useLiveItinerary } from '@/composables/useLiveItinerary'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import { ENGRAVED_ICONS, engravedIcon } from '@/services/engravedIconService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario en grabado ("grabado"): una línea vertical fina, como un hilo, con un
 * medallón de grabado en cada momento (copa, anillos, plato, pastel…, dibujados a línea; el
 * dibujo sale del ícono elegido o de las palabras de la actividad). La hora va a un lado
 * y la actividad al otro. Con "línea que se llena", el hilo se entinta al bajar y los
 * medallones se encienden. Con "en vivo", el día del evento marca "Ahora" y "Sigue" y
 * atenúa lo pasado (igual que los otros itinerarios). Colores y letras salen de los tokens.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
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

// Las perlas del tema (o las compartidas) como remate; la invitación las cambia o las quita.
const divider = computed(() =>
  decorOr(props.section.decor, 'divider', resolveAsset.value('perlas.svg')),
)

const pearlsStyle = computed(() =>
  divider.value ? { '--engr-pearls': `url("${divider.value.replace(/"/g, '%22')}")` } : undefined,
)

const rows = computed(() =>
  items.value.map((item) => ({
    ...item,
    drawing: ENGRAVED_ICONS[engravedIcon(item.icon, item.label)],
  })),
)
</script>

<template>
  <div class="engr-itin">
    <h2 class="engr-itin__title" data-text="title">{{ title }}</h2>
    <LiveItineraryBanner :state="live" :moments="items" />

    <ol ref="track" class="engr-itin__list">
      <span class="engr-itin__thread" aria-hidden="true">
        <span class="engr-itin__thread-fill" :style="{ transform: `scaleY(${fill})` }" />
      </span>

      <li
        v-for="(item, i) in rows"
        :key="`${item.time}-${item.label}`"
        class="engr-itin__stop"
        :class="{ 'is-past': live?.past[i], 'is-now': live?.current === i }"
        data-cascade
      >
        <time class="engr-itin__time" data-text="time" :datetime="item.time">{{
          time12h(item.time)
        }}</time>
        <span ref="stops" class="engr-itin__medal" :class="{ 'is-lit': i < active }">
          <!-- eslint-disable-next-line vue/no-v-html -- dibujos fijos del código, sin datos del evento -->
          <svg
            viewBox="0 0 48 48"
            class="engr-itin__drawing"
            aria-hidden="true"
            v-html="item.drawing"
          />
        </span>
        <span class="engr-itin__label" data-text="activity">{{ item.label }}</span>
      </li>
    </ol>

    <span v-if="divider" class="engr-itin__pearls" aria-hidden="true" :style="pearlsStyle" />
  </div>
</template>

<style scoped>
.engr-itin {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  max-width: 30rem;
  margin: 0 auto;
}
.engr-itin__title {
  margin: 0 0 var(--space-2);
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.3rem, 12cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
.invitation[data-metal] .engr-itin__title {
  margin-bottom: calc(var(--space-2) - var(--glyph-y));
}

/* Tres columnas: hora | medallón sobre el hilo | actividad. */
.engr-itin__list {
  --medal: 3.4rem;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--medal) minmax(0, 1.25fr);
  row-gap: 1.1rem;
  width: 100%;
  margin: 0;
  padding: 0.6rem 0 0.4rem;
  list-style: none;
}
.engr-itin__thread {
  position: absolute;
  top: 0;
  bottom: 0;
  /* El centro de la columna del medallón: 1fr + medallón/2, repartido como las columnas. */
  left: calc((100% - var(--medal)) * 0.4444 + var(--medal) / 2);
  width: 1px;
  translate: -50% 0;
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
}
.engr-itin__thread-fill {
  position: absolute;
  inset: 0;
  background: var(--color-primary-strong);
  transform-origin: top;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
.engr-itin__stop {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
}
.engr-itin__stop.is-past {
  opacity: 0.45;
}
.engr-itin__stop.is-now {
  animation: engr-now calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes engr-now {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}

/* El medallón: un óvalo con doble filo (como un camafeo grabado) y su dibujo adentro. */
.engr-itin__medal {
  position: relative;
  z-index: 1;
  grid-column: 2;
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--medal);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--color-primary) 70%, transparent);
  border-radius: 50%;
  background: var(--color-bg);
  color: var(--color-primary);
  box-shadow:
    0 0 0 0.22rem var(--color-bg),
    0 0 0 calc(0.22rem + 1px) color-mix(in srgb, var(--color-primary) 38%, transparent);
  transition:
    background-color calc(0.45s * var(--motion-scale)) ease,
    color calc(0.45s * var(--motion-scale)) ease;
}
.engr-itin__medal.is-lit {
  background: var(--color-primary-strong);
  color: var(--color-bg);
}
.engr-itin__drawing {
  width: 74%;
  height: 74%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.engr-itin__time {
  grid-column: 1;
  grid-row: 1;
  padding-inline-end: 0.7rem;
  text-align: end;
  font-family: var(--t-time-font, var(--font-caps));
  font-size: calc(clamp(0.8rem, 3.8cqi, 0.95rem) * var(--t-time-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-time-color, var(--color-primary));
}
.engr-itin__label {
  grid-column: 3;
  grid-row: 1;
  padding-inline-start: 0.7rem;
  text-align: start;
  font-family: var(--t-activity-font, var(--font-serif));
  font-size: calc(clamp(1rem, 4.6cqi, 1.2rem) * var(--t-activity-size, 1));
  line-height: 1.2;
  color: var(--t-activity-color, var(--color-text));
  overflow-wrap: anywhere;
}
.engr-itin__pearls {
  width: min(60%, 12rem);
  height: 1.4rem;
  margin-top: var(--space-2);
  background: var(--color-primary);
  -webkit-mask: var(--engr-pearls) center / contain no-repeat;
  mask: var(--engr-pearls) center / contain no-repeat;
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .engr-itin__stop.is-now {
    animation: none;
  }
}
</style>
