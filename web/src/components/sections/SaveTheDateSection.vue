<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MonthCalendar from '@/components/ui/MonthCalendar.vue'
import SpriteDecor from '@/components/ui/SpriteDecor.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { googleCalendarUrl, monthGrid } from '@/services/calendarService'
import { dateParts } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * "Save the date": la fecha y el calendario del mes, calculados desde starts_at en la zona
 * del evento, y el botón para guardarla en Google Calendar.
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
  <div ref="root" class="save-date">
    <div class="save-date__heading">
      <!-- Con sus figuras descritas en el tema, cada estrellita titila sola (sin deformarse). -->
      <SpriteDecor
        v-if="section.decor.glitter && section.sprites?.glitter"
        :src="section.decor.glitter"
        :sprite="section.sprites.glitter"
        motion="twinkle"
        class="save-date__glitter save-date__glitter--sprite"
      />
      <img
        v-else-if="section.decor.glitter"
        :src="section.decor.glitter"
        alt=""
        class="save-date__glitter"
      />
      <h2 class="save-date__title" data-text="title">{{ title }}</h2>
    </div>

    <p v-if="parts" class="save-date__date" data-text="date">
      <span>{{ parts.day }}</span>
      <span class="save-date__heart" aria-hidden="true">♥</span>
      <span class="save-date__month">{{ parts.month }}</span>
      <span class="save-date__heart" aria-hidden="true">♥</span>
      <span>{{ parts.year.slice(-2) }}</span>
    </p>

    <MonthCalendar
      v-if="grid"
      :grid="grid"
      :shown="shown"
      :label="label"
      class="save-date__calendar"
    />

    <a
      v-if="calendarUrl"
      :href="calendarUrl"
      class="save-date__add inv-btn"
      target="_blank"
      rel="noopener"
    >
      <AppIcon name="calendar-plus" />
      Agregar a mi calendario
    </a>
  </div>
</template>

<style scoped>
.save-date {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  max-width: 26rem;
  margin: 0 auto;
}
.save-date__heading {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
}
/* Brillo dorado detrás del título: la estela de la imagen va en diagonal; se acuesta y se aplana. */
.save-date__glitter {
  position: absolute;
  width: 58%;
  transform: scale(1.3, 0.62) rotate(45deg);
  opacity: 0.9;
  pointer-events: none;
}
.save-date__glitter--sprite {
  width: 100%;
  max-width: 24rem;
  transform: none;
  opacity: 1;
}
.save-date__title {
  position: relative;
  margin: 0;
  padding: 0.6em 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1;
  color: var(--t-title-color, var(--color-primary));
}
.save-date__date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55em;
  margin: 0;
  font-family: var(--t-date-font, var(--font-caps));
  font-size: calc(clamp(1.3rem, 7.4cqi, 1.9rem) * var(--t-date-size, 1));
  letter-spacing: 0.12em;
  color: var(--t-date-color, var(--color-primary));
}
.save-date__month {
  text-transform: uppercase;
}
.save-date__heart {
  font-size: 0.55em;
  color: var(--color-accent);
}
.save-date__calendar {
  margin-top: var(--space-1);
}
.save-date__add {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: var(--space-1);
  padding: 0.45rem 1.1rem;
  border: var(--btn-border, 1px solid var(--color-primary));
  border-radius: var(--btn-radius, 999px);
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--btn-color, var(--color-primary));
  text-decoration: var(--btn-decoration, none);
  box-shadow: var(--btn-shadow, none);
  text-transform: var(--btn-case, none);
  letter-spacing: var(--btn-tracking, normal);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.save-date__add:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.save-date__add :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
</style>
