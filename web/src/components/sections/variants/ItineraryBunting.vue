<script setup lang="ts">
import { computed, ref } from 'vue'
import LiveItineraryBanner from '@/components/ui/LiveItineraryBanner.vue'
import { useEvent } from '@/composables/useEvent'
import { useLiveItinerary } from '@/composables/useLiveItinerary'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import { ENGRAVED_ICONS, engravedIcon } from '@/services/engravedIconService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario de tendedero ("tendedero"): un hilo vertical con una bandera de papel picado
 * por momento (un color de la paleta cada una, calados arriba y orilla festoneada). En el
 * celular el hilo va a la izquierda y las banderas cuelgan a su derecha; en ancho el hilo
 * va al centro y se alternan. Cada bandera lleva su ícono, la hora grande y la actividad en
 * crema. Con "línea que se llena", el hilo se colorea al bajar y cada bandera se enciende
 * (opacity y scale) cuando el hilo llega a ella. Con "en vivo", el día del evento marca
 * "Ahora" y atenúa lo pasado (igual que los otros itinerarios). Solo tokens.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
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

// Color de cada bandera (rota por la paleta) y letra que se lee sobre él.
const FLAGS = [
  { bg: 'var(--color-rosa, var(--color-accent))', fg: 'var(--color-paper, #fbf3e2)' },
  { bg: 'var(--color-cempasuchil, var(--color-accent))', fg: 'var(--color-tinta, #3a2420)' },
  { bg: 'var(--color-talavera, var(--color-primary))', fg: 'var(--color-paper, #fbf3e2)' },
  { bg: 'var(--color-nopal, var(--color-primary-strong))', fg: 'var(--color-paper, #fbf3e2)' },
  { bg: 'var(--color-rojo, var(--color-accent))', fg: 'var(--color-paper, #fbf3e2)' },
  { bg: 'var(--color-turquesa, var(--color-primary))', fg: 'var(--color-tinta, #3a2420)' },
]
const TILTS = [-1.8, 1.4, -1, 1.9, -1.5, 1]

const rows = computed(() =>
  items.value.map((item, i) => ({
    ...item,
    drawing: ENGRAVED_ICONS[engravedIcon(item.icon, item.label)],
    style: {
      '--flag-bg': FLAGS[i % FLAGS.length]!.bg,
      '--flag-fg': FLAGS[i % FLAGS.length]!.fg,
      '--tilt': `${TILTS[i % TILTS.length]}deg`,
    },
  })),
)
</script>

<template>
  <div class="bt">
    <h2 class="bt__title" data-text="title">{{ title }}</h2>
    <LiveItineraryBanner :state="live" :moments="items" />

    <ol ref="track" class="bt__list">
      <span class="bt__thread" aria-hidden="true">
        <span class="bt__thread-fill" :style="{ transform: `scaleY(${fill})` }" />
      </span>

      <li
        v-for="(item, i) in rows"
        :key="`${item.time}-${item.label}`"
        class="bt__stop"
        :class="[
          i % 2 === 0 ? 'is-left' : 'is-right',
          { 'is-lit': i < active, 'is-past': live?.past[i], 'is-now': live?.current === i },
        ]"
        :style="item.style"
        data-cascade
      >
        <span ref="stops" class="bt__knot" aria-hidden="true" />
        <div class="bt__flag">
          <!-- eslint-disable-next-line vue/no-v-html -- dibujos fijos del código, sin datos del evento -->
          <svg viewBox="0 0 48 48" class="bt__icon" aria-hidden="true" v-html="item.drawing" />
          <time class="bt__time" data-text="time" :datetime="item.time">{{
            time12h(item.time)
          }}</time>
          <span class="bt__label" data-text="activity">{{ item.label }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.bt {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  max-width: 38rem;
  margin: 0 auto;
}
.bt__title {
  margin: 0 0 var(--space-2);
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.3rem, 12cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}

/* Celular: el hilo a la izquierda y las banderas a su derecha. */
.bt__list {
  --thread-x: 0.9rem;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: 1.3rem;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0 0.6rem;
  list-style: none;
}
.bt__thread {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--thread-x);
  width: 3px;
  translate: -50% 0;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-tinta, var(--color-text)) 35%, transparent);
}
.bt__thread-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-rosa, var(--color-primary));
  transform-origin: top;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
