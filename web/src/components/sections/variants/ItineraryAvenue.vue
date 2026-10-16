<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Itinerario de Nueva York ("avenida"): la noche como una línea del metro que baja por un
 * poste con su farol. Cada momento es una estación: su ícono en un círculo sobre la línea
 * y su letrero de calle (la hora, como el número de la cuadra, y la actividad en
 * mayúsculas), uno de cada lado. Con "línea que se llena", el poste se ilumina al bajar y
 * las estaciones se encienden. Al pie, la Estatua de la Libertad y el puente de Brooklyn
 * (adornos del tema, en el color de la tinta).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const items = computed(() => event.value.itinerary)
const title = computed(() => props.section.title ?? 'Itinerario')
// La palabra más larga de los letreros manda en el tamaño de la letra: así ninguna se parte.
const longest = computed(() =>
  Math.max(6, ...items.value.flatMap((i) => i.label.split(/\s+/).map((w) => w.length))),
)

const track = ref<HTMLElement | null>(null)
const stops = ref<HTMLElement[]>([])
const { fill, active } = useTimelineProgress(
  track,
  stops,
  () => props.section.effects.includes('timeline-fill') && !reduced.value,
)

// Los del tema o, si no trae, los compartidos (themes/_shared); la invitación los puede quitar.
const statue = computed(() =>
  decorOr(props.section.decor, 'statue', resolveAsset.value('estatua.svg')),
)
const bridge = computed(() =>
  decorOr(props.section.decor, 'bridge', resolveAsset.value('puente.svg')),
)

const mask = (url: string | null | undefined) =>
  url ? { '--ny-mask': `url("${url.replace(/"/g, '%22')}")` } : undefined
</script>

<template>
  <div class="ny-itin">
    <h2 class="ny-itin__title" data-text="title">{{ title }}</h2>

    <ol ref="track" class="ny-itin__street" :style="{ '--ny-chars': longest }">
      <span class="ny-itin__pole" aria-hidden="true">
        <span class="ny-itin__pole-fill" :style="{ transform: `scaleY(${fill})` }" />
      </span>

      <li
        v-for="(item, i) in items"
        :key="`${item.time}-${item.label}`"
        class="ny-itin__stop"
        :class="i % 2 === 0 ? 'is-left' : 'is-right'"
      >
        <span class="ny-itin__sign">
          <time class="ny-itin__time" data-text="time" :datetime="item.time">{{
            time12h(item.time)
          }}</time>
          <span class="ny-itin__label" data-text="activity">{{ item.label }}</span>
        </span>
        <span ref="stops" class="ny-itin__station" :class="{ 'is-lit': i < active }">
          <AppIcon v-if="item.icon" :name="item.icon" class="ny-itin__icon" />
        </span>
      </li>
    </ol>

    <div v-if="statue || bridge" class="ny-itin__harbor" aria-hidden="true">
      <span v-if="bridge" class="ny-itin__bridge" :style="mask(bridge)" />
      <span v-if="statue" class="ny-itin__statue" :style="mask(statue)" />
    </div>
  </div>
</template>

<style scoped>
.ny-itin {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  max-width: 30rem;
  margin: 0 auto;
}
.ny-itin__title {
  margin: 0 0 var(--space-2);
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.3rem, 12cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}

/*
 * La calle: tres columnas (letrero | línea | letrero). Cada estación ocupa su fila; su
 * letrero va a la izquierda o a la derecha. El poste corre detrás de las estaciones, con
 * el farol arriba y la base abajo.
 */
.ny-itin__street {
  --station: 2.5rem;
  position: relative;
  display: grid;
  grid-template-columns: 1fr var(--station) 1fr;
  row-gap: 1.1rem;
  width: 100%;
  margin: 0;
  padding: 2.4rem 0 1.6rem;
  list-style: none;
}
.ny-itin__pole {
  position: absolute;
  top: 0.9rem;
  bottom: 0;
  left: 50%;
  width: 3px;
  translate: -50% 0;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-primary-strong) 22%, transparent);
}
.ny-itin__pole-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary-strong);
  transform-origin: top;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
