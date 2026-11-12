<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MonthCalendar from '@/components/ui/MonthCalendar.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { googleCalendarUrl, monthGrid } from '@/services/calendarService'
import { dateParts, hourMinute, time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * "Save the date" en racimo de globos (`globos`): tres globos atados a un moñito que suben desde
 * abajo al llegar a la sección y se quedan flotando, cada uno meciéndose a su ritmo desde el
 * moñito (los hilos se mueven con ellos). El grande del centro lleva el día; el de la izquierda,
 * el mes abreviado; el de la derecha, la hora (o el día de la semana si no hay hora). Los
 * globos son pasteles del primario y de dos tonos vecinos, con su línea y un brillo blanco.
 * Debajo, el mes completo con el día marcado, la fecha larga y el botón para agregarla al
 * calendario. Con "menos movimiento" los globos ya están arriba y no se mecen. Sirve en
 * cualquier tema: los tonos salen de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'El gran día')
const parts = computed(() =>
  event.value.starts_at ? dateParts(event.value.starts_at, event.value.timezone) : null,
)
const grid = computed(() =>
  event.value.starts_at ? monthGrid(event.value.starts_at, event.value.timezone) : null,
)
const time = computed(() =>
  event.value.starts_at
    ? time12h(hourMinute(event.value.starts_at, event.value.timezone))
    : '',
)
// "4:00 pm" → hora grande "4:00" y "p. m." chico debajo.
const clock = computed(() => {
  const m = /^(\d{1,2}:\d{2})\s*(am|pm)$/i.exec(time.value)
  return m ? { hm: m[1], suffix: m[2]!.toLowerCase() === 'am' ? 'a. m.' : 'p. m.' } : null
})
const shortMonth = computed(() => (parts.value ? parts.value.month.slice(0, 3) : ''))
const shortWeekday = computed(() => (parts.value ? parts.value.weekday.slice(0, 3) : ''))
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

// El escenario mide 300 × 330; el moñito está en (150, 306). Cada globo: centro y tamaño.
const W = 300
const H = 330
const BOW = { x: 150, y: 306 }
const balloons = [
  { key: 'month', cx: 58, cy: 176, w: 92, h: 106, tone: 'var(--color-durazno, var(--color-primary-soft))', tilt: 3.2, dur: 5.4, delay: 0.25, rise: 0.15 },
  { key: 'hour', cx: 242, cy: 168, w: 92, h: 106, tone: 'var(--color-accent)', tilt: 3.4, dur: 6.2, delay: 0.1, rise: 0.3 },
  { key: 'day', cx: 150, cy: 102, w: 128, h: 148, tone: 'var(--color-primary)', tilt: 1.8, dur: 7.1, delay: 0, rise: 0 },
]
function balloonStyle(b: (typeof balloons)[number]) {
  return {
    '--b': b.tone,
    '--tilt': `${b.tilt}deg`,
    '--dur': `${b.dur}s`,
    '--sway-delay': `${-b.delay * 4}s`,
    '--rise': `${b.rise}s`,
    '--ox': `${(BOW.x / W) * 100}%`,
    '--oy': `${(BOW.y / H) * 100}%`,
  }
}
function bodyStyle(b: (typeof balloons)[number]) {
  return {
    left: `${((b.cx - b.w / 2) / W) * 100}%`,
    top: `${((b.cy - b.h / 2) / H) * 100}%`,
    width: `${(b.w / W) * 100}%`,
    height: `${(b.h / H) * 100}%`,
  }
}
// El hilo baja del nudo del globo al moñito con una curva suave.
function stringPath(b: (typeof balloons)[number]) {
  const kx = b.cx
  const ky = b.cy + b.h / 2 + 6
  const mid = ky + (BOW.y - ky) * 0.5
  return `M${kx} ${ky}C${kx} ${mid} ${BOW.x + (kx - BOW.x) * 0.25} ${mid} ${BOW.x} ${BOW.y - 4}`
}

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { threshold: 0.35 })
</script>

