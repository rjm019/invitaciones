<script setup lang="ts">
import { computed } from 'vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Frase en bandera de papel picado (`picado`): una bandera grande hecha en CSS (no la
 * máscara chica de los adornos): un rectángulo del rosa de la paleta con una hilera de
 * calados arriba, otra abajo y la orilla festoneada, con la frase al centro en letras crema
 * mayúsculas, como recortadas (p. ej. "AMOR ♥ ETERNO"). Cuelga de un hilo y se mece muy
 * despacio desde arriba (rotate). Con "menos movimiento" queda quieta. Con el efecto
 * "escribir", la frase aparece letra por letra. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const text = computed(() => props.section.text ?? props.section.title ?? '')
const author = computed(() => (props.section.text ? (props.section.title ?? '') : ''))
</script>

<template>
  <figure class="qp">
    <span class="qp__thread" aria-hidden="true" />
    <div class="qp__flag">
      <blockquote class="qp__text" data-text="text">
        <TypewriterText :text="text" :active="section.effects.includes('typewriter')" />
      </blockquote>
      <figcaption v-if="author" class="qp__author" data-text="title">{{ author }}</figcaption>
    </div>
  </figure>
</template>

<style scoped>
.qp {
  /* El rosa un poco más oscuro, para que la letra crema se lea. */
  --qp-paper: color-mix(in srgb, var(--color-rosa, var(--color-accent)) 86%, #3a2420);
  container-type: inline-size;
  display: grid;
  justify-items: center;
  max-width: 24rem;
  margin: 0 auto;
}
/* El hilo: dos tramos que bajan en V hasta las esquinas de la bandera. */
.qp__thread {
  width: 78%;
  height: 2.2rem;
  background:
    linear-gradient(
        to top right,
        transparent calc(50% - 0.7px),
        var(--color-tinta, #3a2420) 50%,
        transparent calc(50% + 0.7px)
      )
      left / 50% 100% no-repeat,
    linear-gradient(
        to top left,
        transparent calc(50% - 0.7px),
        var(--color-tinta, #3a2420) 50%,
        transparent calc(50% + 0.7px)
      )
      right / 50% 100% no-repeat;
  opacity: 0.7;
}
.qp__flag {
  --hole: 0.2rem;
  --step: 1.3rem;
  position: relative;
  width: 100%;
  margin-top: -1px;
  padding: 3.4rem 1.6rem 4.6rem;
  text-align: center;
  background: var(--qp-paper);
  transform-origin: 50% 0;
  animation: qp-sway calc(8s * var(--motion-scale)) ease-in-out infinite alternate;
  /* Calados arriba y abajo, y la orilla festoneada: lo opaco se ve, lo demás es hueco. */
  -webkit-mask:
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left top /
      var(--step) 1.5rem repeat-x,
    linear-gradient(#000, #000) 0 1.5rem / 100% calc(100% - 4.6rem) no-repeat,
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left
      bottom 1.6rem / var(--step) 1.5rem repeat-x,
    radial-gradient(circle at 50% 0, #000 calc(var(--step) / 2 - 1px), transparent calc(var(--step) / 2))
      left bottom / var(--step) 1.6rem repeat-x;
  mask:
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left top /
      var(--step) 1.5rem repeat-x,
    linear-gradient(#000, #000) 0 1.5rem / 100% calc(100% - 4.6rem) no-repeat,
    radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1px)) left
      bottom 1.6rem / var(--step) 1.5rem repeat-x,
    radial-gradient(circle at 50% 0, #000 calc(var(--step) / 2 - 1px), transparent calc(var(--step) / 2))
      left bottom / var(--step) 1.6rem repeat-x;
}
.qp__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.6rem, 9.5cqi, 3.2rem) * var(--t-text-size, 1));
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--t-text-color, var(--color-paper, #f6ecd9));
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.qp__author {
  margin-top: 0.8rem;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.8rem * var(--t-title-size, 1));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-paper, #f6ecd9));
}
/* Escritorio (media fila o más): la bandera crece con su contenedor. */
@container section (min-width: 30rem) {
  .qp {
    max-width: 34rem;
  }
  .qp__flag {
    padding-block: 4.4rem 5.6rem;
  }
  .qp__author {
    font-size: calc(1rem * var(--t-title-size, 1));
  }
}
@keyframes qp-sway {
  from {
    transform: rotate(-1.2deg);
  }
  to {
    transform: rotate(1.2deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .qp__flag {
    animation: none;
  }
}
</style>
