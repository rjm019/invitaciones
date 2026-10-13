<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import { useWeather } from '@/composables/useWeather'
import { dateParts, dayMonth } from '@/services/dateFormatService'
import {
  describeWeather,
  formatTemp,
  hourLabel,
  updatedAgo,
  weatherAdvice,
} from '@/services/weatherService'
import type { ResolvedSection } from '@/types/event'

/**
 * Clima del día del evento en la ciudad del salón. Mientras faltan más de 16 días muestra
 * el clima típico de esa fecha (promedio de 10 años); después, el pronóstico real, que se
 * renueva solo mientras la invitación está abierta. Datos de Open-Meteo.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const root = ref<HTMLElement | null>(null)
const { weather, status, now } = useWeather(() => event.value.slug, root)

const title = computed(() => props.section.title ?? 'El clima')
const place = computed(() => weather.value?.place || event.value.venue.city)
const look = computed(() => (weather.value ? describeWeather(weather.value.day.code) : null))
const isForecast = computed(() => weather.value?.kind === 'forecast')

const when = computed(() => {
  if (!event.value.starts_at) return ''
  const p = dateParts(event.value.starts_at, event.value.timezone)
  return `${p.weekday} ${p.day} de ${p.month}`
})
const kindLabel = computed(() =>
  isForecast.value ? `Pronóstico para el ${when.value}` : `Así suele estar un ${when.value}`,
)
const rain = computed(() => weather.value?.day.rain_chance ?? null)
const hours = computed(() =>
  (weather.value?.hours ?? []).map((h) => ({
    ...h,
    label: hourLabel(h.time),
    icon: describeWeather(h.code, h.is_day).icon,
  })),
)
const advice = computed(() => (weather.value ? weatherAdvice(weather.value) : []))
const note = computed(() => {
  const w = weather.value
  if (!w) return ''
  if (w.kind === 'forecast') return `Actualizado ${updatedAgo(w.updated_at, now.value)}`
  const years = w.years ? `Promedio de ${w.years[0]} a ${w.years[1]}. ` : ''
  return `${years}El pronóstico real aparece el ${dayMonth(w.forecast_from)}.`
})
</script>

<template>
  <div ref="root" class="weather">
    <h2 class="weather__title">{{ title }}</h2>
    <p v-if="place" class="weather__place">
      <AppIcon name="location-dot" class="weather__pin" />
      {{ place }}
    </p>
    <p v-if="section.text" class="weather__text">{{ section.text }}</p>

    <p v-if="status === 'idle' || status === 'loading'" class="weather__status" aria-live="polite">
      Consultando el clima…
    </p>
    <p v-else-if="!weather" class="weather__status">
      El clima no está disponible por ahora. Vuelve a consultarlo más tarde.
    </p>

    <article v-else class="weather__card" :aria-label="kindLabel">
      <p class="weather__kind">{{ kindLabel }}</p>

      <div class="weather__day">
        <AppIcon :name="look?.icon" class="weather__icon" />
        <p class="weather__temps">
          <span class="weather__max" :aria-label="`Máxima ${formatTemp(weather.day.max)}`">
            {{ formatTemp(weather.day.max) }}
          </span>
          <span class="weather__min" :aria-label="`mínima ${formatTemp(weather.day.min)}`">
            {{ formatTemp(weather.day.min) }}
          </span>
        </p>
      </div>
      <p v-if="look?.label" class="weather__label">{{ look.label }}</p>
      <p v-if="rain !== null" class="weather__rain">
        <AppIcon name="droplet" class="weather__drop" />
        {{ isForecast ? 'Probabilidad de lluvia' : 'Días con lluvia' }}: {{ rain }} %
      </p>

      <ol v-if="hours.length" class="weather__hours" aria-label="Durante la fiesta">
        <li v-for="h in hours" :key="h.time" class="weather__hour">
          <span class="weather__hour-time">{{ h.label }}</span>
          <AppIcon :name="h.icon" class="weather__hour-icon" />
          <span class="weather__hour-temp">{{ formatTemp(h.temp) }}</span>
        </li>
      </ol>

      <ul v-if="advice.length" class="weather__advice">
        <li v-for="tip in advice" :key="tip">{{ tip }}</li>
      </ul>
    </article>

    <p v-if="weather" class="weather__note">
      {{ note }}
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Datos: Open-Meteo</a>
    </p>
  </div>
</template>

<style scoped>
.weather {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}
.weather__title {
  margin: 0;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2.2rem, 11.5cqi, 3.2rem);
  line-height: 1.1;
  color: var(--color-primary);
}
.weather__place {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-family: var(--font-caps);
  font-size: clamp(0.95rem, 4.4cqi, 1.15rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.weather__pin {
  width: 0.9em;
  height: 0.9em;
  color: var(--color-primary-strong);
}
.weather__text {
  max-width: 22rem;
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.45;
}
.weather__status {
  margin: var(--space-1) 0 0;
  font-size: var(--text-body);
  font-style: italic;
}
.weather__card {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  width: 100%;
  margin-top: var(--space-1);
  padding: var(--space-3) var(--space-2) var(--space-2);
  border: 1px solid var(--color-frame);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  box-shadow: var(--shadow-card);
}
.weather__kind {
  margin: 0;
  font-family: var(--font-script-mono);
  font-size: clamp(1.35rem, 7cqi, 1.8rem);
  line-height: 1.2;
  color: var(--color-primary);
}
.weather__day {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
.weather__icon {
  width: clamp(3.2rem, 17cqi, 4.4rem);
  height: clamp(3.2rem, 17cqi, 4.4rem);
  color: var(--color-accent);
}
.weather__temps {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-serif);
  font-variant-numeric: tabular-nums;
}
.weather__max {
  font-size: clamp(2.8rem, 14cqi, 3.8rem);
  line-height: 1;
  color: var(--color-primary);
}
.weather__min {
  font-size: clamp(1.5rem, 7.5cqi, 2rem);
  color: var(--color-text);
  opacity: 0.75;
}
.weather__min::before {
  content: '/ ';
}
.weather__label {
  margin: 0;
  font-family: var(--font-caps);
  font-size: clamp(0.95rem, 4.4cqi, 1.1rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.weather__rain {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: var(--text-body);
}
.weather__drop {
  width: 0.85em;
  height: 0.85em;
  color: var(--color-accent);
}
.weather__hours {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  width: 100%;
  margin: var(--space-1) 0 0;
  padding: var(--space-2) 0 0;
  border-top: 1px solid var(--color-primary-soft);
  list-style: none;
}
.weather__hour {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
}
.weather__hour-time {
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.weather__hour-icon {
  width: 1.6rem;
  height: 1.6rem;
  color: var(--color-accent);
}
.weather__hour-temp {
  font-family: var(--font-serif);
  font-size: clamp(1.2rem, 5.6cqi, 1.45rem);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.weather__advice {
  display: grid;
  gap: 0.2rem;
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-body);
  font-style: italic;
}
.weather__note {
  max-width: 24rem;
  margin: 0;
  font-size: var(--text-small);
  line-height: 1.4;
  opacity: 0.85;
}
.weather__note a {
  color: inherit;
  text-underline-offset: 0.15em;
  white-space: nowrap;
}
.weather__note a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
