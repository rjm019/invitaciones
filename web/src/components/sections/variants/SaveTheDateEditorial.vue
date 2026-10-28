<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import { googleCalendarUrl } from '@/services/calendarService'
import { dateParts, hourMinute, time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Fecha editorial ("editorial"): una tarjeta de papel con las esquinas recortadas y el
 * filete (las piezas `paper-notched` y `data-fillet` de la página), y adentro la fecha como
 * en una tarjeta impresa: el día de la semana en versalitas, el mes y el año a los lados de
 * un número grande y fino entre dos filetes, y la hora. Abajo, "Agregar al calendario".
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Reserva la fecha')
const parts = computed(() =>
  event.value.starts_at ? dateParts(event.value.starts_at, event.value.timezone) : null,
)
const time = computed(() =>
  event.value.starts_at ? time12h(hourMinute(event.value.starts_at, event.value.timezone)) : null,
)
const calendarUrl = computed(() =>
  event.value.starts_at
    ? googleCalendarUrl({
        title: [event.value.title, event.value.celebrant.full_name].filter(Boolean).join(' · '),
        startsAt: event.value.starts_at,
        location: [event.value.venue.display_name || event.value.venue.name, event.value.venue.city]
          .filter(Boolean)
          .join(', '),
      })
    : null,
)
</script>

<template>
  <div class="de">
    <div class="de__card paper-notched" data-fillet="burgundy">
      <h2 class="de__title" data-text="title">{{ title }}</h2>
      <template v-if="parts">
        <p class="de__weekday" data-text="date">{{ parts.weekday }}</p>
        <p class="de__row" :aria-label="`${parts.day} de ${parts.month} de ${parts.year}`">
          <span class="de__side" aria-hidden="true">{{ parts.month }}</span>
          <span class="de__day" data-text="date" aria-hidden="true">{{ parts.day }}</span>
          <span class="de__side" aria-hidden="true">{{ parts.year }}</span>
        </p>
        <p v-if="time" class="de__time" data-text="calendar">{{ time }}</p>
      </template>
      <a
        v-if="calendarUrl"
        :href="calendarUrl"
        class="de__button inv-btn"
        target="_blank"
        rel="noopener"
      >
        <AppIcon name="calendar-plus" /> Agregar al calendario
      </a>
    </div>
  </div>
</template>

<style scoped>
.de {
  container-type: inline-size;
  max-width: 26rem;
  margin: 0 auto;
  /* la sombra va afuera: la silueta (máscara) recortaría la de la tarjeta */
  filter: drop-shadow(0 1px 1px rgb(59 52 46 / 0.12)) drop-shadow(0 12px 18px rgb(59 52 46 / 0.2));
}
.de__card {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding: 2.6rem 1.6rem 2.2rem;
  text-align: center;
  color: var(--color-text);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    radial-gradient(120% 85% at 50% 35%, rgb(255 255 255 / 0.45), transparent 72%),
    var(--color-paper, var(--color-surface));
}
.de__title {
  margin: 0 0 0.4rem;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-title-size, 1));
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-borgona, var(--color-accent)));
}
.de__weekday {
  margin: 0;
  font-family: var(--t-date-font, var(--font-display));
  font-size: calc(1.15rem * var(--t-date-size, 1));
  letter-spacing: 0.4em;
  text-transform: uppercase;
  margin-right: -0.4em;
}
.de__row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  margin: 0;
}
.de__side {
  padding: 0.55rem 0;
  border-block: 1px solid var(--color-borgona, var(--color-accent));
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: clamp(0.78rem, 3.6cqi, 0.92rem);
  letter-spacing: 0.26em;
  text-transform: uppercase;
}
.de__day {
  font-family: var(--t-date-font, var(--font-display));
  font-size: calc(clamp(4.6rem, 26cqi, 6.4rem) * var(--t-date-size, 1));
  line-height: 0.9;
  color: var(--t-date-color, var(--color-text));
}
.de__time {
  margin: 0.2rem 0 0;
  font-family: var(--t-calendar-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.2rem * var(--t-calendar-size, 1));
  color: var(--t-calendar-color, var(--color-text));
}
.de__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding: 0.6rem 1rem;
  border: var(--btn-border, 1px solid currentColor);
  border-radius: var(--btn-radius, 2px);
  background: var(--btn-bg, transparent);
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: var(--btn-tracking, 0.2em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--btn-color, var(--color-text));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.de__button :deep(.app-icon) {
  width: 1.05em;
  height: 1.05em;
}
.de__button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
</style>
