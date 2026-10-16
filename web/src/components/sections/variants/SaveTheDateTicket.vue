<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import SpriteDecor from '@/components/ui/SpriteDecor.vue'
import { useEvent } from '@/composables/useEvent'
import { eventWeek, googleCalendarUrl } from '@/services/calendarService'
import { dateParts, hourMinute, time12h } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import { TITLE_SPARKLES } from '@/themes/_shared/sprites'
import type { ResolvedSection } from '@/types/event'

/**
 * "Save the date" de Nueva York ("boleto"): la fecha en un boleto plateado de Broadway
 * (con su talón, la perforación y las esquinas mordidas) y, debajo, la semana del evento
 * con su día encendido, en lugar del calendario del mes. El botón la guarda en Google
 * Calendar. Todo sale del inicio del evento, en su zona horaria.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

// Estrellitas alrededor del título: las del tema o las finas compartidas, cada una titila sola.
const sparkles = computed(() =>
  decorOr(props.section.decor, 'glitter', resolveAsset.value('destellos-titulo.svg')),
)
const sparkleSprite = computed(() =>
  'glitter' in props.section.decor ? props.section.sprites?.glitter : TITLE_SPARKLES,
)

const title = computed(() => props.section.title ?? 'Save the date')
const starts = computed(() => event.value.starts_at)
const parts = computed(() => (starts.value ? dateParts(starts.value, event.value.timezone) : null))
const time = computed(() =>
  starts.value ? time12h(hourMinute(starts.value, event.value.timezone)) : '',
)
const week = computed(() => (starts.value ? eventWeek(starts.value, event.value.timezone) : []))
const venue = computed(() => event.value.venue.display_name || event.value.venue.name)
const stub = computed(
  () => [event.value.title, event.value.celebrant.short_name].find((t) => t?.trim()) ?? '',
)

const calendarUrl = computed(() =>
  starts.value
    ? googleCalendarUrl({
        title: [event.value.title, event.value.celebrant.full_name].filter(Boolean).join(' · '),
        startsAt: starts.value,
        location: [venue.value, event.value.venue.city].filter(Boolean).join(', '),
      })
    : null,
)
const weekLabel = computed(() =>
  parts.value
    ? `La semana del evento: es el ${parts.value.weekday} ${parts.value.day} de ${parts.value.month}`
    : '',
)
</script>

<template>
  <div class="ny-date">
    <div class="ny-date__heading">
      <SpriteDecor
        v-if="sparkles && sparkleSprite"
        :src="sparkles"
        :sprite="sparkleSprite"
        motion="twinkle"
        class="ny-date__glitter"
      />
      <h2 class="ny-date__title" data-text="title">{{ title }}</h2>
    </div>

    <div v-if="parts" class="ny-date__ticket">
      <div class="ny-date__main">
        <span class="ny-date__weekday" data-text="date">{{ parts.weekday }}</span>
        <span class="ny-date__day" data-text="date">{{ parts.day }}</span>
        <span class="ny-date__month" data-text="date">{{ parts.month }} · {{ parts.year }}</span>
        <span class="ny-date__rule" aria-hidden="true" />
        <span class="ny-date__when" data-text="date">
          {{ time }}<template v-if="venue"> · {{ venue }}</template>
        </span>
      </div>
      <div class="ny-date__stub" aria-hidden="true">
        <span class="ny-date__star">✦</span>
        <span class="ny-date__stub-text">{{ stub }}</span>
        <span class="ny-date__star">✦</span>
      </div>
    </div>

    <ol v-if="week.length" class="ny-date__week" data-text="calendar" :aria-label="weekLabel">
      <li
        v-for="d in week"
        :key="`${d.weekday}-${d.day}`"
        class="ny-date__weekday-cell"
        :class="{ 'is-event': d.event, 'is-outside': d.outside }"
      >
        <span class="ny-date__initial">{{ d.weekday }}</span>
        <span class="ny-date__number">{{ d.day }}</span>
      </li>
    </ol>

    <a
      v-if="calendarUrl"
      :href="calendarUrl"
      class="ny-date__add inv-btn"
      target="_blank"
      rel="noopener"
    >
      <AppIcon name="calendar-plus" />
      Agregar a mi calendario
    </a>
  </div>
</template>

<style scoped>
.ny-date {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 26rem;
  margin: 0 auto;
}
.ny-date__heading {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
}
.ny-date__glitter {
  position: absolute;
  width: 100%;
  max-width: 24rem;
  pointer-events: none;
}
.ny-date__title {
  position: relative;
  margin: 0;
  padding: 0.5em 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1;
  color: var(--t-title-color, var(--color-primary));
}

/*
 * El boleto: cuerpo y talón son dos piezas con las esquinas mordidas (máscaras radiales);
 * juntas forman las muescas de la perforación. La sombra va en el contenedor (filter),
 * así sigue la forma recortada.
 */
