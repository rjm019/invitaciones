<script setup lang="ts">
import { computed } from 'vue'
import { foilConfetti, motionTime } from '@/services/effectsService'

/**
 * Confeti de papel metálico que cae despacio por toda la pantalla (el del tema: en Nueva
 * York, plata; como las mariposas de NAT, pero en lluvia). Cada pedacito cae con vaivén y
 * se voltea; al voltearse destella. Solo CSS (transform y opacity), no se puede tocar y se
 * apaga con "menos movimiento".
 */
const props = withDefaults(defineProps<{ count?: number; seed?: string }>(), {
  count: 16,
  seed: 'confeti',
})

const pieces = computed(() => foilConfetti(props.seed, props.count))
</script>

<template>
  <div class="foil" aria-hidden="true">
    <span
      v-for="(p, i) in pieces"
      :key="i"
      class="foil__fall"
      :style="{
        left: `${p.left}%`,
        '--sway': `${p.sway}px`,
        animationDuration: motionTime(p.duration),
        animationDelay: motionTime(p.delay),
      }"
    >
      <span
        class="foil__piece"
        :class="[`foil__piece--${p.shape}`, `foil__piece--shade-${p.shade}`]"
        :style="{
          width: `${p.width}rem`,
          height: `${p.height}rem`,
          rotate: `${p.tilt}deg`,
          animationDuration: motionTime(p.flip),
        }"
      />
    </span>
  </div>
</template>

<style scoped>
.foil {
  position: fixed;
  inset: 0;
  z-index: 15;
  overflow: hidden;
  pointer-events: none;
}
/* Cae en el 70 % del ciclo, meciéndose; el resto espera arriba, fuera de la vista. */
.foil__fall {
  position: absolute;
  top: 0;
  opacity: 0;
  perspective: 18rem;
  animation: foil-fall calc(14s * var(--motion-scale)) linear infinite both;
}
@keyframes foil-fall {
  0% {
    opacity: 0;
    transform: translate3d(0, -6vh, 0);
  }
  5% {
    opacity: 1;
  }
  24% {
    transform: translate3d(var(--sway), 24vh, 0);
  }
  48% {
    transform: translate3d(calc(var(--sway) * -0.7), 54vh, 0);
  }
  64% {
    opacity: 1;
  }
  70%,
  100% {
    opacity: 0;
    transform: translate3d(calc(var(--sway) * 0.5), 104vh, 0);
  }
}
/* Se voltea sobre sí mismo (3D); el brillo de encima destella cuando queda de frente. */
.foil__piece {
  position: relative;
  display: block;
  border-radius: 1px;
  background: linear-gradient(
    135deg,
    var(--color-primary-soft) 0%,
    var(--color-accent) 46%,
    var(--color-primary-soft) 58%,
    var(--color-primary) 100%
  );
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary-soft) 35%, transparent);
  animation: foil-flip calc(1.6s * var(--motion-scale)) linear infinite;
}
.foil__piece::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #fff;
  opacity: 0;
  /* Al mismo ritmo que la vuelta (la duración va en línea en .foil__piece). */
  animation-name: foil-glint;
  animation-duration: inherit;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.foil__piece--shade-1 {
  background: linear-gradient(
    160deg,
    #fff 0%,
    var(--color-primary) 40%,
    var(--color-primary-strong) 62%,
    var(--color-accent) 100%
  );
}
.foil__piece--shade-2 {
  background: linear-gradient(
    120deg,
    var(--color-accent) 0%,
    var(--color-primary-soft) 50%,
    var(--color-accent-strong) 100%
  );
}
/* Lentejuela: redonda, con su brillo al centro. */
.foil__piece--disc {
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 34%,
    #fff 0 14%,
    var(--color-primary-soft) 34%,
    var(--color-accent) 100%
  );
}
@keyframes foil-flip {
  from {
    transform: rotate3d(1, 0.4, 0.1, 0deg);
  }
  to {
    transform: rotate3d(1, 0.4, 0.1, 360deg);
  }
}
@keyframes foil-glint {
  0%,
  38%,
  62%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.85;
  }
}
@media (prefers-reduced-motion: reduce) {
  .foil {
    display: none;
  }
}
</style>