<template>
  <div ref="root" class="sb" :class="{ 'is-in': inView }">
    <h2 class="sb__title" data-text="title">{{ title }}</h2>

    <div v-if="parts" class="sb__stage" role="img" :aria-label="`${parts.weekday} ${parts.day} de ${parts.month}${time ? `, ${time}` : ''}`">
      <div
        v-for="b in balloons"
        :key="b.key"
        class="sb__rise"
        aria-hidden="true"
        :style="balloonStyle(b)"
      >
        <div class="sb__sway">
          <svg class="sb__string" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" focusable="false">
            <path :d="stringPath(b)" />
          </svg>
          <div class="sb__balloon" :class="`sb__balloon--${b.key}`" :style="bodyStyle(b)">
            <i class="sb__knot" />
            <i class="sb__gloss" />
            <span v-if="b.key === 'day'" class="sb__day" data-text="date">{{ parts.day }}</span>
            <span v-else-if="b.key === 'month'" class="sb__small" data-text="date">{{ shortMonth }}</span>
            <template v-else>
              <span v-if="clock" class="sb__small" data-text="date">{{ clock.hm }}</span>
              <span v-if="clock" class="sb__suffix" data-text="date">{{ clock.suffix }}</span>
              <span v-else class="sb__small" data-text="date">{{ shortWeekday }}</span>
            </template>
          </div>
        </div>
      </div>
      <!-- El moñito donde se juntan los hilos. -->
      <svg class="sb__bow" viewBox="0 0 60 40" aria-hidden="true" focusable="false">
        <path d="M30 18C24 6 8 4 4 12C1 19 10 26 30 20Z" />
        <path d="M30 18C36 6 52 4 56 12C59 19 50 26 30 20Z" />
        <path d="M28 22C26 29 23 34 18 38M32 22C34 29 37 34 42 38" class="sb__bow-tail" />
        <ellipse cx="30" cy="19" rx="4" ry="4.6" class="sb__bow-knot" />
      </svg>
    </div>

    <template v-if="parts && grid">
      <p class="sb__month" data-text="date">{{ parts.month }} {{ parts.year }}</p>
      <MonthCalendar :grid="grid" :shown="inView" :label="label" class="sb__calendar" />
      <p class="sb__when" data-text="date">
        {{ parts.weekday }} {{ parts.day }}<template v-if="time"> · {{ time }}</template>
      </p>
      <a v-if="calendarUrl" :href="calendarUrl" class="sb__add inv-btn" target="_blank" rel="noopener">
        <AppIcon name="calendar-plus" />
        Agregar a mi calendario
      </a>
    </template>
  </div>
</template>

