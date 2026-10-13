<script setup lang="ts">
import { computed } from 'vue'
import { useCountdown } from '@/composables/useCountdown'
import { useEvent } from '@/composables/useEvent'
import { pad2 } from '@/services/countdownService'
import type { ResolvedSection } from '@/types/event'

const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const left = useCountdown(() => event.value.starts_at)

const units = computed(() => [
  { value: String(left.value.days), label: 'Días' },
  { value: pad2(left.value.hours), label: 'Horas' },
  { value: pad2(left.value.minutes), label: 'Minutos' },
  { value: pad2(left.value.seconds), label: 'Segundos', tick: true },
])
const title = computed(() => props.section.title ?? 'Inicia la cuenta regresiva')
</script>

<template>
  <div class="countdown">
    <img
      v-if="section.decor.butterfly"
      :src="section.decor.butterfly"
      alt=""
      class="countdown__butterfly decor-float"
    />
    <h2 class="countdown__title">{{ title }}</h2>

    <p v-if="left.isOver" class="countdown__today">¡Hoy es el gran día!</p>
    <div v-else class="countdown__timer" role="timer" aria-live="off">
      <template v-for="(unit, i) in units" :key="unit.label">
        <span v-if="i > 0" class="countdown__colon" aria-hidden="true">:</span>
        <div class="countdown__unit" data-cascade>
          <span
            :key="unit.tick ? unit.value : unit.label"
            class="countdown__number"
            :class="{ 'is-tick': unit.tick }"
            >{{ unit.value }}</span
          >
          <span class="countdown__label">{{ unit.label }}</span>
        </div>
      </template>
    </div>

    <div class="countdown__divider" aria-hidden="true">
      <img v-if="section.decor.crown" :src="section.decor.crown" alt="" />
    </div>

    <p v-if="section.text" class="countdown__text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.countdown {
  position: relative;
  text-align: center;
}
.countdown__title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2rem, 10.2cqi, 3.2rem);
  line-height: 1.2;
  color: var(--color-primary);
}
.countdown__butterfly {
  position: absolute;
  top: -1.4rem;
  right: 0.6rem;
  width: 1.8rem;
}
.countdown__timer {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: clamp(0.25rem, 2.2cqi, 0.75rem);
}
.countdown__unit {
  display: grid;
  justify-items: center;
  min-width: 3.4em;
}
.countdown__number,
.countdown__colon {
  font-family: var(--font-serif);
  font-size: clamp(2.6rem, 13cqi, 3.6rem);
  line-height: 1;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
/* Cada segundo nuevo entra con un pequeño latido (la llave cambia y la animación corre). */
.countdown__number.is-tick {
  display: inline-block;
  animation: countdown-tick calc(0.5s * var(--motion-scale)) var(--ease-out);
}
@keyframes countdown-tick {
  from {
    transform: scale(1.18);
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .countdown__number.is-tick {
    animation: none;
  }
}
.countdown__label {
  margin-top: 0.6rem;
  font-family: var(--font-serif);
  font-size: var(--text-small);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.countdown__today {
  font-family: var(--font-script);
  font-size: clamp(2rem, 9.8cqi, 2.8rem);
  color: var(--color-primary);
}
.countdown__divider {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.4rem;
  width: min(100%, 20rem);
  margin: var(--space-3) auto;
}
.countdown__divider::before,
.countdown__divider::after {
  content: '';
  flex: 1;
  height: 2px;
  background: var(--color-primary-soft);
}
.countdown__divider img {
  width: 2.6rem;
}
.countdown__text {
  max-width: 21rem;
  margin: 0 auto;
  font-size: var(--text-body);
  line-height: 1.45;
}
</style>
