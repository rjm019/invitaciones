<script setup lang="ts">
import { computed } from 'vue'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { pad2 } from '@/services/countdownService'
import type { ResolvedSection } from '@/types/event'
import FlapDigit from './FlapDigit.vue'

/**
 * Cuenta regresiva de Nueva York ("tablero"): días, horas, minutos y segundos en las
 * paletas de un tablero de llegadas, como el de Grand Central. Cada dígito cae al cambiar.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const units = computed(() => [
  { value: pad2(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos' },
])
const title = computed(() => props.section.title ?? 'Inicia la cuenta regresiva')
const spoken = computed(
  () =>
    `Faltan ${left.value.days} días, ${left.value.hours} horas, ${left.value.minutes} minutos y ${left.value.seconds} segundos`,
)
</script>

<template>
  <div class="ny-board">
    <h2 class="ny-board__title" data-text="title">{{ title }}</h2>

    <p v-if="left.isOver" class="ny-board__today">¡Hoy es el gran día!</p>
    <div v-else class="ny-board__panel" role="timer" aria-live="off" :aria-label="spoken">
      <div v-for="unit in units" :key="unit.label" class="ny-board__unit" data-cascade>
        <span class="ny-board__digits" data-text="digits">
          <FlapDigit
            v-for="(digit, i) in unit.value.split('')"
            :key="`${unit.label}-${unit.value.length - i}`"
            :value="digit"
          />
        </span>
        <span class="ny-board__label" data-text="units">{{ unit.label }}</span>
      </div>
    </div>

    <div class="ny-board__rule" aria-hidden="true">
      <img v-if="section.decor.crown" :src="section.decor.crown" alt="" />
    </div>
    <p v-if="section.text" class="ny-board__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.ny-board {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.ny-board__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.3rem, 12cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-board__today {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.6rem;
}
/* El tablero: cuatro grupos de paletas con su letrero abajo. */
.ny-board__panel {
  display: flex;
  justify-content: center;
  gap: clamp(0.5rem, 3cqi, 1rem);
  padding: 0.85rem clamp(0.6rem, 3cqi, 1.1rem) 0.75rem;
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--color-night) 70%, var(--color-bg));
  box-shadow:
    var(--shadow-card),
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent);
}
.ny-board__unit {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
}
.ny-board__digits {
  display: flex;
  gap: 0.12em;
  font-family: var(--t-digits-font, var(--font-caps));
  font-weight: 500;
  font-size: calc(clamp(1.7rem, 9.5cqi, 2.6rem) * var(--t-digits-size, 1));
  color: var(--t-digits-color, var(--color-on-night));
}
.ny-board__label {
  font-family: var(--t-units-font, var(--font-caps));
  font-size: calc(clamp(0.55rem, 2.6cqi, 0.7rem) * var(--t-units-size, 1));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-units-color, color-mix(in srgb, var(--color-on-night) 70%, transparent));
}
.ny-board__rule {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: min(100%, 18rem);
}
.ny-board__rule::before,
.ny-board__rule::after {
  content: '';
  flex: 1;
  height: 1px;
  background: color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.ny-board__rule img {
  width: 2rem;
  height: auto;
}
.ny-board__text {
  max-width: 22rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
</style>
