<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { motionTime } from '@/services/effectsService'
import type { FlightItem } from '@/themes/types'

/**
 * Mariposas que de vez en cuando cruzan la pantalla aleteando (también en el celular).
 * Cada una vuela una parte de su ciclo y el resto espera fuera de la vista. Solo CSS
 * (transform y opacity); no se pueden tocar y se apagan con "menos movimiento".
 */
const props = defineProps<{ items: FlightItem[] }>()
const { resolveAsset } = useEvent()

const flights = computed(() =>
  props.items
    .map((item, i) => ({ ...item, src: resolveAsset.value(item.file), i }))
    .filter((item) => item.src),
)
</script>

<template>
  <div class="flight" aria-hidden="true">
    <span
      v-for="f in flights"
      :key="f.i"
      class="flight__path"
      :class="`flight__path--${f.direction}`"
      :style="{ animationDuration: motionTime(f.duration), animationDelay: motionTime(f.delay) }"
    >
      <img
        :src="f.src!"
        alt=""
        class="flight__wings"
        :class="{ 'is-flipped': f.flip }"
        :style="{ width: f.size }"
      />
    </span>
  </div>
</template>

<style scoped>
.flight {
  position: fixed;
  inset: 0;
  z-index: 15;
  overflow: hidden;
  pointer-events: none;
}
.flight__path {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  animation: flight-ltr calc(28s * var(--motion-scale)) ease-in-out infinite both;
}
.flight__path--rtl {
  animation-name: flight-rtl;
}
.flight__wings {
  display: block;
  height: auto;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.15));
  animation: flight-flap calc(0.24s * var(--motion-scale)) ease-in-out infinite alternate;
}
.flight__wings.is-flipped {
  scale: -1 1;
}
/* Cruza en el primer 40 % del ciclo, con vaivén; el resto del tiempo espera escondida. */
@keyframes flight-ltr {
  0% {
    opacity: 0;
    transform: translate(-12vw, 74vh) rotate(10deg);
  }
  3% {
    opacity: 1;
  }
  12% {
    transform: translate(16vw, 56vh) rotate(-8deg);
  }
  22% {
    transform: translate(42vw, 64vh) rotate(12deg);
  }
  32% {
    transform: translate(72vw, 38vh) rotate(-6deg);
  }
  39% {
    opacity: 1;
  }
  40%,
  100% {
    opacity: 0;
    transform: translate(112vw, 24vh) rotate(4deg);
  }
}
@keyframes flight-rtl {
  0% {
    opacity: 0;
    transform: translate(108vw, 30vh) rotate(-10deg);
  }
  3% {
    opacity: 1;
  }
  12% {
    transform: translate(80vw, 46vh) rotate(8deg);
  }
  22% {
    transform: translate(54vw, 34vh) rotate(-12deg);
  }
  32% {
    transform: translate(26vw, 58vh) rotate(6deg);
  }
  39% {
    opacity: 1;
  }
  40%,
  100% {
    opacity: 0;
    transform: translate(-14vw, 70vh) rotate(-4deg);
  }
}
@keyframes flight-flap {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0.4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .flight {
    display: none;
  }
}
</style>