.ny-date__ticket {
  --bite: 0.75rem;
  display: grid;
  grid-template-columns: 1fr minmax(3.4rem, 22%);
  width: 100%;
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.45));
}
.ny-date__main,
.ny-date__stub {
  position: relative;
  background: linear-gradient(
    150deg,
    var(--color-primary-soft) 0%,
    var(--color-primary) 38%,
    var(--color-primary-strong) 56%,
    var(--color-primary) 100%
  );
  color: var(--color-bg);
  -webkit-mask:
    radial-gradient(circle at 0 0, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 0 0 /
      51% 51% no-repeat,
    radial-gradient(circle at 100% 0, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 100%
      0 / 51% 51% no-repeat,
    radial-gradient(circle at 0 100%, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 0
      100% / 51% 51% no-repeat,
    radial-gradient(circle at 100% 100%, transparent var(--bite), #000 calc(var(--bite) + 0.5px))
      100% 100% / 51% 51% no-repeat;
  mask:
    radial-gradient(circle at 0 0, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 0 0 /
      51% 51% no-repeat,
    radial-gradient(circle at 100% 0, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 100%
      0 / 51% 51% no-repeat,
    radial-gradient(circle at 0 100%, transparent var(--bite), #000 calc(var(--bite) + 0.5px)) 0
      100% / 51% 51% no-repeat,
    radial-gradient(circle at 100% 100%, transparent var(--bite), #000 calc(var(--bite) + 0.5px))
      100% 100% / 51% 51% no-repeat;
}
/* Filo grabado por dentro, como el de los boletos impresos. */
.ny-date__main::after,
.ny-date__stub::after {
  content: '';
  position: absolute;
  inset: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-bg) 35%, transparent);
  pointer-events: none;
}
.ny-date__main {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.15rem;
  padding: 1.3rem 1rem 1.2rem;
  text-align: center;
}
.ny-date__stub {
  display: grid;
  justify-items: center;
  align-content: space-between;
  padding: 1.1rem 0;
  border-left: 2px dashed color-mix(in srgb, var(--color-bg) 45%, transparent);
}
.ny-date__stub-text {
  writing-mode: vertical-rl;
  rotate: 180deg;
  font-family: var(--font-caps);
  font-size: 0.72rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  white-space: nowrap;
}
.ny-date__star {
  font-size: 0.7rem;
  opacity: 0.8;
}
.ny-date__weekday,
.ny-date__month,
.ny-date__when {
  font-family: var(--t-date-font, var(--font-caps));
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--t-date-color, inherit);
}
.ny-date__weekday {
  font-size: calc(0.78rem * var(--t-date-size, 1));
}
.ny-date__day {
  font-family: var(--t-date-font, var(--font-display));
  font-weight: 500;
  font-size: calc(clamp(4rem, 26cqi, 5.6rem) * var(--t-date-size, 1));
  line-height: 0.95;
  color: var(--t-date-color, inherit);
}
.ny-date__month {
  font-size: calc(clamp(0.82rem, 4cqi, 0.95rem) * var(--t-date-size, 1));
}
.ny-date__rule {
  width: 60%;
  height: 1px;
  margin: 0.45rem 0 0.25rem;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.5;
}
.ny-date__when {
  max-width: 100%;
  font-size: calc(0.64rem * var(--t-date-size, 1));
  letter-spacing: 0.18em;
  opacity: 0.9;
}

/* La semana: siete días en fila; el del evento, encendido dentro de un círculo. */
.ny-date__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--t-calendar-font, var(--font-serif));
  color: var(--t-calendar-color, var(--color-text));
}
.ny-date__weekday-cell {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
}
.ny-date__initial {
  font-family: var(--font-caps);
  font-size: calc(0.7rem * var(--t-calendar-size, 1));
  letter-spacing: 0.18em;
  opacity: 0.6;
}
.ny-date__number {
  display: grid;
  place-items: center;
  width: 2.3rem;
  aspect-ratio: 1;
  border-radius: 50%;
  font-size: calc(1.02rem * var(--t-calendar-size, 1));
  font-weight: 300;
}
.is-outside .ny-date__number {
  opacity: 0.45;
}
.is-event .ny-date__number {
  background: var(--color-primary-strong);
  color: var(--color-bg);
  font-weight: 500;
  box-shadow:
    0 0 0 3px var(--color-bg),
    0 0 0 4px var(--color-primary),
    0 0 1.4rem color-mix(in srgb, var(--color-primary-soft) 55%, transparent);
}
.is-event .ny-date__initial {
  opacity: 1;
}

.ny-date__add {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border: var(--btn-border, 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent));
  border-radius: var(--btn-radius, 999px);
  font-family: var(--font-caps);
  font-size: 0.78rem;
  letter-spacing: var(--btn-tracking, 0.16em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--btn-color, var(--color-text));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.ny-date__add :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
.ny-date__add:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
