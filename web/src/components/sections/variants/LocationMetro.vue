<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useEvent } from '@/composables/useEvent'
import { hourMinute, time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Ubicación de Nueva York ("metro"): cada lugar es un letrero de estación del metro (la
 * franja con su línea blanca arriba, el nombre en mayúsculas y las "líneas" en círculos:
 * la hora y la flecha a Maps). Abajo, la foto del lugar en un marco de mosaico, como los
 * de las estaciones. El botón abre Maps.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Ubicación')
const button = computed(() => props.section.button ?? 'Ver en Maps')
const startTime = computed(() =>
  event.value.starts_at ? time12h(hourMinute(event.value.starts_at, event.value.timezone)) : null,
)

const places = computed(() =>
  event.value.locations.length
    ? event.value.locations.map((l) => ({
        ...l,
        city: '',
        time: l.time ? time12h(l.time) : null,
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
        },
      ],
)
/** "8:00 pm" → "8 PM": cabe en el círculo. */
const bullet = (time: string) => time.replace(':00', '').toUpperCase()
</script>

<template>
  <div class="ny-metro">
    <h2 class="ny-metro__title" data-text="title">
      <TypewriterText
        :text="title"
        :active="section.effects.includes('typewriter')"
        :duration="1000"
      />
    </h2>

    <article v-for="(place, i) in places" :key="i" class="ny-metro__place">
      <div class="ny-metro__sign page-palette">
        <p v-if="place.label" class="ny-metro__label" data-text="label">{{ place.label }}</p>
        <h3 class="ny-metro__name" data-text="place">{{ place.name }}</h3>
        <div class="ny-metro__lines">
          <span v-if="place.time" class="ny-metro__bullet ny-metro__bullet--time">{{
            bullet(place.time)
          }}</span>
          <span class="ny-metro__bullet"><AppIcon name="location-dot" /></span>
          <p v-if="place.city || place.address" class="ny-metro__detail" data-text="detail">
            <span v-if="place.city">{{ place.city }}</span>
            <span v-if="place.address">{{ place.address }}</span>
          </p>
        </div>
      </div>

      <a
        v-if="place.maps_url"
        :href="place.maps_url"
        class="ny-metro__button btn-shine inv-btn"
        data-text="button"
        target="_blank"
        rel="noopener"
        :aria-label="`${button}: ${place.name}`"
      >
        <span aria-hidden="true">↗</span> {{ button }}
      </a>

      <div v-if="place.photo" class="ny-metro__mosaic">
        <div class="ny-metro__frame fx-photo">
          <img
            :src="place.photo"
            :alt="place.name"
            class="ny-metro__photo"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.ny-metro {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 28rem;
  margin: 0 auto;
}
.ny-metro__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  text-align: center;
  color: var(--t-title-color, var(--color-primary));
}
.ny-metro__place {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  width: 100%;
}

/* El letrero de la estación: negro, con la línea blanca arriba y el nombre en mayúsculas. */
.ny-metro__sign {
  position: relative;
  display: grid;
  gap: 0.55rem;
  width: 100%;
  padding: 1.15rem 1.2rem 1rem;
  border-radius: 0.2rem;
  background: var(--color-night);
  color: var(--color-on-night);
  text-align: start;
  box-shadow: var(--shadow-card);
}
.ny-metro__sign::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  left: 1.2rem;
  right: 1.2rem;
  height: 2px;
  background: var(--color-on-night);
  opacity: 0.9;
}
.ny-metro__label {
  margin: 0.25rem 0 -0.2rem;
  font-family: var(--t-label-font, var(--font-caps));
  font-size: calc(0.7rem * var(--t-label-size, 1));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-label-color, color-mix(in srgb, var(--color-on-night) 70%, transparent));
}
.ny-metro__name {
  margin: 0.25rem 0 0;
  font-family: var(--t-place-font, var(--font-caps));
  font-weight: 500;
  font-size: calc(clamp(1.05rem, 5.6cqi, 1.45rem) * var(--t-place-size, 1));
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t-place-color, var(--color-on-night));
}
.ny-metro__lines {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}
/* Las "líneas" del metro: círculos con la hora y el ícono del lugar. */
.ny-metro__bullet {
  display: grid;
  place-items: center;
  min-width: 2.1rem;
  height: 2.1rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--color-primary-soft), var(--color-primary));
  color: var(--color-night);
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
}
.ny-metro__bullet :deep(.app-icon) {
  width: 0.95rem;
  height: 0.95rem;
}
.ny-metro__detail {
  display: grid;
  margin: 0 0 0 0.3rem;
  font-family: var(--t-detail-font, var(--font-serif));
  font-size: calc(0.86rem * var(--t-detail-size, 1));
  line-height: 1.35;
  color: var(--t-detail-color, color-mix(in srgb, var(--color-on-night) 80%, transparent));
}
.ny-metro__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.4rem;
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-on-button, var(--color-text))));
  font-family: var(--t-button-font, var(--font-button));
  font-weight: 600;
  font-size: calc(0.86rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-decoration: var(--btn-decoration, none);
  text-transform: var(--btn-case, uppercase);
  box-shadow: var(--btn-shadow, var(--shadow-button));
  border: var(--btn-border, 0);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.ny-metro__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
/* La foto en un marco de mosaico (cuadritos de dos tonos), como los letreros de las estaciones. */
.ny-metro__mosaic {
  width: 100%;
  padding: 0.55rem;
  background: repeating-conic-gradient(
      var(--color-primary) 0 25%,
      color-mix(in srgb, var(--color-primary) 35%, var(--color-night)) 0 50%
    )
    0 0 / 0.55rem 0.55rem;
  box-shadow: var(--shadow-card);
}
.ny-metro__frame {
  overflow: hidden;
  border: 3px solid var(--color-night);
}
.ny-metro__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
</style>