/* El farol: un globo de luz con su copete art déco. */
.ny-itin__pole::before {
  content: '';
  position: absolute;
  top: -0.95rem;
  left: 50%;
  width: 1.05rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 45%,
    #fff 0 22%,
    var(--color-primary-soft) 48%,
    transparent 72%
  );
  box-shadow: 0 0 1.4rem 0.4rem color-mix(in srgb, var(--color-primary-soft) 45%, transparent);
  animation: ny-lamp calc(4s * var(--motion-scale)) ease-in-out infinite;
}
/* La base: escalonada, como la de los postes de la Quinta Avenida. */
.ny-itin__pole::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 1.4rem;
  height: 0.9rem;
  translate: -50% 0;
  background: var(--color-primary-strong);
  clip-path: polygon(
    30% 0,
    70% 0,
    70% 35%,
    85% 35%,
    85% 65%,
    100% 65%,
    100% 100%,
    0 100%,
    0 65%,
    15% 65%,
    15% 35%,
    30% 35%
  );
}
@keyframes ny-lamp {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.ny-itin__stop {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
  align-items: center;
}
/* La estación: el ícono en un círculo sobre la línea (como las del metro). */
.ny-itin__station {
  position: relative;
  z-index: 1;
  grid-column: 2;
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--station);
  aspect-ratio: 1;
  border: 2px solid var(--color-primary-strong);
  border-radius: 50%;
  background: var(--color-bg);
  color: var(--color-primary-strong);
  transition:
    background-color calc(0.45s * var(--motion-scale)) ease,
    color calc(0.45s * var(--motion-scale)) ease;
}
.ny-itin__station.is-lit {
  background: var(--color-primary-strong);
  color: var(--color-bg);
}
.ny-itin__station::after {
  content: '';
  position: absolute;
  inset: -0.35rem;
  border-radius: 50%;
  box-shadow: 0 0 1rem color-mix(in srgb, var(--color-primary-soft) 60%, transparent);
  opacity: 0;
  transition: opacity calc(0.45s * var(--motion-scale)) ease;
}
.ny-itin__station.is-lit::after {
  opacity: 1;
}
.ny-itin__icon {
  width: 1.15rem;
  height: 1.15rem;
}
.ny-itin__icon.app-icon--image {
  height: 1.5rem;
}

/*
 * El letrero de calle: placa de esmalte con su filo por dentro. En la noche es plata con
 * letra negra; sobre papel, tinta con letra blanca (los tokens de la franja lo cambian).
 */
.ny-itin__sign {
  position: relative;
  grid-row: 1;
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  max-width: 100%;
  margin-inline: 0.7rem;
  padding: 0.6rem 0.85rem 0.65rem;
  border-radius: 0.3rem;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-primary-strong) 88%, var(--color-bg)) 0%,
    var(--color-primary-strong) 55%
  );
  color: var(--color-bg);
  box-shadow: var(--shadow-card);
}
.ny-itin__sign::after {
  content: '';
  position: absolute;
  inset: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-bg) 60%, transparent);
  border-radius: 0.18rem;
  pointer-events: none;
}
/* El soporte que une el letrero con la línea. */
.ny-itin__sign::before {
  content: '';
  position: absolute;
  top: 50%;
  width: 0.75rem;
  height: 2px;
  translate: 0 -50%;
  background: var(--color-primary-strong);
}
.is-left .ny-itin__sign {
  grid-column: 1;
  justify-self: end;
  text-align: end;
  transform-origin: right center;
}
.is-left .ny-itin__sign::before {
  left: 100%;
}
.is-right .ny-itin__sign {
  grid-column: 3;
  justify-self: start;
  text-align: start;
  transform-origin: left center;
}
.is-right .ny-itin__sign::before {
  right: 100%;
}
.ny-itin__time {
  font-family: var(--t-time-font, var(--font-display));
  font-size: calc(clamp(0.72rem, 3.3cqi, 0.82rem) * var(--t-time-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-time-color, inherit);
  opacity: 0.85;
}
.ny-itin__label {
  font-family: var(--t-activity-font, var(--font-caps));
  font-weight: 500;
  font-size: min(
    calc(clamp(0.88rem, 4.1cqi, 1.05rem) * var(--t-activity-size, 1)),
    calc((50cqi - 4.4rem) / (var(--ny-chars, 8) * 0.84))
  );
  line-height: 1.15;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--t-activity-color, inherit);
}

/* Al pie, el puerto: el puente de punta a punta y la estatua a un lado (siluetas en tinta). */
.ny-itin__harbor {
  position: relative;
  width: 100%;
  height: clamp(5.5rem, 34cqi, 8.5rem);
  margin-top: var(--space-1);
}
.ny-itin__bridge,
.ny-itin__statue {
  position: absolute;
  bottom: 0;
  background: color-mix(in srgb, var(--color-primary) 70%, transparent);
  -webkit-mask: var(--ny-mask) center bottom / contain no-repeat;
  mask: var(--ny-mask) center bottom / contain no-repeat;
}
.ny-itin__bridge {
  left: 14%;
  right: 0;
  height: 62%;
}
.ny-itin__statue {
  left: 0;
  width: 22%;
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .ny-itin__pole::before {
    animation: none;
  }
}
</style>
