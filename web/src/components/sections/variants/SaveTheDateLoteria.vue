<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MonthCalendar from '@/components/ui/MonthCalendar.vue'
import { motionScale } from '@/composables/useMotionScale'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { googleCalendarUrl, monthGrid } from '@/services/calendarService'
import { dateParts, hourMinute, time12h } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * "Save the date" en carta de lotería (`loteria`): una tarjeta 5:8 con marco de color; arriba,
 * el día del mes como número de la carta; al centro, el corazón sagrado, y abajo, en una cinta,
 * el título de la sección en mayúsculas. Al entrar a la vista (o al tocarla) la carta se voltea
 * (rotateY con perspectiva) y el dorso enseña el mes con el día marcado, la fecha larga y la
 * hora. Accesible: el frente es un botón con aria-pressed y la cara que no se ve queda
 * inerte. Con "menos movimiento" las caras solo se funden. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'El gran día')
const heart = computed(() =>
  decorOr(props.section.decor, 'sacred_heart', resolveAsset.value('corazon-sagrado.svg')),
)
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

const flipped = ref(false)
const front = ref<HTMLElement | null>(null)
const back = ref<HTMLElement | null>(null)
function toggle() {
  flipped.value = !flipped.value
  // El foco sigue a la cara que se ve.
  void nextTick(() =>
    (flipped.value ? back.value : front.value)
      ?.querySelector<HTMLElement>('button, a')
      ?.focus({ preventScroll: true }),
  )
}

// Al llegar a la vista, la carta se voltea sola (una vez) después de que se vea el frente.
const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { threshold: 0.6 })
let timer: ReturnType<typeof setTimeout> | undefined
watch(inView, (v) => {
  if (v) timer = setTimeout(() => (flipped.value = true), 1100 * motionScale())
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div ref="root" class="lt">
    <div v-if="parts" class="lt__card" :class="{ 'is-flipped': flipped }">
      <div class="lt__inner">
        <div ref="front" class="lt__face lt__face--front" :inert="flipped || undefined">
          <span class="lt__day" data-text="date">{{ parts.day }}</span>
          <img v-if="heart" :src="heart" alt="" class="lt__art" loading="lazy" />
          <h2 class="lt__ribbon" data-text="title">{{ title }}</h2>
          <button
            type="button"
            class="lt__flip"
            :aria-pressed="flipped"
            aria-label="Voltear la carta para ver el calendario"
            @click="toggle"
          />
        </div>

        <div ref="back" class="lt__face lt__face--back" :inert="!flipped || undefined">
          <p class="lt__month" data-text="date">{{ parts.month }} {{ parts.year }}</p>
          <MonthCalendar v-if="grid" :grid="grid" :shown="flipped" :label="label" class="lt__calendar" />
          <p class="lt__when" data-text="date">
            {{ parts.weekday }} {{ parts.day }}<template v-if="time"> · {{ time }}</template>
          </p>
          <a v-if="calendarUrl" :href="calendarUrl" class="lt__add inv-btn" target="_blank" rel="noopener">
            <AppIcon name="calendar-plus" />
            Agregar a mi calendario
          </a>
          <button
            type="button"
            class="lt__back-btn"
            :aria-pressed="flipped"
            aria-label="Voltear la carta para ver el frente"
            @click="toggle"
          >
            Voltear
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lt {
  --lt-blue: var(--color-talavera, var(--color-primary));
  --lt-pink: var(--color-rosa, var(--color-accent));
  container-type: inline-size;
  display: grid;
  justify-items: center;
}
.lt__card {
  width: min(100cqi, 20rem);
  aspect-ratio: 5 / 8;
  perspective: 1000px;
}
.lt__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform calc(0.9s * var(--motion-scale)) cubic-bezier(0.3, 0.7, 0.2, 1.08);
}
.lt__card.is-flipped .lt__inner {
  transform: rotateY(180deg);
}
.lt__face {
  position: absolute;
  inset: 0;
  display: grid;
  overflow: hidden;
  padding: 0.7rem;
  border: 0.7rem solid var(--color-talavera, var(--color-primary));
  border-radius: 0.9rem;
  background: var(--color-paper, #fbf3e2);
  box-shadow:
    inset 0 0 0 2px var(--color-amarillo, var(--color-primary-soft)),
    0 1rem 1.6rem -0.8rem rgb(0 0 0 / 0.5);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  color: var(--color-tinta, #3a2420);
}
.lt__face--front {
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  gap: 0.4rem;
}
.lt__face--back {
  transform: rotateY(180deg);
  align-content: center;
  justify-items: center;
  gap: 0.6rem;
  text-align: center;
  /* El calendario toma sus colores de aquí: talavera y rosa sobre el papel. */
  --color-primary: var(--lt-blue);
  --color-accent: var(--lt-pink);
}
.lt__day {
  font-family: var(--t-date-font, var(--font-display));
  font-size: calc(clamp(3.6rem, 26cqi, 5.4rem) * var(--t-date-size, 1));
  line-height: 1;
  color: var(--t-date-color, var(--color-rosa, var(--color-accent)));
  font-variant-numeric: tabular-nums;
}
.lt__art {
  align-self: center;
  width: 62%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.25));
}
/* La cinta con el título, con las puntas cortadas como una cinta de verdad. */
.lt__ribbon {
  width: calc(100% + 1.4rem);
  margin: 0 -0.7rem -0.2rem;
  padding: 0.55rem 1rem;
  background: var(--color-rosa, var(--color-accent));
  clip-path: polygon(0 0, 100% 0, calc(100% - 0.6rem) 50%, 100% 100%, 0 100%, 0.6rem 50%);
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(clamp(0.9rem, 6cqi, 1.2rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-paper, #fbf3e2));
  text-wrap: balance;
}
/* El botón cubre todo el frente: tocar la carta la voltea. */
.lt__flip {
  position: absolute;
  inset: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.lt__flip:focus-visible,
.lt__back-btn:focus-visible {
  outline: 2px solid var(--color-talavera, currentColor);
  outline-offset: -4px;
}
.lt__month {
  margin: 0;
  font-family: var(--t-date-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(clamp(0.95rem, 6cqi, 1.2rem) * var(--t-date-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-talavera, var(--color-primary)));
}
.lt__calendar {
  width: 100%;
}
.lt__when {
  margin: 0;
  font-family: var(--t-date-font, var(--font-serif));
  font-size: calc(1rem * var(--t-date-size, 1));
  text-transform: capitalize;
  color: var(--t-date-color, var(--color-tinta, #3a2420));
}
.lt__add {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  text-align: center;
}
.lt__back-btn {
  padding: 0.2rem 0.6rem;
  border: 0;
  background: none;
  font-family: var(--font-caps);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-tinta, #3a2420) 70%, transparent);
  cursor: pointer;
}

/* Menos movimiento: sin giro; las caras se funden. */
@media (prefers-reduced-motion: reduce) {
  .lt__inner,
  .lt__card.is-flipped .lt__inner {
    transform: none;
    transition: none;
  }
  .lt__face {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    transition: opacity calc(0.3s * var(--motion-scale)) ease;
  }
  .lt__face--back {
    transform: none;
    opacity: 0;
  }
  .lt__card.is-flipped .lt__face--back {
    opacity: 1;
  }
  .lt__card.is-flipped .lt__face--front {
    opacity: 0;
  }
}
</style>
