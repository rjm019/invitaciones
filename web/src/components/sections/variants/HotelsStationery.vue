<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { romanYear } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Hospedaje de papelería ("papeleria"): cada hotel es una ficha de papel, como la tarjeta
 * de un hotel antiguo: una llave de línea, su número en romanos, el nombre en mayúsculas
 * espaciadas, la nota en itálica y, entre filetes, la dirección. Abajo, siempre que el hotel
 * tenga teléfono, "Llamar" (tel:) y "Ver mapa"; "Reservar" solo si hay enlace de reserva.
 * No enseña tarifas ni distancias (cambian y no dependen de la invitación). Las fichas se
 * reparten a lo ancho; la foto, si la hay, va arriba con un margen de papel.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Hospedaje')
const button = computed(() => props.section.button ?? 'Reservar')
const hotels = computed(() =>
  event.value.hotels.map((h, i) => ({
    ...h,
    number: romanYear(String(i + 1)),
    photo: h.photo ? resolveAsset.value(h.photo) : null,
    tel: h.phone ? `tel:${h.phone.replace(/[^\d+]/g, '')}` : null,
  })),
)
</script>

<template>
  <div class="hs">
    <h2 class="hs__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="hs__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <p v-if="section.text" class="hs__text" data-text="text">{{ section.text }}</p>

    <div class="hs__cards">
      <article v-for="hotel in hotels" :key="hotel.name" class="hs__card">
        <img
          v-if="hotel.photo"
          :src="hotel.photo"
          :alt="hotel.name"
          class="hs__photo fx-photo"
          loading="lazy"
          decoding="async"
        />
        <p class="hs__number" aria-hidden="true">
          <svg class="hs__key" viewBox="0 0 64 24" aria-hidden="true" focusable="false">
            <circle cx="9" cy="12" r="6.5" />
            <circle cx="9" cy="12" r="2.6" />
            <path d="M15.5 12H44M36 12v5M40 12v4" />
            <path d="M44 7.5h15l3 4.5-3 4.5H44Z" />
          </svg>
          N.º {{ hotel.number }}
        </p>
        <h3 class="hs__name" data-text="name">{{ hotel.name }}</h3>
        <p v-if="hotel.note" class="hs__note" data-text="note">{{ hotel.note }}</p>
        <p v-if="hotel.address" class="hs__address" data-text="address">{{ hotel.address }}</p>
        <div v-if="hotel.tel || hotel.maps_url || hotel.booking_url" class="hs__actions">
          <a
            v-if="hotel.tel"
            :href="hotel.tel"
            class="hs__button inv-btn"
            :aria-label="`Llamar a ${hotel.name}: ${hotel.phone}`"
          >
            <svg class="hs__phone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.6 3.5h3l1.5 4.2-2 1.4a12 12 0 0 0 5.8 5.8l1.4-2 4.2 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
              />
            </svg>
            Llamar
          </a>
          <a
            v-if="hotel.maps_url"
            :href="hotel.maps_url"
            class="hs__button hs__button--quiet inv-btn"
            target="_blank"
            rel="noopener"
            :aria-label="`Ver mapa: ${hotel.name}`"
          >
            Ver mapa
          </a>
          <a
            v-if="hotel.booking_url"
            :href="hotel.booking_url"
            class="hs__map"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${hotel.name}`"
          >
            {{ button }}
          </a>
        </div>
        <p v-if="hotel.phone" class="hs__tel" aria-hidden="true">{{ hotel.phone }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.hs {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 74rem;
  margin: 0 auto;
  text-align: center;
}
.hs__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.5rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-primary));
  margin-right: -0.16em;
}
.hs__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-accent));
}
.hs__text {
  max-width: 52ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-primary));
}
.hs__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--space-2) clamp(1rem, 2.4cqi, 1.75rem);
  width: 100%;
  margin-top: var(--space-1);
}
/* La ficha: papel marfil, tinta de la página (la ficha es clara aunque el panel sea oscuro). */
.hs__card {
  --ink: var(--root-text, #3b342e);
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.4rem;
  padding: 1.5rem 1.3rem 1.3rem;
  color: var(--ink);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.12),
    0 12px 20px -12px rgb(0 0 0 / 0.5);
  outline: 1px solid color-mix(in srgb, var(--color-borgona, var(--ink)) 45%, transparent);
  outline-offset: -0.45rem;
}
.hs__photo {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  margin-bottom: 0.4rem;
}
.hs__number {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.68rem;
  letter-spacing: 0.3em;
  color: var(--color-borgona, var(--ink));
}
.hs__name {
  margin: 0;
  font-family: var(--t-name-font, var(--font-display));
  font-weight: 400;
  font-size: calc(1.3rem * var(--t-name-size, 1));
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--t-name-color, var(--ink));
}
.hs__note {
  margin: 0;
  font-family: var(--t-note-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.02rem * var(--t-note-size, 1));
  color: var(--t-note-color, color-mix(in srgb, var(--ink) 80%, transparent));
}
.hs__key {
  width: 2.4rem;
  height: auto;
  fill: none;
  stroke: var(--color-oro, currentColor);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hs__address {
  width: 100%;
  margin: 0.35rem 0 0;
  padding: 0.6rem 0 0;
  border-top: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
  font-family: var(--t-address-font, var(--font-serif));
  font-size: calc(1rem * var(--t-address-size, 1));
  line-height: 1.35;
  color: var(--t-address-color, var(--ink));
}
.hs__tel {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--ink) 62%, transparent);
}
.hs__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.6rem 1.1rem;
  margin-top: 0.5rem;
}
.hs__button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1rem;
  border: var(--btn-border, 1px solid currentColor);
  border-radius: var(--btn-radius, 2px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.68rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.22em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--ink));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.hs__button--quiet {
  border-color: color-mix(in srgb, var(--ink) 40%, transparent);
}
.hs__phone {
  width: 0.9rem;
  height: 0.9rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.hs__map {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--ink) 45%, transparent);
}
.hs__button:focus-visible,
.hs__map:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
</style>
