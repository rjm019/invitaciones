<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BabyPram from '@/components/ui/BabyPram.vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useEvent } from '@/composables/useEvent'
import { motionScale } from '@/composables/useMotionScale'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { hourMinute, time12h } from '@/services/dateFormatService'
import { placeCalendarUrl } from '@/services/locationService'
import type { ResolvedSection } from '@/types/event'

/**
 * Ubicación en caminito (`caminito`): cada lugar es una tarjeta crema con doble filete del
 * color del listón (tipo, nombre, hora, foto, dirección y los botones "Ver ubicación" y, si
 * la sección lo pide, "Agregar al calendario") y, arriba, un caminito punteado en curva (una
 * S suave) que va de la izquierda a un pin de mapa. Al llegar a la pantalla, los puntos
 * aparecen uno tras otro (opacity y scale escalonados) y la carriola recorre el camino
 * (animación de transform por tramos) hasta quedar junto al pin, donde deja de rodar y el pin
 * da un saltito. Cada lugar arranca cuando él llega a la pantalla. Con "menos movimiento" el
 * camino está completo y la carriola ya junto al pin. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const reduced = useReducedMotion()

const title = computed(() => props.section.title ?? 'Ubicación')
const button = computed(() => props.section.button ?? 'Ver ubicación')
const startTime = computed(() =>
  event.value.starts_at ? time12h(hourMinute(event.value.starts_at, event.value.timezone)) : null,
)

// Los lugares de esta sección (si es otra ubicación, los suyos) o, si no, los del evento.
const sourcePlaces = computed(() => props.section.places ?? event.value.locations)
const places = computed(() =>
  sourcePlaces.value.length
    ? sourcePlaces.value.map((l) => ({
        ...l,
        city: '',
        time: l.time ? time12h(l.time) : null,
        calendarUrl: props.section.calendar ? placeCalendarUrl(l, event.value.title) : null,
      }))
    : [
        {
          label: '',
          name: event.value.venue.display_name || event.value.venue.name,
          city: event.value.venue.city,
          time: startTime.value,
          address: event.value.venue.address,
          maps_url: event.value.venue.maps_url,
          photo: event.value.venue.photo,
          icon: undefined as string | undefined,
          calendarUrl: null as string | null,
        },
      ],
)

// El camino: dos curvas de Bézier que forman una S suave (viewBox 300 × 90) y terminan en el pin.
type Pt = [number, number]
const CURVES: [Pt, Pt, Pt, Pt][] = [
  [[22, 66], [78, 66], [92, 22], [150, 44]],
  [[150, 44], [210, 66], [232, 40], [262, 34]],
]
const bezier = (c: [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  return [
    k[0] * c[0][0] + k[1] * c[1][0] + k[2] * c[2][0] + k[3] * c[3][0],
    k[0] * c[0][1] + k[1] * c[1][1] + k[2] * c[2][1] + k[3] * c[3][1],
  ]
}
// Un punto cada ~7.5 unidades de largo, sin el último tramo (ahí va el pin).
const dots: Pt[] = (() => {
  const samples: { p: Pt; len: number }[] = []
  let len = 0
  let prev: Pt = CURVES[0]![0]
  for (const c of CURVES) {
    for (let i = 0; i <= 120; i++) {
      const p = bezier(c, i / 120)
      len += Math.hypot(p[0] - prev[0], p[1] - prev[1])
      prev = p
      samples.push({ p, len })
    }
  }
  const out: Pt[] = []
  for (let at = 0; at < len - 9; at += 7.5) {
    const s = samples.find((x) => x.len >= at)
    if (s) out.push([Math.round(s.p[0] * 10) / 10, Math.round(s.p[1] * 10) / 10])
  }
  return out
})()

// Cada lugar arranca (idle → go → done) cuando su camino llega a la pantalla.
const TRIP_MS = 4900
const stage = ref<('idle' | 'go' | 'done')[]>([])
const roads = ref<HTMLElement[]>([])
const timers: number[] = []
let observer: IntersectionObserver | null = null

function finish() {
  stage.value = places.value.map(() => 'done')
}
onMounted(() => {
  stage.value = places.value.map(() => 'idle')
  if (reduced.value || typeof IntersectionObserver === 'undefined') {
    finish()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        // El lugar se lee de la marca del elemento: el orden de `roads` no está garantizado.
        const i = Number((entry.target as HTMLElement).dataset.i)
        if (!Number.isInteger(i) || stage.value[i] !== 'idle') continue
        observer?.unobserve(entry.target)
        stage.value[i] = 'go'
        timers.push(
          window.setTimeout(() => {
            stage.value[i] = 'done'
          }, TRIP_MS * motionScale()),
        )
      }
    },
    // Basta con asomar un poco: el primer lugar suele quedar justo en el borde de la pantalla.
    { threshold: 0.25 },
  )
  // Con el DOM ya pintado: cada camino se observa, también el que ya está a la vista al montar.
  void nextTick(() => roads.value.forEach((el) => observer?.observe(el)))
})
onBeforeUnmount(() => {
  observer?.disconnect()
  timers.forEach((t) => window.clearTimeout(t))
})
</script>

<template>
  <div class="lpa" :class="{ 'lpa--side': section.layout === 'side' }">
    <h2 class="lpa__title" data-text="title">
      <TypewriterText
        :text="title"
        :active="section.effects.includes('typewriter')"
        :duration="1000"
      />
    </h2>

    <article v-for="(place, i) in places" :key="i" class="lpa__place">
      <div
        ref="roads"
        :data-i="i"
        class="lpa__road"
        :class="`is-${stage[i] ?? 'idle'}`"
        aria-hidden="true"
      >
        <svg class="lpa__map" viewBox="0 0 300 90" focusable="false">
          <circle
            v-for="(d, k) in dots"
            :key="k"
            class="lpa__dot"
            :cx="d[0]"
            :cy="d[1]"
            :r="k % 2 ? 1.5 : 2"
            :style="{ '--k': k }"
          />
          <ellipse class="lpa__spot" cx="262" cy="34" rx="7" ry="1.8" />
          <g class="lpa__pin">
            <path
              class="lpa__pin-body"
              d="M262 34C257 27 253 22 253 15A9 9 0 0 1 271 15C271 22 267 27 262 34Z"
            />
            <circle class="lpa__pin-eye" cx="262" cy="15" r="3.4" />
          </g>
        </svg>
        <BabyPram class="lpa__pram" :rolling="stage[i] === 'go'" size="3.2rem" />
      </div>

      <div class="lpa__card">
        <p v-if="place.label" class="lpa__label" data-text="label">{{ place.label }}</p>
        <h3 class="lpa__name" data-text="place">{{ place.name }}</h3>
        <p v-if="place.time" class="lpa__time" data-text="detail">{{ place.time }}</p>

        <figure v-if="place.photo" class="lpa__photo">
          <img
            :src="place.photo"
            :alt="place.name"
            class="lpa__img fx-photo"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <p v-if="place.city || place.address" class="lpa__address" data-text="detail">
          <span v-if="place.address">{{ place.address }}</span>
          <span v-if="place.city">{{ place.city }}</span>
        </p>

        <div v-if="place.maps_url || place.calendarUrl" class="lpa__buttons">
          <a
            v-if="place.maps_url"
            :href="place.maps_url"
            class="lpa__button inv-btn"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${place.name}`"
          >
            <AppIcon name="location-dot" /> {{ button }}
          </a>
          <a
            v-if="place.calendarUrl"
            :href="place.calendarUrl"
            class="lpa__button inv-btn"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`Agregar al calendario: ${place.name}`"
          >
            <AppIcon name="calendar-plus" /> Agregar al calendario
          </a>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.lpa {
  --lpa-line: var(--color-primary);
  --lpa-line-soft: color-mix(in srgb, var(--color-primary) 55%, var(--color-paper, #fdf8f0));
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 28rem;
  margin: 0 auto;
}
.lpa--side {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  align-items: start;
  max-width: 56rem;
}
.lpa--side .lpa__title {
  grid-column: 1 / -1;
}
.lpa__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
.lpa__place {
  display: grid;
  gap: 0.2rem;
  width: 100%;
  min-width: 0;
}

/* El caminito: el SVG fija la proporción; la carriola se coloca en unidades del ancho (cqw). */
.lpa__road {
  position: relative;
  container-type: inline-size;
  width: 100%;
  aspect-ratio: 300 / 90;
}
.lpa__map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.lpa__dot {
  fill: var(--color-oro, var(--lpa-line));
  opacity: 0;
  scale: 0.2;
  transform-box: fill-box;
  transform-origin: center;
}
.is-go .lpa__dot,
.is-done .lpa__dot {
  opacity: 0.9;
  scale: 1;
  transition:
    opacity calc(0.4s * var(--motion-scale)) ease calc(var(--k) * 0.075s * var(--motion-scale)),
    scale calc(0.5s * var(--motion-scale)) cubic-bezier(0.3, 1.5, 0.5, 1)
      calc(var(--k) * 0.075s * var(--motion-scale));
}
.lpa__spot {
  fill: color-mix(in srgb, var(--color-primary-strong, var(--color-primary)) 28%, transparent);
}
.lpa__pin {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.lpa__pin-body {
  fill: var(--color-primary-strong, var(--color-primary));
  stroke: var(--color-paper, #fdf8f0);
  stroke-width: 1;
  stroke-linejoin: round;
}
.lpa__pin-eye {
  fill: var(--color-paper, #fdf8f0);
}
.is-done .lpa__pin {
  animation: lpa-hop calc(0.7s * var(--motion-scale)) cubic-bezier(0.3, 0.1, 0.4, 1) 1;
}
/* La carriola: su centro y su pie quedan sobre el camino (translate); transform lo recorre. */
.lpa__pram {
  position: absolute;
  top: 0;
  left: 0;
  translate: -56% -90%;
  transform: translate(7.33cqw, 22cqw);
}
.is-go .lpa__pram {
  animation: lpa-roll calc(4.4s * var(--motion-scale)) cubic-bezier(0.35, 0.05, 0.6, 1)
    calc(0.5s * var(--motion-scale)) both;
}
.is-done .lpa__pram {
  transform: translate(76.4cqw, 15.2cqw);
}

/* La tarjeta: crema, filete del listón y otro más fino por dentro. */
.lpa__card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding: 1.6rem 1.4rem 1.5rem;
  border: 1.5px solid var(--lpa-line);
  border-radius: 1.3rem;
  background:
    radial-gradient(ellipse at 50% 0%, rgb(255 255 255 / 0.7), transparent 65%),
    var(--color-paper, #fdf8f0);
  text-align: center;
  box-shadow:
    0 1.1rem 1.6rem -1.2rem color-mix(in srgb, var(--color-primary) 55%, transparent),
    inset 0 0 1.2rem color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.lpa__card::before {
  content: '';
  position: absolute;
  inset: 0.4rem;
  border: 1px solid var(--lpa-line-soft);
  border-radius: 1rem;
  pointer-events: none;
}
.lpa__label {
  margin: 0;
  font-family: var(--t-label-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.78rem * var(--t-label-size, 1));
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--t-label-color, var(--color-oro, var(--color-primary)));
}
.lpa__name {
  margin: 0;
  font-family: var(--t-place-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.9rem, 9cqi, 2.4rem) * var(--t-place-size, 1));
  line-height: 1.15;
  color: var(--t-place-color, var(--color-primary-strong, var(--color-primary)));
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.lpa__time {
  margin: 0;
  padding: 0.15rem 1rem;
  border-block: 1px solid var(--lpa-line-soft);
  font-family: var(--t-detail-font, var(--font-button, var(--font-serif)));
  font-weight: 600;
  font-size: calc(1.05rem * var(--t-detail-size, 1));
  letter-spacing: 0.08em;
  color: var(--t-detail-color, var(--color-text));
}
.lpa__photo {
  width: min(100%, 17rem);
  margin: 0.2rem 0;
  padding: 0.35rem;
  border: 1px solid var(--lpa-line-soft);
  border-radius: 0.8rem;
  background: var(--color-paper, #fdf8f0);
}
.lpa__img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.5rem;
  object-fit: cover;
}
.lpa__address {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-detail-size, 1));
  line-height: 1.4;
  color: var(--t-detail-color, var(--color-text));
}
.lpa__buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}
.lpa__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border: var(--btn-border, 1px solid var(--lpa-line));
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-button, var(--font-caps)));
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-text)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.lpa__button :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
.lpa__button:focus-visible {
  outline: 2px solid var(--lpa-line);
  outline-offset: 3px;
}

