<script setup lang="ts">
import { computed } from 'vue'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { pad2 } from '@/services/countdownService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cuenta regresiva en un corazón de encaje ("corazon"): la carpeta de encaje (la ranura
 * "encaje", o la compartida) recortada en forma de corazón, con el interior del color de la
 * paleta y los cuatro números adentro, en dos filas. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const units = computed(() => [
  { value: String(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos', tick: true },
])
const title = computed(() => props.section.title ?? 'Inicia la cuenta regresiva')
const lace = computed(() => decorOr(props.section.decor, 'lace', resolveAsset.value('encaje.svg')))
const heartStyle = computed(() => (lace.value ? { '--lace': `url("${lace.value}")` } : undefined))
</script>

<template>
  <div class="heart">
    <h2 class="heart__title" data-text="title">{{ title }}</h2>

    <p v-if="left.isOver" class="heart__today">¡Hoy es el gran día!</p>
    <div v-else class="heart__shape" :style="heartStyle" role="timer" aria-live="off">
      <span class="heart__lace" aria-hidden="true" />
      <span class="heart__inner" aria-hidden="true" />
      <div class="heart__grid">
        <div v-for="unit in units" :key="unit.label" class="heart__unit" data-cascade>
          <span
            :key="unit.tick ? unit.value : unit.label"
            class="heart__number"
            data-text="digits"
            :class="{ 'is-tick': unit.tick }"
            >{{ unit.value }}</span
          >
          <span class="heart__label" data-text="units">{{ unit.label }}</span>
        </div>
      </div>
    </div>

    <p v-if="section.text" class="heart__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.heart {
  --heart: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 44'%3E%3Cpath d='M24 41C9 31 3 23 3 14.5 3 8 8 3 14 3c4.4 0 7.8 2.6 10 6.3C26.2 5.6 29.6 3 34 3c6 0 11 5 11 11.5C45 23 39 31 24 41Z'/%3E%3C/svg%3E");
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.heart__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 3rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.heart__shape {
  position: relative;
  width: min(100cqi, 22rem);
  aspect-ratio: 48 / 44;
  filter: drop-shadow(0 8px 12px rgb(0 0 0 / 0.35));
}
/* El encaje, recortado en corazón; el interior, un corazón un poco más chico. */
.heart__lace,
.heart__inner {
  position: absolute;
  -webkit-mask: var(--heart) center / 100% 100% no-repeat;
  mask: var(--heart) center / 100% 100% no-repeat;
}
.heart__lace {
  inset: 0;
  background: var(--lace, none) center / 150% auto,
    var(--color-primary-soft);
  background-color: var(--color-paper, var(--color-primary-soft));
}
.heart__inner {
  inset: 11% 11% 14%;
  background: var(--color-surface);
}
.heart__grid {
  position: absolute;
  inset: 17% 22% 30%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: center;
  gap: 0.1rem 0.4rem;
}
.heart__unit {
  display: grid;
  justify-items: center;
}
.heart__number {
  font-family: var(--t-digits-font, var(--font-display));
  font-size: calc(clamp(1.4rem, 10cqi, 2.4rem) * var(--t-digits-size, 1));
  line-height: 1;
  color: var(--t-digits-color, var(--color-primary));
  font-variant-numeric: tabular-nums;
}
.heart__number.is-tick {
  animation: heart-tick calc(1s * var(--motion-scale)) ease-out;
}
.heart__label {
  font-family: var(--t-units-font, var(--font-caps));
  font-size: calc(0.62rem * var(--t-units-size, 1));
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t-units-color, var(--color-primary));
}
.heart__today,
.heart__text {
  max-width: 26rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
@keyframes heart-tick {
  from {
    opacity: 0.4;
    transform: translateY(-0.25em);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .heart__number.is-tick {
    animation: none;
  }
}
</style>
