<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { hourMinute, time12h } from '@/services/dateFormatService'
import { placeCalendarUrl } from '@/services/locationService'
import type { ResolvedSection } from '@/types/event'

/**
 * Ubicación en placa de talavera ("placa"): cada lugar es una placa como las de las calles:
 * rectángulo crema con filo doble de cobalto y un azulejito en cada esquina (ranura
 * `azulejo`), con la etiqueta (Ceremonia, Recepción…) y el nombre. Al lado, un corazón de
 * encaje con la hora. La foto del lugar es una polaroid girada con cinta, y debajo la
 * dirección y los botones "Ver ubicación" y, si la sección lo pide, "Agregar al calendario".
 * Una gerbera (ranura `flores`) se asoma en una esquina. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

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

// Los azulejos de las esquinas: el de la ranura (el mismo en las cuatro) o los compartidos.
const tiles = computed(() => {
  const own = decorOr(props.section.decor, 'tile', null)
  if (own) return [own, own, own, own]
  if ('tile' in props.section.decor) return []
  return [1, 2, 3, 4].map((n) => resolveAsset.value(`azulejo-${n}.svg`))
})
const flower = computed(() =>
  decorOr(props.section.decor, 'flowers', resolveAsset.value('gerbera.svg')),
)
</script>

<template>
  <div class="lp" :class="{ 'lp--side': section.layout === 'side' }">
    <img v-if="flower" :src="flower" alt="" class="lp__flower" loading="lazy" />
    <h2 class="lp__title" data-text="title">
      <TypewriterText
        :text="title"
        :active="section.effects.includes('typewriter')"
        :duration="1000"
      />
    </h2>

    <article v-for="(place, i) in places" :key="i" class="lp__place">
      <div class="lp__top">
        <div class="lp__plaque">
          <img
            v-for="(tile, t) in tiles"
            :key="t"
            :src="tile ?? undefined"
            alt=""
            class="lp__tile"
            :class="`lp__tile--${t}`"
            loading="lazy"
          />
          <p v-if="place.label" class="lp__label" data-text="label">{{ place.label }}</p>
          <h3 class="lp__name" data-text="place">{{ place.name }}</h3>
        </div>

        <div v-if="place.time" class="lp__heart" role="img" :aria-label="`Hora: ${place.time}`">
          <svg class="lp__heart-art" viewBox="0 0 100 92" aria-hidden="true">
            <path
              class="lp__heart-lace"
              d="M50 86 C14 58 4 40 4 26 C4 13 14 5 26 5 C37 5 46 11 50 20 C54 11 63 5 74 5 C86 5 96 13 96 26 C96 40 86 58 50 86 Z"
            />
            <path
              class="lp__heart-fill"
              d="M50 80 C18 55 10 39 10 27 C10 17 18 11 27 11 C37 11 46 16 50 25 C54 16 63 11 73 11 C82 11 90 17 90 27 C90 39 82 55 50 80 Z"
            />
          </svg>
          <span class="lp__time" data-text="detail">{{ place.time }}</span>
        </div>
      </div>

      <figure v-if="place.photo" class="lp__polaroid" :class="{ 'lp__polaroid--odd': i % 2 }">
        <span class="lp__tape" aria-hidden="true" />
        <img
          :src="place.photo"
          :alt="place.name"
          class="lp__photo fx-photo"
          loading="lazy"
          decoding="async"
        />
      </figure>

      <p v-if="place.city || place.address" class="lp__address" data-text="detail">
        <span v-if="place.address">{{ place.address }}</span>
        <span v-if="place.city">{{ place.city }}</span>
      </p>

      <div v-if="place.maps_url || place.calendarUrl" class="lp__buttons">
        <a
          v-if="place.maps_url"
          :href="place.maps_url"
          class="lp__button inv-btn"
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
          class="lp__button inv-btn"
          data-text="button"
          target="_blank"
          rel="noopener"
          :aria-label="`Agregar al calendario: ${place.name}`"
        >
          <AppIcon name="calendar-plus" /> Agregar al calendario
        </a>
      </div>
    </article>
  </div>
</template>

<style scoped>
.lp {
  --lp-blue: var(--color-talavera, var(--color-primary));
  --lp-paper: var(--color-paper, #fbf3e2);
  container-type: inline-size;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 28rem;
  margin: 0 auto;
}
.lp--side {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  align-items: start;
  max-width: 56rem;
}
.lp--side .lp__title {
  grid-column: 1 / -1;
}
.lp__flower {
  position: absolute;
  top: -0.6rem;
  right: 0;
  width: clamp(3rem, 15cqi, 4.2rem);
  height: auto;
  rotate: 14deg;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
  pointer-events: none;
}
.lp__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
.lp__place {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}
.lp__top {
  position: relative;
  width: 100%;
  padding-bottom: 2.6rem;
}

/* La placa: crema, filo cobalto y un segundo filo por dentro; un azulejo en cada esquina. */
.lp__plaque {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  padding: 1.9rem 2.2rem 1.7rem;
  border: 3px solid var(--lp-blue);
  border-radius: 0.5rem;
  background: var(--lp-paper);
  text-align: center;
  box-shadow:
    inset 0 0 0 4px var(--lp-paper),
    inset 0 0 0 5px var(--lp-blue),
    0 0.6rem 1rem -0.6rem rgb(0 0 0 / 0.45);
}
.lp__tile {
  position: absolute;
  width: 1.7rem;
  height: 1.7rem;
  object-fit: cover;
  border-radius: 0.15rem;
  box-shadow: 0 0 0 1px var(--lp-blue);
}
.lp__tile--0 {
  top: 0.4rem;
  left: 0.4rem;
}
.lp__tile--1 {
  top: 0.4rem;
  right: 0.4rem;
}
.lp__tile--2 {
  bottom: 0.4rem;
  left: 0.4rem;
}
.lp__tile--3 {
  right: 0.4rem;
  bottom: 0.4rem;
}
.lp__label {
  margin: 0;
  font-family: var(--t-label-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-label-size, 1));
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--t-label-color, var(--color-rosa, var(--color-accent)));
}
.lp__name {
  margin: 0;
  font-family: var(--t-place-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.3rem, 6.4cqi, 1.8rem) * var(--t-place-size, 1));
  line-height: 1.2;
  color: var(--t-place-color, var(--lp-blue));
  overflow-wrap: anywhere;
}