<style scoped>
.sb {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  text-align: center;
}
.sb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 3rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
/* El escenario: capas del tamaño del racimo; todo se coloca en % de este recuadro. */
.sb__stage {
  position: relative;
  width: min(100cqi, 21rem);
  aspect-ratio: 300 / 330;
  margin-top: 0.4rem;
}
.sb__rise,
.sb__sway {
  position: absolute;
  inset: 0;
}
/* Subida: de abajo a su lugar, con un pasito de más y un asentamiento. */
.sb__rise {
  translate: 0 70%;
  opacity: 0;
  transition:
    translate calc(1.9s * var(--motion-scale)) cubic-bezier(0.2, 0.85, 0.3, 1.12) var(--rise),
    opacity calc(0.9s * var(--motion-scale)) ease var(--rise);
}
.sb.is-in .sb__rise {
  translate: 0 0;
  opacity: 1;
}
/* Mecerse: gira desde el moñito, así el hilo queda atado y el globo se balancea. */
.sb__sway {
  transform-origin: var(--ox) var(--oy);
  animation: sb-sway calc(var(--dur) * var(--motion-scale)) ease-in-out var(--sway-delay) infinite alternate;
}
.sb__string {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.sb__string path {
  fill: none;
  stroke: color-mix(in srgb, var(--b) 70%, #5a4a50);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
}
.sb__balloon {
  --edge: color-mix(in srgb, var(--b) 78%, #5a4a50);
  position: absolute;
  display: grid;
  align-content: center;
  justify-items: center;
  /* Forma de huevo: más ancho arriba, punta abajo. */
  border: 1.5px solid var(--edge);
  border-radius: 50% 50% 48% 48% / 58% 58% 42% 42%;
  background:
    radial-gradient(
      ellipse at 34% 28%,
      color-mix(in srgb, var(--b) 18%, #fff),
      color-mix(in srgb, var(--b) 48%, #fff) 55%,
      color-mix(in srgb, var(--b) 72%, #fff) 100%
    );
  box-shadow: inset -0.4rem -0.6rem 1rem color-mix(in srgb, var(--b) 35%, transparent);
  color: var(--color-text);
}
/* El nudo: un triangulito redondeado bajo el globo. */
.sb__knot {
  position: absolute;
  left: 50%;
  top: 100%;
  width: 0.6rem;
  height: 0.5rem;
  margin: -1px 0 0 -0.3rem;
  background: var(--edge);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  border-radius: 0 0 2px 2px;
}
/* El brillo blanco, arriba a la izquierda. */
.sb__gloss {
  position: absolute;
  left: 15%;
  top: 11%;
  width: 17%;
  height: 26%;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.85);
  rotate: 24deg;
  filter: blur(0.5px);
}
.sb__day {
  font-family: var(--t-date-font, var(--font-button, var(--font-serif)));
  font-weight: 700;
  font-size: calc(clamp(3.2rem, 21cqi, 4.8rem) * var(--t-date-size, 1));
  font-variant-numeric: lining-nums;
  line-height: 1;
  color: var(--t-date-color, var(--color-text));
}
.sb__small {
  font-family: var(--t-date-font, var(--font-button, var(--font-caps)));
  font-weight: 700;
  font-size: calc(clamp(1.05rem, 7cqi, 1.6rem) * var(--t-date-size, 1));
  font-variant-numeric: lining-nums;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-text));
}
.sb__suffix {
  margin-top: 0.15rem;
  font-family: var(--t-date-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(0.6rem, 3.5cqi, 0.8rem) * var(--t-date-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-text));
}
.sb__bow {
  position: absolute;
  left: calc(150 / 300 * 100%);
  top: calc(306 / 330 * 100%);
  z-index: 1;
  width: 14%;
  translate: -50% -45%;
  overflow: visible;
}
.sb__bow path,
.sb__bow-knot {
  fill: color-mix(in srgb, var(--color-primary) 60%, #fff);
  stroke: color-mix(in srgb, var(--color-primary) 80%, #5a4a50);
  stroke-width: 1.2;
  stroke-linejoin: round;
}
.sb__bow-tail {
  fill: none !important;
  stroke-linecap: round;
}
.sb__month {
  margin: 0.4rem 0 0;
  font-family: var(--t-date-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(clamp(0.95rem, 5cqi, 1.2rem) * var(--t-date-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-primary-strong, var(--color-primary)));
}
.sb__calendar {
  width: min(100%, 22rem);
}
.sb__when {
  margin: 0;
  font-family: var(--t-date-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-date-size, 1));
  text-transform: capitalize;
  color: var(--t-date-color, var(--color-text));
}
.sb__add {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.3rem;
  padding: 0.55rem 1.3rem 0.55rem 1.9rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--button-gradient));
  font-family: var(--t-button-font, var(--font-button));
  font-size: 0.9rem;
  text-align: center;
  color: var(--btn-color, var(--color-on-button, var(--color-bg)));
  text-decoration: var(--btn-decoration, none);
  box-shadow: var(--btn-shadow, none);
  text-transform: var(--btn-case, none);
  letter-spacing: var(--btn-tracking, normal);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.sb__add:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.sb__add :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
@keyframes sb-sway {
  from {
    transform: rotate(calc(var(--tilt) * -1));
  }
  to {
    transform: rotate(var(--tilt));
  }
}
@media (prefers-reduced-motion: reduce) {
  .sb__rise {
    translate: 0 0;
    opacity: 1;
    transition: none;
  }
  .sb__sway {
    animation: none;
  }
}
</style>
