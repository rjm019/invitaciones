<script setup lang="ts">
import { computed } from 'vue'
import Monogram from '@/components/ui/Monogram.vue'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { pad2 } from '@/services/countdownService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cuenta regresiva en banda ("banda"): una franja de lado a lado (el tema le pone su color;
 * en `lacre`, borgoña) con los números en serif fina, separados por filetes de un pelo, sus
 * unidades en versalitas y el monograma muy tenue detrás. Los segundos no saltan: la banda
 * se queda quieta, como impresa.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const units = computed(() => [
  { value: String(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos' },
])
const title = computed(() => props.section.title ?? 'Faltan')
</script>

<template>
  <div class="cb">
    <Monogram class="cb__mark" size="min(15rem, 62cqi)" />
    <h2 class="cb__title" data-text="title">{{ title }}</h2>
    <ul class="cb__units" role="timer" :aria-label="`${units[0].value} días`">
      <li v-for="unit in units" :key="unit.label" class="cb__unit">
        <span class="cb__number" data-text="digits">{{ unit.value }}</span>
        <span class="cb__label" data-text="units">{{ unit.label }}</span>
      </li>
    </ul>
    <p v-if="section.text" class="cb__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.cb {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 1rem;
  max-width: 42rem;
  margin: 0 auto;
  padding-block: var(--space-2);
  text-align: center;
  isolation: isolate;
}
/* El monograma, grande y casi invisible, detrás de los números. */
.cb__mark {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: -1;
  --monogram-color: var(--color-primary);
  opacity: 0.09;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.cb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.8rem * var(--t-title-size, 1));
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-primary));
  margin-right: -0.38em;
}
.cb__units {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cb__unit {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  padding-inline: 0.3rem;
}
.cb__unit + .cb__unit {
  border-left: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
}
.cb__number {
  font-family: var(--t-digits-font, var(--font-display));
  font-size: calc(clamp(2rem, 10.5cqi, 3.4rem) * var(--t-digits-size, 1));
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--t-digits-color, var(--color-primary));
}
.cb__label {
  font-family: var(--t-units-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(0.58rem, 2.5cqi, 0.7rem) * var(--t-units-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-units-color, var(--color-primary-soft));
}
.cb__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.2rem * var(--t-text-size, 1));
  color: var(--t-text-color, var(--color-primary));
}
</style>
