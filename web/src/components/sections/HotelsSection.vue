<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Hospedaje: los hoteles recomendados de la pestaña "hoteles", cada uno en una tarjeta de
 * papel con su nota ("A unos pasos del salón"), dirección y botones a Maps y para llamar.
 * La foto es opcional (columna "foto"). Efectos: con "cascada" las tarjetas entran una tras
 * otra, "brillo" pasa por los botones, "flotar" mueve el ícono y "acercamiento", las fotos.
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
const cardStyle = computed(() =>
  props.section.decor.card ? { backgroundImage: `url("${props.section.decor.card}")` } : {},
)
</script>

<template>
  <div class="hotels">
    <h2 class="hotels__title">{{ title }}</h2>
    <AppIcon name="bed" class="hotels__icon decor-float" />
    <p v-if="section.subtitle" class="hotels__subtitle">{{ section.subtitle }}</p>
    <p v-if="section.text" class="hotels__text">{{ section.text }}</p>

    <div class="hotels__list">
      <article v-for="hotel in hotels" :key="hotel.name" class="hotels__card" :style="cardStyle">
        <div v-if="hotel.photo" class="hotels__frame fx-photo">
          <img
            :src="hotel.photo"
            :alt="hotel.name"
            class="hotels__photo"
            loading="lazy"
            decoding="async"
          />
        </div>
        <h3 class="hotels__name">{{ hotel.name }}</h3>
        <img
          v-if="section.decor.divider"
          :src="section.decor.divider"
          alt=""
          class="hotels__divider"
        />
        <p v-if="hotel.note" class="hotels__note">{{ hotel.note }}</p>
        <p v-if="hotel.address" class="hotels__address">{{ hotel.address }}</p>
        <div v-if="hotel.maps_url || hotel.tel" class="hotels__actions">
          <a
            v-if="hotel.maps_url"
            :href="hotel.maps_url"
            class="hotels__button btn-shine"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${hotel.name}`"
          >
            {{ button }}
          </a>
          <a
            v-if="hotel.tel"
            :href="hotel.tel"
            class="hotels__call"
            :aria-label="`Llamar a ${hotel.name}`"
          >
            <AppIcon name="phone" />
            Llamar
          </a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.hotels {
  display: grid;
  /* La columna no crece con su contenido: siempre del ancho del panel. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 0.4rem;
  margin: 0 auto;
  text-align: center;
}
.hotels__title {
  margin: 0;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2.2rem, 11.5cqi, 3.2rem);
  line-height: 1.1;
  color: var(--color-primary);
}
.hotels__icon {
  font-size: 0.9rem;
  color: var(--color-primary-strong);
}
.hotels__subtitle {
  margin: 0.3rem 0 0;
  font-family: var(--font-caps);
  font-size: clamp(0.95rem, 4.6cqi, 1.15rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}
.hotels__text {
  max-width: 24rem;
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.4;
}
/* Celular: una columna. Si la sección es de toda la fila en escritorio, van lado a lado. */
.hotels__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: var(--space-2);
  width: 100%;
  max-width: 28rem;
  margin-top: var(--space-2);
}
@container (min-width: 44rem) {
  .hotels__list {
    max-width: none;
  }
}
.hotels__card {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.5rem;
  padding: var(--space-3) var(--space-2);
  background: var(--color-surface) center / cover no-repeat;
  box-shadow: var(--shadow-card);
}
/* Filo dorado por dentro, como el de los paneles. */
.hotels__card::after {
  content: '';
  position: absolute;
  inset: 0.35rem;
  border: var(--panel-border, 1px solid var(--color-primary-soft));
  pointer-events: none;
}
.hotels__frame {
  width: 100%;
  overflow: hidden;
  margin-bottom: 0.3rem;
}
.hotels__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.hotels__name {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 400;
  font-size: clamp(1.1rem, 5.6cqi, 1.4rem);
  letter-spacing: 0.06em;
  line-height: 1.3;
  text-transform: uppercase;
  color: var(--color-text);
}
.hotels__divider {
  width: 55%;
  max-width: 10rem;
}
.hotels__note {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(1rem, 5cqi, 1.2rem);
  color: var(--color-primary);
}
.hotels__address {
  max-width: 20rem;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.35;
  opacity: 0.85;
}
.hotels__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}
/* Los dos botones del mismo alto. */
.hotels__button,
.hotels__call {
  min-height: 2.3rem;
}
.hotels__button {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 1.1rem;
  border-radius: 6px;
  background: var(--button-gradient);
  color: var(--color-text);
  font-family: var(--font-button);
  font-weight: 600;
  font-size: clamp(0.85rem, 4cqi, 1rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  box-shadow: var(--shadow-button, none);
}
.hotels__call {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 999px;
  color: var(--color-primary);
  font-family: var(--font-serif);
  font-size: 1rem;
  text-decoration: none;
}
.hotels__call :deep(.app-icon--svg) {
  width: 0.85em;
  height: 0.85em;
}
.hotels__button:focus-visible,
.hotels__call:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
