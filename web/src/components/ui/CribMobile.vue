<script setup lang="ts">
import { useId } from 'vue'

/**
 * Móvil de cuna en acuarela: un aro colgado de un hilo y, de él, a distintas alturas, una luna
 * dormida, dos estrellas, una nube y un globo. Cada forma lleva dos lavados, borde de pigmento,
 * luces en blanco y sombras frías; el grano y el borde irregular vienen de un filtro estático
 * (se anima el transform de los grupos que lo contienen, nunca el filtro). Con `playing` todo el
 * móvil gira despacio de lado a lado como un péndulo de torsión (simulado con `scaleX`: el
 * conjunto se cierra y se abre y cada pieza se contra-escala para no deformarse, así solo
 * cambia su posición) y cada pieza se balancea desde su hilo con su propia fase. Solo transform
 * y opacity; con "menos movimiento" queda quieto. Color: `--bow-color` (globo; respaldo
 * `--color-primary`, con `--bow-color-dark` y `--bow-color-soft`), `--color-oro` (luna, estrellas
 * y aro) y `--color-paper` (nube). Mide el ancho de su contenedor o `size` (CSS). El `slot` se
 * pone encima (centrado, o donde indique `--cm-slot-top`, en %): la música lo usa para su botón.
 * Sirve en cualquier tema.
 */
withDefaults(defineProps<{ playing?: boolean; size?: string }>(), {
  playing: false,
  size: undefined,
})