/* Recorrido por tramos: puntos de las dos curvas (x, y en cqw = unidades del viewBox ÷ 3). */
@keyframes lpa-roll {
  0% {
    transform: translate(7.33cqw, 22cqw);
  }
  12% {
    transform: translate(19.17cqw, 19.83cqw);
  }
  25% {
    transform: translate(28.4cqw, 15.6cqw);
  }
  38% {
    transform: translate(37.8cqw, 12.73cqw);
  }
  50% {
    transform: translate(50cqw, 14.67cqw);
  }
  63% {
    transform: translate(62.87cqw, 17.53cqw);
  }
  78% {
    transform: translate(72.4cqw, 16.5cqw);
  }
  100% {
    transform: translate(76.4cqw, 15.2cqw);
  }
}
@keyframes lpa-hop {
  0%,
  100% {
    transform: translateY(0) scale(1, 1);
  }
  25% {
    transform: translateY(0) scale(1.1, 0.88);
  }
  55% {
    transform: translateY(-0.6rem) scale(0.95, 1.06);
  }
  80% {
    transform: translateY(0) scale(1.06, 0.94);
  }
}
@media (prefers-reduced-motion: reduce) {
  .lpa__dot {
    opacity: 0.9;
    scale: 1;
    transition: none;
  }
  .lpa__pram,
  .is-go .lpa__pram {
    animation: none;
    transform: translate(76.4cqw, 15.2cqw);
  }
  .is-done .lpa__pin {
    animation: none;
  }
}
</style>