/* El corazón de encaje: borde de puntitos (festoneado) y la hora al centro. */
.lp__heart {
  position: absolute;
  right: 0.6rem;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 7rem;
  aspect-ratio: 100 / 92;
  rotate: 6deg;
  filter: drop-shadow(0 4px 5px rgb(0 0 0 / 0.3));
}
.lp__heart-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.lp__heart-lace {
  fill: var(--lp-paper);
  stroke: var(--lp-paper);
  stroke-width: 6;
  stroke-linejoin: round;
  stroke-dasharray: 0.1 7;
  stroke-linecap: round;
}
.lp__heart-fill {
  fill: var(--lp-paper);
  stroke: var(--lp-blue);
  stroke-width: 1.2;
  stroke-dasharray: 3 2.5;
}
.lp__time {
  position: relative;
  margin-top: -0.4rem;
  font-family: var(--t-detail-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.8rem * var(--t-detail-size, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  color: var(--t-detail-color, var(--color-tinta, #3a2420));
}

/* La foto: polaroid girada, con cinta. */
.lp__polaroid {
  position: relative;
  width: min(100%, 17rem);
  margin: 0.4rem 0;
  padding: 0.55rem 0.55rem 1.6rem;
  background: var(--lp-paper);
  rotate: -3deg;
  box-shadow: 0 0.6rem 1rem -0.5rem rgb(0 0 0 / 0.5);
}
.lp__polaroid--odd {
  rotate: 3deg;
}
.lp__tape {
  position: absolute;
  top: -0.7rem;
  left: 50%;
  width: 4.2rem;
  height: 1.4rem;
  translate: -50% 0;
  rotate: -4deg;
  background: color-mix(in srgb, var(--color-cempasuchil, var(--color-accent)) 70%, transparent);
}
.lp__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.lp__address {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  text-align: center;
  font-family: var(--t-detail-font, var(--font-serif));
  font-size: calc(1rem * var(--t-detail-size, 1));
  line-height: 1.4;
  color: var(--t-detail-color, var(--color-text));
}

.lp__buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}
.lp__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border: var(--btn-border, 1px solid var(--lp-blue));
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-text)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.lp__button :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
.lp__button:focus-visible {
  outline: 2px solid var(--lp-blue);
  outline-offset: 3px;
}
</style>
