<script setup lang="ts">
import { computed } from 'vue'
import LivingLandmark from '@/components/ui/LivingLandmark.vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { hourMinute, time12h } from '@/services/dateFormatService'
import { placeCalendarUrl } from '@/services/locationService'
import type { ResolvedSection } from '@/types/event'

/**
 * Ubicación de papelería ("papeleria"): cada lugar es una tarjetita de papel, como las que
 * van dentro del sobre: la etiqueta en versalitas (Ceremonia, Recepción), un dibujo de línea
 * (la iglesia para una ceremonia religiosa y la hacienda para lo demás; ranuras `iglesia` y
 * `hacienda`, pintadas con máscara en la tinta), el nombre, la hora, la dirección y los
 * botones finos "Ver ubicación" y, con `calendario`, "Agregar al calendario". Con
 * `acomodo` lado a lado van en dos columnas (se apilan solas si no caben). Con el efecto
 * `dibujo_vivo`, los dibujos de siempre (no uno subido a la ranura) se dibujan trazo a trazo
 * al entrar y cobran vida (LivingLandmark: campanas, árboles, aves, ventanas encendidas).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Ubicación')
const button = computed(() => props.section.button ?? 'Ver ubicación')

const church = computed(() =>
  decorOr(props.section.decor, 'church', resolveAsset.value('iglesia.svg')),
)
const estate = computed(() =>
  decorOr(props.section.decor, 'estate', resolveAsset.value('hacienda.svg')),
)
const defaultChurch = computed(() => resolveAsset.value('iglesia.svg'))
const defaultEstate = computed(() => resolveAsset.value('hacienda.svg'))
const living = computed(() => props.section.effects.includes('living-drawing'))
const maskUrl = (url: string | null) => (url ? `url("${url.replace(/"/g, '%22')}")` : null)

const places = computed(() => {
  const source = props.section.places ?? event.value.locations
  const list = source.length
    ? source.map((l) => ({
        label: l.label,
        name: l.name,
        time: l.time ? time12h(l.time) : null,
        address: l.address,
        maps_url: l.maps_url,
        kind: l.kind,
        calendarUrl: props.section.calendar ? placeCalendarUrl(l, event.value.title) : null,
      }))
    : [
        {
          label: '',
          name: event.value.venue.display_name || event.value.venue.name,
          time: event.value.starts_at
            ? time12h(hourMinute(event.value.starts_at, event.value.timezone))
            : null,
          address: [event.value.venue.address, event.value.venue.city].filter(Boolean).join(', '),
          maps_url: event.value.venue.maps_url,
          kind: undefined as string | undefined,
          calendarUrl: null as string | null,
        },
      ]
  return list.map((p) => {
    const religious = p.kind === 'religious'
    const url = religious ? church.value : estate.value
    // Vivo solo si el dibujo es el de siempre: uno subido a la ranura se pinta quieto.
    const alive =
      living.value && !!url && url === (religious ? defaultChurch.value : defaultEstate.value)
    return {
      ...p,
      drawing: maskUrl(url),
      landmark: alive ? (religious ? ('church' as const) : ('estate' as const)) : null,
    }
  })
})
</script>

<template>
  <div class="ls" :class="{ 'ls--side': section.layout === 'side' && places.length > 1 }">
    <h2 class="ls__title" data-text="title">{{ title }}</h2>

    <div class="ls__cards">
      <article v-for="(place, i) in places" :key="i" class="ls__card">
        <p v-if="place.label" class="ls__label" data-text="label">{{ place.label }}</p>
        <span v-if="place.landmark" class="ls__drawing ls__drawing--alive">
          <LivingLandmark :kind="place.landmark" />
        </span>
        <span
          v-else-if="place.drawing"
          class="ls__drawing"
          aria-hidden="true"
          :style="{ '--ls-drawing': place.drawing }"
        />
        <h3 class="ls__name" data-text="place">{{ place.name }}</h3>
        <p v-if="place.time" class="ls__time" data-text="detail">{{ place.time }}</p>
        <p v-if="place.address" class="ls__address" data-text="detail">{{ place.address }}</p>
        <div v-if="place.maps_url || place.calendarUrl" class="ls__buttons">
          <a
            v-if="place.maps_url"
            :href="place.maps_url"
            class="ls__button inv-btn"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${place.name}`"
          >
            {{ button }}
          </a>
          <a
            v-if="place.calendarUrl"
            :href="place.calendarUrl"
            class="ls__link"
            target="_blank"
            rel="noopener"
            :aria-label="`Agregar al calendario: ${place.name}`"
          >
            Agregar al calendario
          </a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.ls {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  max-width: 40rem;
  margin: 0 auto;
}
.ls__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.5rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-primary));
  margin-right: -0.16em;
}
.ls__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
  width: 100%;
}
.ls--side .ls__cards {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12.5rem), 1fr));
}
/* La tarjetita: papel marfil de algodón, recta, con una sombra corta de papel sobre la mesa. */
.ls__card {
  /* la tinta de la página: la tarjetita es clara aunque el panel sea oscuro */
  --ink: var(--root-text, #3b342e);
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.45rem;
  padding: 1.5rem 1.1rem 1.4rem;
  text-align: center;
  color: var(--ink);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.12),
    0 10px 18px -10px rgb(0 0 0 / 0.45);
}
.ls__label {
  margin: 0;
  font-family: var(--t-label-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.72rem * var(--t-label-size, 1));
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--t-label-color, var(--ink));
  margin-right: -0.32em;
}
.ls__drawing {
  width: min(100%, 9.5rem);
  aspect-ratio: 320 / 170;
  margin: 0.2rem 0;
  background: var(--ink);
  -webkit-mask: var(--ls-drawing) center / contain no-repeat;
  mask: var(--ls-drawing) center / contain no-repeat;
  opacity: 0.85;
}
/* El dibujo vivo es SVG en línea: sin máscara ni fondo, la tinta es su color. */
.ls__drawing--alive {
  display: block;
  background: none;
  color: var(--ink);
  -webkit-mask: none;
  mask: none;
}
.ls__name {
  margin: 0;
  font-family: var(--t-place-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.86rem * var(--t-place-size, 1));
  letter-spacing: 0.16em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--t-place-color, var(--ink));
}
.ls__time {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: calc(0.86rem * var(--t-detail-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-detail-color, var(--ink));
}
.ls__address {
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1rem * var(--t-detail-size, 1));
  line-height: 1.35;
  color: var(--t-detail-color, color-mix(in srgb, var(--ink) 80%, transparent));
}
.ls__buttons {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  margin-top: 0.5rem;
}
.ls__button {
  display: inline-block;
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
.ls__link {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--ink) 45%, transparent);
}
/*
 * Lado a lado pero sin espacio para dos columnas (el celular): cada tarjetita se acuesta,
 * con el dibujo a la izquierda y los datos a la derecha. Ocupa la mitad de alto.
 */
@container (max-width: 26rem) {
  .ls--side .ls__card {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    justify-items: start;
    column-gap: 0.9rem;
    row-gap: 0.3rem;
    padding: 1.05rem 0.95rem 1rem;
    text-align: start;
  }
  .ls--side .ls__card > * {
    grid-column: 2;
  }
  .ls--side .ls__drawing {
    grid-column: 1;
    grid-row: 1 / span 6;
    align-self: center;
    width: 100%;
    margin: 0;
  }
  .ls--side .ls__label {
    margin-right: 0;
  }
  .ls--side .ls__buttons {
    justify-items: start;
    margin-top: 0.3rem;
  }
}
.ls__button:focus-visible,
.ls__link:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
</style>
