<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useEvent } from '@/composables/useEvent'
import { time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Ubicación: el salón del evento o, si el layout trae la pestaña "ubicaciones", cada lugar
 * (misa, recepción…). El botón abre Maps. ("Agregar a mi calendario" vive en la fecha.)
 * Con el efecto "escribir", el título aparece letra por letra, como la frase.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Ubicación')
const button = computed(() => props.section.button ?? 'Ver en Maps')

const places = computed(() =>
  event.value.locations.length
    ? event.value.locations.map((l) => ({ ...l, time: l.time ? time12h(l.time) : null }))
    : [
        {
          label: '',
          name: event.value.venue.display_name || event.value.venue.name,
          time: null,
          address: event.value.venue.address,
          maps_url: event.value.venue.maps_url,
          photo: event.value.venue.photo,
        },
      ],
)
</script>

<template>
  <div class="location">
    <h2 class="location__title" data-text="title">
      <TypewriterText
        :text="title"
        :active="section.effects.includes('typewriter')"
        :duration="1000"
      />
    </h2>
    <AppIcon name="location-dot" class="location__pin" />

    <article v-for="(place, i) in places" :key="i" class="location__place">
      <p v-if="place.label" class="location__label" data-text="label">{{ place.label }}</p>
      <h3 class="location__name" data-text="place">{{ place.name }}</h3>
      <p v-if="place.time || place.address" class="location__detail" data-text="detail">
        <span v-if="place.time">{{ place.time }}</span>
        <span v-if="place.address">{{ place.address }}</span>
      </p>
      <a
        v-if="place.maps_url"
        :href="place.maps_url"
        class="location__button btn-shine inv-btn"
        data-text="button"
        target="_blank"
        rel="noopener"
        :aria-label="`${button}: ${place.name}`"
      >
        {{ button }}
      </a>
      <div v-if="place.photo" class="location__frame fx-photo">
        <img
          :src="place.photo"
          :alt="place.name"
          class="location__photo"
          loading="lazy"
          decoding="async"
        />
      </div>
    </article>
  </div>
</template>

<style scoped>
.location {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}
.location__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.location__pin {
  font-size: 0.6rem;
  color: var(--color-primary-strong);
}
.location__place {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  width: 100%;
  margin-top: 0.4rem;
}
.location__place + .location__place {
  margin-top: var(--space-4);
}
.location__label {
  margin: 0;
  font-family: var(--t-label-font, var(--font-script-mono));
  font-size: calc(clamp(1.4rem, 8cqi, 2rem) * var(--t-label-size, 1));
  color: var(--t-label-color, var(--color-primary));
}
.location__name {
  margin: 0;
  max-width: 18em;
  font-family: var(--t-place-font, var(--font-caps));
  font-weight: 400;
  font-size: calc(clamp(1.2rem, 6.4cqi, 1.6rem) * var(--t-place-size, 1));
  letter-spacing: 0.06em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--t-place-color, var(--color-text));
}
.location__detail {
  display: grid;
  margin: 0;
  font-size: calc(var(--text-body) * var(--t-detail-size, 1));
  font-family: var(--t-detail-font);
  color: var(--t-detail-color);
}
.location__button {
  display: inline-block;
  padding: 0.3rem 1.1rem;
  border-radius: var(--btn-radius, 6px);
  background: var(--btn-bg, var(--button-gradient));
  /* Letra sobre el botón: la del tema (--color-on-button) o la del texto. */
  color: var(--t-button-color, var(--btn-color, var(--color-on-button, var(--color-text))));
  font-family: var(--t-button-font, var(--font-button));
  font-weight: 600;
  font-size: calc(clamp(0.85rem, 4cqi, 1rem) * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.04em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, underline);
  text-underline-offset: 0.15em;
  box-shadow: var(--btn-shadow, var(--shadow-button, none));
  border: var(--btn-border, 0);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.location__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.location__frame {
  width: 100%;
  margin-top: var(--space-2);
}
.location__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
</style>