.bt__stop {
  position: relative;
  padding-inline-start: calc(var(--thread-x) + 1.4rem);
}
.bt__stop.is-past {
  opacity: 0.5;
}
/* El nudo donde la bandera se ata al hilo. */
.bt__knot {
  position: absolute;
  top: 0.5rem;
  left: var(--thread-x);
  width: 0.8rem;
  height: 0.8rem;
  translate: -50% 0;
  border-radius: 50%;
  background: var(--flag-bg);
  box-shadow: 0 0 0 2px var(--color-paper, #fbf3e2);
}
/* El hilito corto del nudo a la bandera. */
.bt__stop::before {
  content: '';
  position: absolute;
  top: calc(0.5rem + 0.4rem - 1px);
  left: var(--thread-x);
  width: 1.4rem;
  height: 2px;
  background: color-mix(in srgb, var(--color-tinta, var(--color-text)) 55%, transparent);
}

/* La bandera: rectángulo de color con calados arriba y orilla festoneada (lo opaco se ve). */
.bt__flag {
  --hole: 0.16rem;
  --step: 1rem;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  padding: 1.7rem 1rem 2.4rem;
  text-align: center;
  background: var(--flag-bg);
  color: var(--flag-fg);
  transform-origin: 50% 0;
  transform: rotate(var(--tilt)) scale(1);
  transition:
    opacity calc(0.5s * var(--motion-scale)) ease,
    transform calc(0.6s * var(--motion-scale)) cubic-bezier(0.3, 1.4, 0.5, 1);
  -webkit-mask:
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left top /
      var(--step) 1rem repeat-x,
    linear-gradient(#000, #000) 0 1rem / 100% calc(100% - 1.8rem) no-repeat,
    radial-gradient(circle at 50% 0, #000 calc(var(--step) / 2 - 1px), transparent calc(var(--step) / 2))
      left bottom / var(--step) 0.8rem repeat-x;
  mask:
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left top /
      var(--step) 1rem repeat-x,
    linear-gradient(#000, #000) 0 1rem / 100% calc(100% - 1.8rem) no-repeat,
    radial-gradient(circle at 50% 0, #000 calc(var(--step) / 2 - 1px), transparent calc(var(--step) / 2))
      left bottom / var(--step) 0.8rem repeat-x;
}
/* Apagada hasta que el hilo llega (solo con "línea que se llena"). */
.bt__stop:not(.is-lit) .bt__flag {
  opacity: 0.35;
  transform: rotate(var(--tilt)) scale(0.94);
}
.bt__stop.is-now .bt__flag {
  animation: bt-now calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.bt__icon {
  width: 2.2rem;
  height: 2.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.bt__time {
  font-family: var(--t-time-font, var(--font-display));
  font-size: calc(clamp(1.6rem, 8cqi, 2.2rem) * var(--t-time-size, 1));
  line-height: 1.05;
  color: var(--t-time-color, var(--flag-fg));
}
.bt__label {
  font-family: var(--t-activity-font, var(--font-serif));
  font-size: calc(clamp(1rem, 4.4cqi, 1.2rem) * var(--t-activity-size, 1));
  line-height: 1.25;
  color: var(--t-activity-color, var(--flag-fg));
  overflow-wrap: anywhere;
}

/* Ancho: el hilo al centro y las banderas se alternan. */
@container (min-width: 34rem) {
  .bt__list {
    --thread-x: 50%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .bt__stop {
    padding-inline: 1.6rem;
  }
  .bt__stop.is-left {
    grid-column: 1;
  }
  .bt__stop.is-right {
    grid-column: 2;
    margin-top: 2.6rem;
  }
  .bt__stop.is-left .bt__knot,
  .bt__stop.is-left::before {
    left: auto;
    right: 0;
  }
  .bt__stop.is-left .bt__knot {
    translate: 50% 0;
  }
  .bt__stop.is-right .bt__knot,
  .bt__stop.is-right::before {
    left: 0;
  }
  .bt__stop.is-right .bt__knot {
    translate: -50% 0;
  }
  .bt__stop::before {
    width: 1.6rem;
  }
}
@keyframes bt-now {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bt__stop.is-now .bt__flag {
    animation: none;
  }
  .bt__flag {
    transition: none;
  }
}
</style>
