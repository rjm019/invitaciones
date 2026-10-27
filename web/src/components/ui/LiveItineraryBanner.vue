<script setup lang="ts">
import { computed } from 'vue'
import { time12h } from '@/services/dateFormatService'
import type { LiveState } from '@/services/liveItineraryService'

/**
 * "Ahora: Vals" con un pulso suave de opacity y "Sigue: Cena · 10:00 pm". Solo se pinta el
 * día del evento (el estado lo calcula liveItineraryService). Respeta prefers-reduced-motion.
 */
const props = defineProps<{
  state: LiveState | null
  moments: { time: string; label: string }[]
}>()

const now = computed(() =>
  props.state?.status === 'live' && props.state.current !== null
    ? (props.moments[props.state.current] ?? null)
    : null,
)
const next = computed(() =>
  props.state && props.state.next !== null ? (props.moments[props.state.next] ?? null) : null,
)
</script>

<template>
  <div v-if="now || next" class="live-banner" role="status" aria-live="polite">
    <p v-if="now" class="live-banner__now">
      <span class="live-banner__dot" aria-hidden="true" />
      Ahora: <strong>{{ now.label }}</strong>
    </p>
    <p v-if="next" class="live-banner__next">
      Sigue: {{ next.label }} · {{ time12h(next.time) }}
    </p>
  </div>
</template>

<style scoped>
.live-banner {
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  margin: 0 0 var(--space-2);
  font-family: var(--t-activity-font, var(--font-caps));
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  color: var(--color-text);
}
.live-banner p {
  margin: 0;
}
.live-banner__now {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-primary-strong, var(--color-primary));
  animation: live-pulse calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.live-banner__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: currentColor;
}
.live-banner__next {
  opacity: 0.75;
  font-size: 0.85rem;
}
@keyframes live-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .live-banner__now {
    animation: none;
  }
}
</style>
