<script setup lang="ts">
import { useCelebration } from '@/composables/useCelebration'
import { motionTime } from '@/services/effectsService'

/**
 * Pétalos y confeti con los colores del tema: salen del centro, suben y caen girando.
 * Solo transform y opacity; no se puede tocar (no estorba los botones).
 */
const celebration = useCelebration()
const COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-primary-soft)',
  'var(--color-accent-soft)',
]
</script>

<template>
  <div v-if="celebration?.bursts.value.length" class="burst" aria-hidden="true">
    <template v-for="burst in celebration.bursts.value" :key="burst.id">
      <span
        v-for="(p, i) in burst.pieces"
        :key="`${burst.id}-${i}`"
        class="burst__piece"
        :class="`burst__piece--${p.shape}`"
        :style="{
          left: `${p.x}%`,
          width: `${p.size}rem`,
          background: COLORS[p.color % COLORS.length],
          animationDelay: motionTime(p.delay),
          animationDuration: motionTime(p.duration),
          '--dx': `${p.dx}px`,
          '--rise': `${p.rise}px`,
          '--fall': `${p.fall}px`,
          '--spin': `${p.rotate}deg`,
        }"
      />
    </template>
  </div>
</template>

<style scoped>
.burst {
  position: fixed;
  inset: 0;
  z-index: 30;
  overflow: hidden;
  pointer-events: none;
}
.burst__piece {
  position: absolute;
  top: 42%;
  aspect-ratio: 1;
  opacity: 0;
  animation: burst-fly calc(3s * var(--motion-scale)) cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
}
.burst__piece--strip {
  aspect-ratio: 0.45;
  border-radius: 2px;
}
.burst__piece--dot {
  border-radius: 50%;
  scale: 0.7;
}
.burst__piece--petal {
  aspect-ratio: 0.75;
  border-radius: 80% 0 80% 0;
}
@keyframes burst-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.4);
  }
  8% {
    opacity: 1;
  }
  30% {
    transform: translate(calc(var(--dx) * 0.55), var(--rise)) rotate(calc(var(--spin) * 0.35))
      scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), calc(var(--rise) + var(--fall))) rotate(var(--spin)) scale(0.9);
  }
}
@media (prefers-reduced-motion: reduce) {
  .burst {
    display: none;
  }
}
</style>
