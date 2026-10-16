<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Un dígito de tablero de llegadas (como el de Grand Central): la paleta muestra el número
 * nuevo y, cuando cambia, la mitad de arriba con el número anterior cae girando y lo
 * descubre. Solo transform; con "menos movimiento" cambia sin girar (lo apaga la CSS).
 */
const props = defineProps<{ value: string }>()

const previous = ref(props.value)
const flips = ref(0)
watch(
  () => props.value,
  (_, old) => {
    previous.value = old
    flips.value++
  },
)
</script>

<template>
  <span class="flap" aria-hidden="true">
    <span class="flap__half flap__half--top"
      ><span class="flap__glyph">{{ value }}</span></span
    >
    <span class="flap__half flap__half--bottom"
      ><span class="flap__glyph">{{ value }}</span></span
    >
    <span v-if="flips" :key="flips" class="flap__half flap__half--top flap__leaf">
      <span class="flap__glyph">{{ previous }}</span>
    </span>
  </span>
</template>

<style scoped>
.flap {
  position: relative;
  display: inline-block;
  width: 1em;
  height: 1.38em;
  perspective: 3.5em;
  border-radius: 0.09em;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-night) 82%, var(--color-primary)) 0%,
    var(--color-night) 100%
  );
  box-shadow:
    0 0.06em 0.12em rgb(0 0 0 / 0.45),
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-on-night);
}
.flap__half {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
  border-radius: inherit;
  background: inherit;
  backface-visibility: hidden;
}
.flap__half--top {
  top: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.flap__half--bottom {
  bottom: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
/* La ranura del medio, donde se doblan las paletas. */
.flap::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  translate: 0 -50%;
  background: color-mix(in srgb, var(--color-night) 70%, #000);
  z-index: 2;
}
.flap__glyph {
  position: absolute;
  left: 0;
  right: 0;
  height: 200%;
  display: grid;
  place-items: center;
  line-height: 1;
}
.flap__half--top .flap__glyph {
  top: 0;
}
.flap__half--bottom .flap__glyph {
  bottom: 0;
}
.flap__leaf {
  z-index: 1;
  transform-origin: 50% 100%;
  animation: flap-fall calc(0.42s * var(--motion-scale)) ease-in forwards;
}
@keyframes flap-fall {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(-90deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .flap__leaf {
    display: none;
  }
}
</style>