const fid = `cm-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const RING = { cx: 150, cy: 74, rx: 104, ry: 11 }
// Cada pieza cuelga del aro en x; el punto de apoyo (0,0) queda sobre el borde de adelante.
const hang = (x: number) =>
  RING.cy + RING.ry * Math.sqrt(Math.max(0, 1 - ((x - RING.cx) / RING.rx) ** 2))
const pieces = [
  { key: 'moon', x: 62, len: 96, dur: 4.6, delay: -0.4, tilt: 4.5 },
  { key: 'star', x: 106, len: 150, dur: 3.8, delay: -1.9, tilt: 5.5 },
  { key: 'cloud', x: 150, len: 104, dur: 5.2, delay: -3.1, tilt: 3.2 },
  { key: 'star2', x: 194, len: 166, dur: 4.2, delay: -0.9, tilt: 5 },
  { key: 'balloon', x: 238, len: 118, dur: 3.5, delay: -2.4, tilt: 4.2 },
].map((p) => ({
  ...p,
  y: Math.round(hang(p.x) * 10) / 10,
  style: { '--dur': `${p.dur}s`, '--delay': `${p.delay}s`, '--tilt': `${p.tilt}deg` },
}))

const STAR =
  'M0 -22C3.6 -22 5 -16 7 -10C11 -7.6 20 -9 22 -4.6C23.6 -1 18 3 14.6 6.4C15.6 11 19 19 15.4 21.4C11.6 23.8 5 18.6 0 15.6C-5 18.6 -11.6 23.8 -15.4 21.4C-19 19 -15.6 11 -14.6 6.4C-18 3 -23.6 -1 -22 -4.6C-20 -9 -11 -7.6 -7 -10C-5 -16 -3.6 -22 0 -22Z'
const CLOUD =
  'M-40 22C-56 22 -58 2 -44 -2C-46 -16 -28 -22 -20 -12C-14 -28 12 -28 16 -10C28 -16 44 -6 38 8C54 8 52 22 38 22Z'
const BALLOON = 'M0 0C18 0 28 14 27 28C26 46 12 60 0 64C-12 60 -26 46 -27 28C-28 14 -18 0 0 0Z'
</script>

<template>
  <div class="cm" :class="{ 'is-playing': playing }" :style="size ? { width: size } : undefined" :aria-hidden="$slots.default ? undefined : 'true'">
    <svg class="cm__art" viewBox="0 0 300 330" focusable="false" aria-hidden="true">
      <defs>
        <filter :id="fid" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
      </defs>

      <!-- gancho y hilo fijos al techo -->
      <g :filter="`url(#${fid})`">
        <circle class="gold-dot" cx="150" cy="7" r="5" />
        <circle class="hook-hole" cx="150" cy="7" r="1.8" />
      </g>

      <!-- todo lo que cuelga gira como péndulo de torsión -->
      <g class="cm__twist-wrap">
        <g class="cm__twist">
          <g :filter="`url(#${fid})`">
            <path class="thread" d="M150 12L47 76M150 12L253 76M150 12L150 85" />
            <!-- aro: parte de atrás, piezas, parte de adelante -->
            <path class="ring ring--back" :d="`M${RING.cx - RING.rx} ${RING.cy}A${RING.rx} ${RING.ry} 0 0 1 ${RING.cx + RING.rx} ${RING.cy}`" />
          </g>

          <g v-for="p in pieces" :key="p.key" :transform="`translate(${p.x} ${p.y})`">
            <g class="cm__untwist">
              <g class="cm__swing" :style="p.style">
                <path class="thread" :d="`M0 0L0 ${p.len}`" />
                <!-- luna dormida -->
                <g v-if="p.key === 'moon'" :transform="`translate(0 ${p.len})`" :filter="`url(#${fid})`">
                  <path class="gold-wash" d="M0 -4C-24 -4 -38 16 -34 38C-30 60 -8 72 12 66C-6 62 -14 46 -12 30C-10 14 -2 2 14 -3C8 -4 4 -4 0 -4Z" />
                  <path class="gold-wash gold-wash--2" transform="translate(2.2 1.6)" d="M0 -4C-24 -4 -38 16 -34 38C-30 60 -8 72 12 66C-6 62 -14 46 -12 30C-10 14 -2 2 14 -3C8 -4 4 -4 0 -4Z" />
                  <path class="shade" d="M-34 38C-30 60 -8 72 12 66C-2 66 -18 58 -26 44C-30 40 -32 40 -34 38Z" />
                  <path class="gold-edge" d="M0 -4C-24 -4 -38 16 -34 38C-30 60 -8 72 12 66C-6 62 -14 46 -12 30C-10 14 -2 2 14 -3C8 -4 4 -4 0 -4Z" />
                  <path class="gloss" d="M-28 14C-24 6 -16 1 -8 -1" />
                  <path class="lash-line" d="M-27 40C-24 44 -19 44 -16 41M-26.6 44.4L-28 47M-23 46L-23.6 49M-19.4 45L-19.4 48" />
                  <ellipse class="cheek" cx="-20" cy="51" rx="4.6" ry="3" />
                  <circle class="gold-dot gold-dot--small" cx="14" cy="-3" r="1.1" />
                </g>
                <!-- estrellas -->
                <g v-else-if="p.key === 'star' || p.key === 'star2'" :transform="`translate(0 ${p.len + 22}) scale(${p.key === 'star' ? 1 : 0.8}) rotate(${p.key === 'star' ? -8 : 10})`" :filter="`url(#${fid})`">
                  <path class="gold-wash" :d="STAR" />
                  <path class="gold-wash gold-wash--2" transform="translate(1.8 1.6)" :d="STAR" />
                  <path class="shade" d="M-14.6 6.4C-15.6 11 -19 19 -15.4 21.4C-11.6 23.8 -5 18.6 0 15.6C5 18.6 11.6 23.8 15.4 21.4C14 17 6 14 0 12C-6 14 -12 16 -14.6 6.4Z" />
                  <path class="gold-edge" :d="STAR" />
                  <path class="gloss" d="M-4 -14L-2 -8M-13 -3L-8 -3" />
                  <circle class="cheek-dot" cx="-5" cy="2" r="1.3" />
                  <circle class="cheek-dot" cx="5" cy="2" r="1.3" />
                </g>
                <!-- nube -->
                <g v-else-if="p.key === 'cloud'" :transform="`translate(0 ${p.len + 22})`" :filter="`url(#${fid})`">
                  <path class="cloud" :d="CLOUD" />
                  <path class="cloud-2" transform="translate(2 2)" :d="CLOUD" />
                  <path class="shade" d="M-54 10C-52 20 -46 22 -38 22L38 22C52 22 54 12 44 9C26 20 -30 24 -54 10Z" />
                  <path class="cloud-edge" :d="CLOUD" />
                  <path class="gloss" d="M-36 -6C-30 -12 -22 -14 -16 -12" />
                  <path class="lash-line" d="M-14 6C-11 9 -7 9 -4 6M6 6C9 9 13 9 16 6" />
                  <ellipse class="cheek" cx="-18" cy="11" rx="4" ry="2.6" />
                  <ellipse class="cheek" cx="20" cy="11" rx="4" ry="2.6" />
                </g>
                <!-- globo -->
                <g v-else :transform="`translate(0 ${p.len})`" :filter="`url(#${fid})`">
                  <path class="balloon" :d="BALLOON" />
                  <path class="balloon balloon--2" transform="translate(2.4 2)" :d="BALLOON" />
                  <path class="shade" d="M27 28C26 46 12 60 0 64C-12 60 -26 46 -27 28C-14 46 12 48 27 28Z" />
                  <path class="balloon-edge" :d="BALLOON" />
                  <path class="gloss" d="M-17 14C-16 7 -11 3 -5 3" />
                  <path class="balloon-knot" d="M-4 68L0 63L4 68Z" />
                </g>
              </g>
            </g>
          </g>

          <g :filter="`url(#${fid})`">
            <path class="ring ring--front" :d="`M${RING.cx - RING.rx} ${RING.cy}A${RING.rx} ${RING.ry} 0 0 0 ${RING.cx + RING.rx} ${RING.cy}`" />
            <path class="ring-hi" :d="`M${RING.cx - RING.rx + 14} ${RING.cy + 6}A${RING.rx - 14} ${RING.ry - 2} 0 0 0 ${RING.cx + RING.rx - 40} ${RING.cy + 9}`" />
          </g>
        </g>
      </g>
    </svg>
    <div v-if="$slots.default" class="cm__slot"><slot /></div>
  </div>
</template>

<style scoped>
.cm {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_oro: var(--color-oro, #b8925a);
  --_oro-lite: color-mix(in srgb, var(--_oro) 40%, #fff6dc);
  --_gold-wash: color-mix(in srgb, var(--_oro) 34%, #f8e3a2);
  --_paper: var(--color-paper, #fdf8f0);
  --_cool: color-mix(in srgb, var(--_bow-dark) 35%, #6f7ba6);
  position: relative;
  display: block;
  width: 100%;
}
.cm__art {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
/* El botón de la variante (la luna del reproductor) va encima. */
.cm__slot {
  position: absolute;
  left: 50%;
  top: var(--cm-slot-top, 62%);
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
}

.thread {
  fill: none;
  stroke: color-mix(in srgb, var(--_oro) 50%, #8a7a70);
  stroke-opacity: 0.7;
  stroke-width: 1.1;
  stroke-linecap: round;
}
.ring {
  fill: none;
  stroke: var(--_oro);
  stroke-width: 4.2;
  stroke-linecap: round;
}
.ring--back {
  stroke-opacity: 0.55;
}
.ring-hi {
  fill: none;
  stroke: var(--_oro-lite);
  stroke-opacity: 0.85;
  stroke-width: 1.3;
  stroke-linecap: round;
}
.gold-dot {
  fill: var(--_oro-lite);
  stroke: var(--_oro);
  stroke-width: 1.3;
}
.gold-dot--small {
  stroke-width: 0.6;
}
.hook-hole {
  fill: var(--_cool);
  opacity: 0.4;
}

/* Pintura: dos lavados, sombra fría, borde de pigmento y luces en blanco. */
.gold-wash {
  fill: var(--_gold-wash);
  opacity: 0.8;
}
.gold-wash--2 {
  fill: var(--_oro);
  opacity: 0.26;
}
.gold-edge {
  fill: none;
  stroke: var(--_oro);
  stroke-opacity: 0.6;
  stroke-width: 1.1;
  stroke-linejoin: round;
}
.shade {
  fill: var(--_cool);
  opacity: 0.22;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.8;
  stroke-width: 2.8;
  stroke-linecap: round;
}
.lash-line {
  fill: none;
  stroke: color-mix(in srgb, var(--_oro) 55%, #5a4230);
  stroke-width: 1.3;
  stroke-linecap: round;
}
.cheek {
  fill: var(--_bow);
  opacity: 0.45;
}
.cheek-dot {
  fill: var(--_bow);
  opacity: 0.55;
}
.cloud {
  fill: var(--_paper);
}
.cloud-2 {
  fill: color-mix(in srgb, var(--_paper) 55%, #cfd8ea);
  opacity: 0.55;
}
.cloud-edge {
  fill: none;
  stroke: var(--_cool);
  stroke-opacity: 0.4;
  stroke-width: 1.1;
  stroke-linejoin: round;
}
.balloon {
  fill: var(--_bow);
  opacity: 0.6;
}
.balloon--2 {
  opacity: 0.32;
}
.balloon-edge {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.42;
  stroke-width: 1.1;
  stroke-linejoin: round;
}
.balloon-knot {
  fill: var(--_bow-dark);
  opacity: 0.6;
}

/* Péndulo de torsión sin 3D: el conjunto se cierra y se abre (scaleX) y cada pieza se
   contra-escala al revés, con los mismos tiempos, para no deformarse: solo cambia su lugar. */
.cm__twist-wrap,
.cm__twist,
.cm__untwist,
.cm__swing {
  transform-box: view-box;
}
.cm__twist-wrap {
  transform-origin: 150px 10px;
}
.cm__twist {
  transform-origin: 150px 0;
}
.cm__untwist,
.cm__swing {
  transform-origin: 0 0;
}
.is-playing .cm__twist-wrap {
  animation: cm-drift calc(6.4s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-playing .cm__twist {
  animation: cm-twist calc(3.2s * var(--motion-scale, 1)) linear infinite alternate;
}
.is-playing .cm__untwist {
  animation: cm-untwist calc(3.2s * var(--motion-scale, 1)) linear infinite alternate;
}
.is-playing .cm__swing {
  animation: cm-swing calc(var(--dur, 4s) * var(--motion-scale, 1)) ease-in-out infinite alternate;
  animation-delay: calc(var(--delay, 0s) * var(--motion-scale, 1));
}

/* scaleX muestreado con un seno (de 1 a .7) para que el contra-escalado cancele casi exacto. */
@keyframes cm-twist {
  0% {
    transform: scaleX(1);
  }
  12.5% {
    transform: scaleX(0.9886);
  }
  25% {
    transform: scaleX(0.9561);
  }
  37.5% {
    transform: scaleX(0.9074);
  }
  50% {
    transform: scaleX(0.85);
  }
  62.5% {
    transform: scaleX(0.7926);
  }
  75% {
    transform: scaleX(0.7439);
  }
  87.5% {
    transform: scaleX(0.7114);
  }
  100% {
    transform: scaleX(0.7);
  }
}
@keyframes cm-untwist {
  0% {
    transform: scaleX(1);
  }
  12.5% {
    transform: scaleX(1.0116);
  }
  25% {
    transform: scaleX(1.0459);
  }
  37.5% {
    transform: scaleX(1.1021);
  }
  50% {
    transform: scaleX(1.1765);
  }
  62.5% {
    transform: scaleX(1.2617);
  }
  75% {
    transform: scaleX(1.3442);
  }
  87.5% {
    transform: scaleX(1.4057);
  }
  100% {
    transform: scaleX(1.4286);
  }
}
@keyframes cm-drift {
  from {
    transform: rotate(-1.8deg);
  }
  to {
    transform: rotate(1.8deg);
  }
}
@keyframes cm-swing {
  from {
    transform: rotate(calc(var(--tilt, 4deg) * -1));
  }
  to {
    transform: rotate(var(--tilt, 4deg));
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-playing .cm__twist-wrap,
  .is-playing .cm__twist,
  .is-playing .cm__untwist,
  .is-playing .cm__swing {
    animation: none;
  }
}
</style>
