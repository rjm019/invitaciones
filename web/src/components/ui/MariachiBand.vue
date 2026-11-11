<script setup lang="ts">
// El trío va en línea (no como imagen) para poder mover cada pieza: cabeza, pie, brazo, fuelle.
import mariachisSvg from '@/themes/_shared/assets/mariachis.svg?raw'

/**
 * Trío de mariachis (guitarra, acordeón y guitarrón) en acuarela. Con `playing` tocan: cada
 * músico se mece y marca el compás con la cabeza y el pie (desfasados entre sí), la guitarra
 * rasguea, el acordeón abre y cierra el fuelle y el guitarrón se pulsa; las notas salen de la
 * boca de cada instrumento, suben en arco y se desvanecen. Sin `playing` queda quieto. Con
 * "menos movimiento" no hay nada que se mueva. Solo transform y opacity; las animaciones se
 * pausan solas cuando la sección está lejos de la pantalla (`.is-idle`). Mide el ancho de su
 * contenedor (`md`) o 9.6 rem (`sm`, unos 7 rem de alto); sirve en cualquier tema.
 */
withDefaults(defineProps<{ playing: boolean; size?: 'sm' | 'md' }>(), { size: 'md' })

const GLYPHS = ['♪', '♫', '♬']
// De dónde sale cada nota (% del dibujo: boca de la guitarra, fuelle del acordeón y boca del
// guitarrón) y hacia dónde se va de lado (cqi) en cada una de sus tres notas.
const EMITTERS = [
  { x: 19.5, y: 62, dx: [-12, -5, 3] },
  { x: 50, y: 54, dx: [-8, 2, 9] },
  { x: 81.5, y: 71, dx: [6, 12, 17] },
]
const notes = EMITTERS.flatMap((e, i) =>
  e.dx.map((dx, j) => ({
    key: `${i}-${j}`,
    x: e.x,
    y: e.y,
    dx,
    dy: 38 + ((i + j) % 3) * 7,
    delay: i * 0.45 + j * 1.05,
    glyph: GLYPHS[(i + j) % GLYPHS.length],
    tone: (i + 2 * j) % 4,
  })),
)
</script>

<template>
  <div class="mb" :class="[`mb--${size}`, { 'is-playing': playing }]" aria-hidden="true">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="mb__art" v-html="mariachisSvg" />
    <span
      v-for="n in notes"
      :key="n.key"
      class="mb__note"
      :class="`mb__note--${n.tone}`"
      :style="{ left: `${n.x}%`, top: `${n.y}%`, '--dx': n.dx, '--dy': n.dy, '--nd': n.delay }"
      >{{ n.glyph }}</span
    >
  </div>
</template>

<style scoped>
.mb {
  position: relative;
  container-type: inline-size;
  display: block;
}
.mb--sm {
  width: 9.6rem;
}
.mb--md {
  width: 100%;
}
.mb__art :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Cada pieza gira o se estira desde su propio punto de apoyo. */
.mb__art :deep(.musico),
.mb__art :deep(.cabeza),
.mb__art :deep(.pie),
.mb__art :deep(.brazo),
.mb__art :deep(.fuelle),
.mb__art :deep(.caja),
.mb__art :deep(.instrumento) {
  transform-box: fill-box;
}
.mb__art :deep(.musico),
.mb__art :deep(.cabeza) {
  transform-origin: 50% 100%;
}
.mb__art :deep(.pie) {
  transform-origin: 100% 100%;
}
.mb__art :deep(.musico-1 .brazo) {
  transform-origin: 20% 0%;
}
.mb__art :deep(.musico-3 .brazo) {
  transform-origin: 40% 0%;
}
.mb__art :deep(.fuelle),
.mb__art :deep(.caja),
.mb__art :deep(.instrumento) {
  transform-origin: 50% 50%;
}

/* Tocando: cada músico va a su propio compás (desfasados). */
.is-playing .mb__art :deep(.musico) {
  animation: mb-sway calc(2.4s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.cabeza) {
  animation: mb-nod calc(0.6s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.pie) {
  animation: mb-tap calc(1.2s * var(--motion-scale)) ease-in-out infinite;
}
.is-playing .mb__art :deep(.musico-1 .brazo) {
  animation: mb-strum calc(0.2s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.musico-3 .brazo) {
  animation: mb-pluck calc(0.5s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.musico-1 .instrumento),
.is-playing .mb__art :deep(.musico-3 .instrumento) {
  animation: mb-bob calc(0.6s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.fuelle) {
  animation: mb-bellows calc(1.1s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.caja-i) {
  animation: mb-box-left calc(1.1s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.caja-d) {
  animation: mb-box-right calc(1.1s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mb__art :deep(.musico-2),
.is-playing .mb__art :deep(.musico-2 .cabeza),
.is-playing .mb__art :deep(.musico-2 .pie) {
  animation-delay: calc(-0.8s * var(--motion-scale));
}
.is-playing .mb__art :deep(.musico-3),
.is-playing .mb__art :deep(.musico-3 .cabeza),
.is-playing .mb__art :deep(.musico-3 .pie) {
  animation-delay: calc(-1.6s * var(--motion-scale));
}

/* Las notas salen de la boca de cada instrumento, suben en arco y se desvanecen. */
.mb__note {
  position: absolute;
  font-size: clamp(0.9rem, 8cqi, 1.9rem);
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  text-shadow: 0 1px 1px rgb(0 0 0 / 0.35);
}
.mb__note--0 {
  color: var(--color-amarillo, var(--color-accent, currentColor));
}
.mb__note--1 {
  color: var(--color-paper, #fbf3e2);
}
.mb__note--2 {
  color: var(--color-turquesa, var(--color-accent, currentColor));
}
.mb__note--3 {
  color: var(--color-cempasuchil, var(--color-accent, currentColor));
}
.is-playing .mb__note {
  animation: mb-note calc(3.2s * var(--motion-scale)) ease-out infinite;
  animation-delay: calc(var(--nd) * -1s * var(--motion-scale));
}

@keyframes mb-sway {
  from {
    transform: rotate(-2deg);
  }
  to {
    transform: rotate(2deg);
  }
}
@keyframes mb-nod {
  from {
    transform: rotate(-3deg) translateY(0);
  }
  to {
    transform: rotate(3deg) translateY(1.5px);
  }
}
@keyframes mb-tap {
  0%,
  50%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-9deg);
  }
}
@keyframes mb-strum {
  from {
    transform: rotate(-7deg);
  }
  to {
    transform: rotate(7deg);
  }
}
@keyframes mb-pluck {
  from {
    transform: rotate(-3deg);
  }
  to {
    transform: rotate(6deg);
  }
}
@keyframes mb-bob {
  from {
    transform: rotate(-1deg);
  }
  to {
    transform: rotate(1deg);
  }
}
@keyframes mb-bellows {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0.7);
  }
}
@keyframes mb-box-left {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(6.5px);
  }
}
@keyframes mb-box-right {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-6.5px);
  }
}
@keyframes mb-note {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.6) rotate(-10deg);
  }
  12% {
    opacity: 1;
  }
  50% {
    transform: translate(calc(var(--dx) * 0.75cqi), calc(var(--dy) * -0.5cqi)) scale(1)
      rotate(8deg);
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--dx) * 1cqi), calc(var(--dy) * -1cqi)) scale(1.1)
      rotate(-6deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-playing .mb__art :deep(*),
  .is-playing .mb__note {
    animation: none;
  }
  .mb__note {
    display: none;
  }
}
</style>
