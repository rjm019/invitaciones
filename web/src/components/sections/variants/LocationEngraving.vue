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
 * Ubicación en grabado ("grabado"): cada lugar es una lámina de panel oliva con una hacienda
 * dibujada a línea (el adorno "hacienda": la del tema o la compartida, en el color de la
 * tinta), su etiqueta (Ceremonia, Recepción…), el nombre, la hora y la dirección. Abajo, el
 * botón "Ver ubicación" a Maps y, si la sección lo pide, "Agregar al calendario" por lugar.
 * Con "acomodo" lado a lado, las láminas van en columnas (se apilan solas en el celular).
 * La foto del lugar, si la hay, va en un marco de doble filo.
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

// La hacienda: la del tema o la compartida; la invitación la puede cambiar o quitar.
const estate = computed(() =>
  decorOr(props.section.decor, 'estate', resolveAsset.value('hacienda.svg')),
)
const estateStyle = computed(() =>
  estate.value ? { '--engr-estate': `url("${estate.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="engr-loc" :class="{ 'engr-loc--side': section.layout === 'side' }">
    <h2 class="engr-loc__title" data-text="title">
      <TypewriterText
        :text="title"
        :active="section.effects.includes('typewriter')"
        :duration="1000"
      />
    </h2>

    <article v-for="(place, i) in places" :key="i" class="engr-loc__place">
      <div class="engr-loc__plate page-palette">
        <span v-if="estate" class="engr-loc__estate" aria-hidden="true" :style="estateStyle" />
        <p v-if="place.label" class="engr-loc__label" data-text="label">{{ place.label }}</p>
        <h3 class="engr-loc__name" data-text="place">{{ place.name }}</h3>
        <p
          v-if="place.time || place.city || place.address"
          class="engr-loc__detail"
          data-text="detail"
        >
          <span v-if="place.time" class="engr-loc__time">{{ place.time }}</span>
          <span v-if="place.city">{{ place.city }}</span>
          <span v-if="place.address">{{ place.address }}</span>
        </p>
      </div>

      <div v-if="place.maps_url || place.calendarUrl" class="engr-loc__buttons">
        <a
          v-if="place.maps_url"
          :href="place.maps_url"
          class="engr-loc__button inv-btn"
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
          class="engr-loc__button inv-btn"
          data-text="button"
          target="_blank"
          rel="noopener"
          :aria-label="`Agregar al calendario: ${place.name}`"
        >
          <AppIcon name="calendar-plus" /> Agregar al calendario
        </a>
      </div>

      <div v-if="place.photo" class="engr-loc__mount">
        <img
          :src="place.photo"
          :alt="place.name"
          class="engr-loc__photo fx-photo"
          loading="lazy"
          decoding="async"
        />
      </div>
    </article>
  </div>
</template>

<style scoped>
.engr-loc {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 28rem;
  margin: 0 auto;
}
/* Lado a lado: columnas que se apilan solas cuando no caben (celular). */
.engr-loc--side {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  align-items: start;
  max-width: 56rem;
}
.engr-loc--side .engr-loc__title {
  grid-column: 1 / -1;
}
.engr-loc__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
.engr-loc__place {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  width: 100%;
}

/* La lámina: panel oliva (oscuro) con la hacienda a línea arriba y un doble filo de papel. */
.engr-loc__plate {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 1.1rem 1.2rem 1.3rem;
  border-radius: 0.3rem;
  background: var(--color-surface);
  color: var(--color-on-night, var(--color-text));
  text-align: center;
  box-shadow:
    var(--shadow-card),
    inset 0 0 0 0.4rem var(--color-surface),
    inset 0 0 0 calc(0.4rem + 1px) color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.engr-loc__estate {
  width: min(100%, 17rem);
  aspect-ratio: 320 / 170;
  margin-bottom: 0.5rem;
  background: var(--color-primary);
  -webkit-mask: var(--engr-estate) center / contain no-repeat;
  mask: var(--engr-estate) center / contain no-repeat;
  opacity: 0.92;
}
.engr-loc__label {
  margin: 0;
  font-family: var(--t-label-font, var(--font-caps));
  font-size: calc(0.78rem * var(--t-label-size, 1));
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--t-label-color, var(--color-accent));
}
.engr-loc__name {
  margin: 0;
  font-family: var(--t-place-font, var(--font-serif));
  font-weight: 500;
  font-size: calc(clamp(1.3rem, 6.4cqi, 1.7rem) * var(--t-place-size, 1));
  line-height: 1.2;
  color: var(--t-place-color, var(--color-primary-strong));
}
.engr-loc__detail {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-size: calc(0.98rem * var(--t-detail-size, 1));
  line-height: 1.35;
  color: var(
    --t-detail-color,
    color-mix(in srgb, var(--color-on-night, var(--color-text)) 85%, transparent)
  );
}
.engr-loc__time {
  font-family: var(--font-caps);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.engr-loc__buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}
.engr-loc__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border: var(--btn-border, 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent));
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
.engr-loc__button :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
.engr-loc__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

/* La foto, con doble filo de papel (como la lámina). */
.engr-loc__mount {
  width: 100%;
  padding: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  border-radius: 0.3rem;
}
.engr-loc__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 0.15rem;
}
</style>
