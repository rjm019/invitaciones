<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Bendición y familia de Nueva York ("programa"): como el programa de mano de un estreno
 * de Broadway. Arriba, la franja del programa con la frase de la invitación; luego el
 * mensaje y el "reparto": quiénes son en letra manuscrita, una línea de puntos y sus
 * nombres en mayúsculas espaciadas.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const subtitle = computed(() => props.section.subtitle ?? event.value.subtitle)
</script>

<template>
  <div class="ny-bill">
    <p v-if="subtitle" class="ny-bill__band" data-text="subtitle">{{ subtitle }}</p>
    <div class="ny-bill__page">
      <p v-if="section.text" class="ny-bill__text" data-text="text">{{ section.text }}</p>
      <img
        v-if="section.decor.divider"
        :src="section.decor.divider"
        alt=""
        class="ny-bill__divider"
      />

      <dl v-if="event.family.length" class="ny-bill__cast">
        <div v-for="group in event.family" :key="group.role" class="ny-bill__group">
          <dt class="ny-bill__role" data-text="role">{{ group.role }}</dt>
          <dd class="ny-bill__dots" aria-hidden="true" />
          <dd v-for="person in group.names" :key="person" class="ny-bill__name" data-text="names">
            {{ person }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.ny-bill {
  container-type: inline-size;
  position: relative;
  width: 100%;
  max-width: 24rem;
  margin: 0 auto;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}
/* Doble filo, como el marco impreso del programa. */
.ny-bill::before,
.ny-bill::after {
  content: '';
  position: absolute;
  pointer-events: none;
}
.ny-bill::before {
  inset: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.ny-bill::after {
  inset: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
}
/* La franja del programa (en un Playbill es amarilla; aquí, de la tinta del tema). */
.ny-bill__band {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0.85rem 1rem 0.8rem;
  background: var(--color-primary-strong);
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 500;
  font-size: calc(clamp(0.8rem, 4cqi, 0.95rem) * var(--t-subtitle-size, 1));
  letter-spacing: 0.42em;
  text-align: center;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-bg));
}
.ny-bill__page {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: 1.6rem 1.6rem 1.9rem;
  text-align: center;
}
.ny-bill__text {
  max-width: 19rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(clamp(1rem, 4.6cqi, 1.12rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
.ny-bill__divider {
  width: 58%;
  max-width: 12rem;
  height: auto;
  opacity: 0.85;
}

/* El reparto: quiénes son (manuscrita), una línea de puntos y los nombres en mayúsculas. */
.ny-bill__cast {
  display: grid;
  gap: 1.4rem;
  width: 100%;
  margin: 0;
}
.ny-bill__group {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
}
.ny-bill__role {
  font-family: var(--t-role-font, var(--font-script));
  font-size: calc(clamp(1.9rem, 10cqi, 2.4rem) * var(--t-role-size, 1));
  line-height: 1.05;
  color: var(--t-role-color, var(--color-primary));
}
.ny-bill__dots {
  width: 78%;
  height: 3px;
  margin: 0.15rem 0 0.35rem;
  background: radial-gradient(circle, var(--color-primary) 0 1.1px, transparent 1.4px) 0 50% / 7px
    3px repeat-x;
  opacity: 0.7;
}
.ny-bill__name {
  margin: 0;
  font-family: var(--t-names-font, var(--font-caps));
  font-size: calc(clamp(0.86rem, 4.2cqi, 1rem) * var(--t-names-size, 1));
  line-height: 1.5;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-names-color, var(--color-text));
}
</style>
