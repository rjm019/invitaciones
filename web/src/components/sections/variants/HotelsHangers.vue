<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Hospedaje de Nueva York ("colgantes"): cada hotel es un colgante de puerta de hotel
 * clásico (con su agujero para la perilla) que se mece apenas, uno de cada lado. Lleva la
 * foto, el nombre, la nota, la dirección y los botones a Maps y para llamar.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Hospedaje')
const button = computed(() => props.section.button ?? 'Ver en Maps')
const hotels = computed(() =>
  event.value.hotels.map((h) => ({
    ...h,
    photo: resolveAsset.value(h.photo),
    tel: h.phone ? `tel:${h.phone.replace(/[^\d+]/g, '')}` : null,
  })),
)
</script>

<template>
  <div class="ny-hangers">
    <h2 class="ny-hangers__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="ny-hangers__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <p v-if="section.text" class="ny-hangers__text" data-text="text">{{ section.text }}</p>

    <div class="ny-hangers__list">
      <article
        v-for="(hotel, i) in hotels"
        :key="hotel.name"
        class="ny-hanger page-palette"
        :class="i % 2 ? 'is-right' : 'is-left'"
      >
        <span class="ny-hanger__hole" aria-hidden="true" />
        <h3 class="ny-hanger__name" data-text="name">{{ hotel.name }}</h3>
        <div v-if="hotel.photo" class="ny-hanger__frame fx-photo">
          <img
            :src="hotel.photo"
            :alt="hotel.name"
            class="ny-hanger__photo"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p v-if="hotel.note" class="ny-hanger__note" data-text="note">{{ hotel.note }}</p>
        <p v-if="hotel.address" class="ny-hanger__address" data-text="address">
          {{ hotel.address }}
        </p>
        <div v-if="hotel.maps_url || hotel.tel" class="ny-hanger__actions">
          <a
            v-if="hotel.maps_url"
            :href="hotel.maps_url"
            class="ny-hanger__button btn-shine inv-btn"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${hotel.name}`"
          >
            {{ button }}
          </a>
          <a
            v-if="hotel.tel"
            :href="hotel.tel"
            class="ny-hanger__call"
            data-text="button"
            :aria-label="`Llamar a ${hotel.name}`"
          >
            <AppIcon name="phone" />
          </a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.ny-hangers {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.ny-hangers__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-hangers__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.86rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.ny-hangers__text {
  max-width: 22rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  color: var(--t-text-color, var(--color-text));
}
.ny-hangers__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr));
  gap: var(--space-3) var(--space-2);
  width: 100%;
  max-width: 34rem;
  padding-top: 0.6rem;
}

/*
 * El colgante: alto, con el agujero redondo arriba y la ranura hasta la orilla para
 * meterlo en la perilla. Se mece desde el agujero, cada uno a destiempo.
 */
.ny-hanger {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  width: min(100%, 17rem);
  margin: 0 auto;
  padding: 4.4rem 1.2rem 1.4rem;
  border-radius: 0.9rem 0.9rem 0.4rem 0.4rem;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-primary) 14%, var(--color-night)) 0%,
    var(--color-night) 100%
  );
  color: var(--color-on-night);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 55%, transparent),
    inset 0 0 0 0.45rem color-mix(in srgb, var(--color-night) 100%, transparent),
    inset 0 0 0 calc(0.45rem + 1px) color-mix(in srgb, var(--color-primary) 30%, transparent),
    0 1rem 1.8rem rgb(0 0 0 / 0.45);
  transform-origin: 50% 1.6rem;
  animation: ny-hang calc(6s * var(--motion-scale)) ease-in-out infinite;
}
.ny-hanger.is-right {
  animation-delay: calc(-3s * var(--motion-scale));
}
@keyframes ny-hang {
  0%,
  100% {
    transform: rotate(-1.4deg);
  }
  50% {
    transform: rotate(1.4deg);
  }
}
.ny-hanger__hole {
  position: absolute;
  top: 0.9rem;
  left: 50%;
  width: 2.3rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: var(--color-bg);
  box-shadow:
    inset 0 0.15rem 0.35rem rgb(0 0 0 / 0.6),
    0 0 0 1px var(--color-primary);
}
/* La ranura: de la orilla al agujero. */
.ny-hanger__hole::before {
  content: '';
  position: absolute;
  bottom: 60%;
  left: 50%;
  width: 0.38rem;
  height: 1.4rem;
  translate: -50% 0;
  background: var(--color-bg);
}
.ny-hanger__name {
  margin: 0;
  font-family: var(--t-name-font, var(--font-caps));
  font-weight: 500;
  font-size: calc(clamp(0.95rem, 4.6cqi, 1.1rem) * var(--t-name-size, 1));
  line-height: 1.25;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-name-color, var(--color-on-night));
}
.ny-hanger__frame {
  width: 100%;
  overflow: hidden;
  border-radius: 0.35rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent);
}
.ny-hanger__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.ny-hanger__note {
  margin: 0;
  font-family: var(--t-note-font, var(--font-display));
  font-style: italic;
  font-size: calc(1rem * var(--t-note-size, 1));
  color: var(--t-note-color, var(--color-primary-soft));
}
.ny-hanger__address {
  margin: 0;
  font-family: var(--t-address-font, var(--font-serif));
  font-size: calc(0.82rem * var(--t-address-size, 1));
  line-height: 1.4;
  color: var(--t-address-color, color-mix(in srgb, var(--color-on-night) 80%, transparent));
}
.ny-hanger__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
}
.ny-hanger__button {
  padding: 0.5rem 1.15rem;
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-on-button, var(--color-text))));
  font-family: var(--t-button-font, var(--font-button));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.14em);
  text-decoration: var(--btn-decoration, none);
  text-transform: var(--btn-case, uppercase);
  box-shadow: var(--btn-shadow, var(--shadow-button));
  border: var(--btn-border, 0);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.ny-hanger__call {
  display: grid;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid var(--color-primary);
  border-radius: 50%;
  color: var(--color-primary-soft);
}
.ny-hanger__call :deep(.app-icon) {
  width: 0.95rem;
  height: 0.95rem;
}
:is(.ny-hanger__button, .ny-hanger__call):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .ny-hanger {
    animation: none;
  }
}
</style>
