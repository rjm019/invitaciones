<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MonthCalendar from '@/components/ui/MonthCalendar.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { googleCalendarUrl, monthGrid } from '@/services/calendarService'
import { dateParts } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * "Save the date" en un sobre ("calendario"): el mes del evento en una tarjeta de papel que
 * asoma de un sobre abierto, con el día del evento dentro de un corazón. Arriba, el título
 * y la fecha corta; abajo, el botón que la guarda en Google Calendar. Sirve en cualquier
 * tema: el papel y la tinta salen de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Save the date')
const parts = computed(() =>
  event.value.starts_at ? dateParts(event.value.starts_at, event.value.timezone) : null,
)
const grid = computed(() =>
  event.value.starts_at ? monthGrid(event.value.starts_at, event.value.timezone) : null,
)
const label = computed(() =>
  parts.value
    ? `Calendario de ${parts.value.month} de ${parts.value.year}: el evento es el ${parts.value.day}`
    : '',
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

const root = ref<HTMLElement | null>(null)
const shown = useInView(root)
</script>

<template>
  <div ref="root" class="env-date">
    <h2 class="env-date__title" data-text="title">{{ title }}</h2>
    <p v-if="parts" class="env-date__date" data-text="date">
      <span>{{ parts.day }}</span>
      <span class="env-date__heart" aria-hidden="true">♥</span>
      <span>{{ parts.month }}</span>
      <span class="env-date__heart" aria-hidden="true">♥</span>
      <span>{{ parts.year.slice(-2) }}</span>
    </p>

    <div v-if="grid" class="env-date__envelope">
      <span class="env-date__back" aria-hidden="true" />
      <span class="env-date__flap" aria-hidden="true" />
      <div class="env-date__card">
        <p class="env-date__month" data-text="date">{{ parts?.month }} {{ parts?.year }}</p>
        <MonthCalendar :grid="grid" :shown="shown" :label="label" class="env-date__calendar" />
      </div>
      <span class="env-date__front" aria-hidden="true" />
      <span class="env-date__pearl" aria-hidden="true" />
    </div>

    <a
      v-if="calendarUrl"
      :href="calendarUrl"
      class="env-date__add inv-btn"
      target="_blank"
      rel="noopener"
    >
      <AppIcon name="calendar-plus" />
      Agregar a mi calendario
    </a>
  </div>
</template>

<style scoped>
.env-date {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 26rem;
  margin: 0 auto;
}
.env-date__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.env-date__date {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin: 0;
  font-family: var(--t-date-font, var(--font-serif));
  font-size: calc(clamp(1.1rem, 6cqi, 1.5rem) * var(--t-date-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-primary));
}
.env-date__heart {
  font-size: 0.7em;
}

/* El sobre: el fondo, la solapa abierta, la tarjeta y el frente en V que la guarda. */
.env-date__envelope {
  --paper: var(--color-paper, var(--color-primary-soft));
  --ink: var(--color-accent-strong, #3f4535);
  position: relative;
  width: 100%;
  padding-top: 22%;
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.35));
}
.env-date__back {
  position: absolute;
  inset: 12% 0 0;
  background: color-mix(in srgb, var(--paper) 78%, #000);
  border-radius: 0.35rem;
}
.env-date__flap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: color-mix(in srgb, var(--paper) 88%, #000);
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
}
.env-date__card {
  --color-primary: var(--ink);
  position: relative;
  z-index: 1;
  margin: 0 7% -26%;
  padding: 1rem 0.9rem 1.2rem;
  transform: translateY(0);
  background: var(--paper);
  color: var(--ink);
  border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.18);
}
.env-date__month {
  margin: 0 0 0.5rem;
  text-align: center;
  font-family: var(--t-date-font, var(--font-script));
  font-size: calc(clamp(1.4rem, 8cqi, 2rem) * var(--t-date-size, 1));
  line-height: 1;
  text-transform: capitalize;
  color: var(--ink);
}
.env-date__front {
  position: relative;
  z-index: 2;
  display: block;
  height: clamp(5rem, 28cqi, 7.5rem);
  margin-top: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--paper) 94%, #000),
    var(--paper)
  );
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
  border-radius: 0 0 0.35rem 0.35rem;
}
/* Una perla donde se juntan las solapas. */
.env-date__pearl {
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: clamp(2rem, 11cqi, 3rem);
  width: 1.2rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, #f1ebdb 45%, #b7ad95 100%);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
}
.env-date__add {
  margin-top: calc(var(--space-1, 0.5rem));
}
</style>
