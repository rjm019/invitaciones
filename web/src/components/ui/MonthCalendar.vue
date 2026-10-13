<script setup lang="ts">
import type { MonthGrid } from '@/services/calendarService'

/**
 * Calendario del mes con el día del evento dentro de un corazón. Solo líneas internas
 * (sin borde exterior), como el diseño. Con `shown` los números aparecen escalonados.
 */
defineProps<{ grid: MonthGrid; shown: boolean; label: string }>()
</script>

<template>
  <table class="calendar" :class="{ 'is-shown': shown }" :aria-label="label">
    <thead>
      <tr>
        <th v-for="(d, i) in grid.weekdays" :key="i" scope="col" class="calendar__weekday">
          {{ d }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(week, w) in grid.weeks" :key="w">
        <td
          v-for="(day, i) in week"
          :key="i"
          class="calendar__cell"
          :class="{ 'is-event': day === grid.day }"
          :style="{ '--i': w * 7 + i }"
          :aria-current="day === grid.day ? 'date' : undefined"
        >
          <template v-if="day">
            <svg
              v-if="day === grid.day"
              class="calendar__heart"
              viewBox="0 0 48 44"
              aria-hidden="true"
            >
              <path
                d="M24 41C9 31 3 23 3 14.5 3 8 8 3 14 3c4.4 0 7.8 2.6 10 6.3C26.2 5.6 29.6 3 34 3c6 0 11 5 11 11.5C45 23 39 31 24 41Z"
              />
            </svg>
            <span class="calendar__day">{{ day }}</span>
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.calendar {
  --line: color-mix(in srgb, var(--color-primary) 75%, transparent);
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: var(--font-serif);
  color: var(--color-primary);
}
.calendar__weekday {
  padding-bottom: 0.4em;
  font-family: var(--font-caps);
  font-weight: 400;
  font-size: clamp(1.05rem, 5.6cqi, 1.5rem);
}
.calendar__cell {
  position: relative;
  height: 2.6em;
  padding: 0;
  text-align: center;
  font-size: clamp(1.05rem, 5.6cqi, 1.5rem);
  border-top: 1px solid var(--line);
}
.calendar__cell + .calendar__cell {
  border-left: 1px solid var(--line);
}
.calendar__day {
  position: relative;
  transition: opacity calc(0.4s * var(--motion-scale)) ease
    calc(var(--i) * calc(20ms * var(--motion-scale)));
}
.calendar:not(.is-shown) .calendar__day {
  opacity: 0;
}
.calendar__heart {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2.2em;
  translate: -50% -48%;
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 1.6;
  transition:
    opacity calc(0.5s * var(--motion-scale)) ease calc(0.75s * var(--motion-scale)),
    transform calc(0.6s * var(--motion-scale)) var(--ease-out) calc(0.75s * var(--motion-scale));
}
.calendar:not(.is-shown) .calendar__heart {
  opacity: 0;
  transform: scale(0.4);
}
@media (prefers-reduced-motion: reduce) {
  .calendar__day,
  .calendar__heart {
    transition: none;
  }
  .calendar:not(.is-shown) .calendar__day,
  .calendar:not(.is-shown) .calendar__heart {
    opacity: 1;
    transform: none;
  }
}
</style>
