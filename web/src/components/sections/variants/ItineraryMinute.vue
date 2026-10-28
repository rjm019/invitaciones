<script setup lang="ts">
import { computed } from 'vue'
import LiveItineraryBanner from '@/components/ui/LiveItineraryBanner.vue'
import { useEvent } from '@/composables/useEvent'
import { useLiveItinerary } from '@/composables/useLiveItinerary'
import { time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario en minuta ("minuto"): como el programa impreso de una cena. Cada momento en su
 * renglón: la hora en versalitas a la izquierda, un filete de puntos que la une con la
 * actividad en serif a la derecha. Sin íconos. Con "en vivo", el día del evento marca
 * "Ahora" (en el color de acento) y atenúa lo pasado, como los demás itinerarios.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const items = computed(() => event.value.itinerary)
const title = computed(() => props.section.title ?? 'Itinerario')
const { live } = useLiveItinerary(
  () => items.value,
  () => event.value.starts_at,
  () => event.value.timezone,
  () => !!props.section.live,
)
</script>

<template>
  <div class="im">
    <h2 class="im__title" data-text="title">{{ title }}</h2>
    <span class="im__rule" aria-hidden="true" />
    <LiveItineraryBanner :state="live" :moments="items" />
    <ol class="im__list">
      <li
        v-for="(item, i) in items"
        :key="`${item.time}-${item.label}`"
        class="im__row"
        :class="{ 'is-past': live?.past[i], 'is-now': live?.current === i }"
      >
        <time class="im__time" data-text="time" :datetime="item.time">{{ time12h(item.time) }}</time>
        <span class="im__leader" aria-hidden="true" />
        <span class="im__label" data-text="activity">{{ item.label }}</span>
      </li>
    </ol>
    <span class="im__rule" aria-hidden="true" />
  </div>
</template>

<style scoped>
.im {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  max-width: 30rem;
  margin: 0 auto;
}
.im__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.5rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
  margin-right: -0.16em;
}
.im__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}
.im__list {
  display: grid;
  gap: 0.15rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.im__row {
  display: grid;
  grid-template-columns: 5.4rem 1fr auto;
  align-items: baseline;
  gap: 0.7rem;
  padding: 0.65rem 0;
  transition: opacity calc(0.4s * var(--motion-scale)) ease;
}
.im__row + .im__row {
  border-top: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
}
.im__time {
  font-family: var(--t-time-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.82rem * var(--t-time-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--t-time-color, var(--color-borgona, var(--color-accent)));
  white-space: nowrap;
}
/* Puntos que unen la hora con la actividad, como en una minuta. */
.im__leader {
  align-self: end;
  height: 0.35rem;
  margin-bottom: 0.3rem;
  background: radial-gradient(circle, color-mix(in srgb, var(--color-text) 40%, transparent) 0.7px, transparent 1px)
    0 50% / 7px 4px repeat-x;
}
.im__label {
  font-family: var(--t-activity-font, var(--font-serif));
  font-size: calc(clamp(1.1rem, 4.8cqi, 1.3rem) * var(--t-activity-size, 1));
  line-height: 1.25;
  text-align: right;
  color: var(--t-activity-color, var(--color-text));
}
.im__row.is-past {
  opacity: 0.45;
}
.im__row.is-now .im__label {
  color: var(--color-borgona, var(--color-accent));
  font-style: italic;
}
@media (prefers-reduced-motion: reduce) {
  .im__row {
    transition: none;
  }
}
</style>
