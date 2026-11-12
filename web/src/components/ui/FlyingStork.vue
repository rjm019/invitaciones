<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Cigüeña blanca en vuelo, de perfil y en acuarela (mira a la derecha; `flip` la voltea): cuello
 * estirado al frente, alas grandes con las puntas negras, pico largo y patas largas hacia atrás
 * en naranja rojizo, y colgando del pico un bultito de tela (un pañal anudado, del color del
 * listón y con un moñito) que se mece como péndulo. Con `flying` aletea: cada ala es un grupo
 * que sube y baja (rotate y scaleY) desde el hombro, la lejana a destiempo, el cuerpo sube y baja
 * a contratiempo y el bultito se balancea. Sin `flying` queda con las alas en alto, quieta. Cada
 * forma lleva dos lavados, borde de pigmento y luces en blanco; el grano viene de un filtro
 * estático (se anima el transform de los grupos, nunca el filtro). Solo transform, opacity y
 * rotate/scale; con "menos movimiento" no se anima nada. Color del bultito: `--bow-color`
 * (respaldo `--color-primary`, con `--bow-color-dark` y `--bow-color-soft`) y `--color-paper`;
 * pico y patas llevan su naranja rojizo fijo (son del animal). Mide el ancho de su contenedor o
 * `size` (CSS). Sirve en cualquier tema.
 */
const props = withDefaults(defineProps<{ flying?: boolean; flip?: boolean; size?: string }>(), {
  flying: false,
  flip: false,
  size: undefined,
})

const fid = `fs-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const wingClip = `${fid}-wing`
const rootStyle = computed(() => (props.size ? { width: props.size } : undefined))

// Ala (con el hombro en 246,116): borde de ataque arriba y plumas en el borde de salida.
const WING =
  'M250 114C228 72 170 30 92 16C98 34 110 48 126 60C120 66 122 76 134 84C132 94 142 102 156 106C158 116 172 122 186 124C206 130 228 130 252 122Z'
// Puntas negras: una franja con el borde de adentro en dientes (los "dedos" de las plumas).
const WING_TIPS = 'M92 14L110 42L134 50L130 66L152 74L148 92L170 98L174 114L196 122L130 134L56 70Z'
const WING_FEATHERS = 'M150 70C178 74 206 92 234 118M134 52C166 52 196 70 218 100M112 36C140 38 172 52 190 80'
const WING_RIB = 'M246 114C214 84 170 54 110 28'
</script>

<template>
  <div class="fs" :class="{ 'is-flying': flying, 'fs--flip': flip }" :style="rootStyle" aria-hidden="true">
    <svg viewBox="0 0 440 270" focusable="false">
      <defs>
        <filter :id="fid" filterUnits="userSpaceOnUse" x="-20" y="-20" width="500" height="320">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="14" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="6" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <clipPath :id="wingClip">
          <path :d="WING" />
        </clipPath>
      </defs>

      <g class="fs__art">
        <g class="fs__bob">
          <!-- ala lejana: más tenue, a destiempo -->
          <g class="fs__wing fs__wing--far">
            <g transform="translate(14 -6) scale(0.94)" :filter="`url(#${fid})`">
              <path class="white white--far" :d="WING" />
              <g :clip-path="`url(#${wingClip})`">
                <path class="tips tips--far" :d="WING_TIPS" />
              </g>
              <path class="edge" :d="WING" />
            </g>
          </g>

          <!-- patas largas hacia atrás -->
          <g :filter="`url(#${fid})`">
            <path class="leg" d="M156 150C116 160 72 166 22 170" />
            <path class="leg" d="M166 152C126 168 84 178 34 186" />
            <path class="toe" d="M22 170L8 166M22 170L10 176M22 170L12 171M34 186L20 182M34 186L22 192M34 186L24 187" />
          </g>

          <!-- cuerpo, cola y cuello -->
          <g :filter="`url(#${fid})`">
            <path class="white" d="M98 134L58 130L62 142L100 146C130 160 220 158 270 142C300 130 296 112 266 106C204 96 124 108 98 134Z" />
            <path class="white-2" transform="translate(2 3)" d="M98 134C124 108 204 96 266 106C296 112 300 130 270 142C220 158 130 160 100 146Z" />
            <path class="shade" d="M100 146C130 160 220 158 270 142C294 132 296 116 280 110C284 126 262 146 214 150C170 154 130 152 100 146Z" />
            <path class="edge" d="M98 134L58 130L62 142L100 146C130 160 220 158 270 142C300 130 296 112 266 106C204 96 124 108 98 134Z" />
            <path class="feather" d="M70 134L100 138M72 140L104 142" />
            <!-- cuello estirado y cabeza -->
            <path class="white" d="M256 106C288 96 318 94 342 100L346 118C324 122 298 126 266 142Z" />
            <path class="white-2" transform="translate(1 3)" d="M262 112C292 104 320 106 342 110L346 118C324 122 298 126 266 142Z" />
            <path class="edge" d="M256 106C288 96 318 94 342 100M346 118C324 122 298 126 266 142" />
            <ellipse class="white" cx="348" cy="108" rx="17" ry="13.5" />
            <path class="shade" d="M334 114C344 122 360 120 364 110C362 122 346 126 334 114Z" />
            <ellipse class="edge" cx="348" cy="108" rx="17" ry="13.5" />
            <path class="gloss" d="M270 110C292 104 316 103 332 105" />
            <path class="eyeline" d="M340 102C346 99 352 99 358 102" />
            <circle class="eye" cx="351" cy="105" r="2.7" />
            <circle class="eye-glint" cx="352" cy="104" r="0.9" />
            <!-- pico largo -->
            <path class="beak" d="M360 102C384 102 412 108 432 116C410 120 384 120 360 118Z" />
            <path class="beak-2" d="M360 112C384 114 410 116 431 116C410 120 384 120 360 118Z" />
            <path class="beak-line" d="M362 111.4C386 113.6 412 115.6 430 116" />
          </g>

          <!-- ala cercana -->
          <g class="fs__wing fs__wing--near">
            <g :filter="`url(#${fid})`">
              <path class="white" :d="WING" />
              <path class="white-2" transform="translate(3 4)" :d="WING" />
              <g :clip-path="`url(#${wingClip})`">
                <path class="tips" :d="WING_TIPS" />
              </g>
              <path class="feather" :d="WING_FEATHERS" />
              <path class="rib" :d="WING_RIB" />
              <path class="edge" :d="WING" />
            </g>
          </g>

          <!-- bultito colgado del pico: se mece como péndulo -->
          <g class="fs__bundle">
            <g :filter="`url(#${fid})`">
              <path class="cord" d="M398 118C396 126 396 132 398 138" />
              <g transform="translate(398 140)">
                <path class="cloth" d="M0 0C-14 4 -28 22 -27 44C-26 66 -8 76 0 76C8 76 26 66 27 44C28 22 14 4 0 0Z" />
                <path class="cloth cloth--2" transform="translate(3 3)" d="M0 0C-14 4 -28 22 -27 44C-26 66 -8 76 0 76C8 76 26 66 27 44C28 22 14 4 0 0Z" />
                <path class="cloth-shade" d="M27 44C26 66 8 76 0 76C-8 76 -26 66 -27 44C-16 62 14 64 27 44Z" />
                <path class="cloth-edge" d="M0 0C-14 4 -28 22 -27 44C-26 66 -8 76 0 76C8 76 26 66 27 44C28 22 14 4 0 0Z" />
                <path class="fold" d="M-6 8C-14 28 -14 50 -6 70M8 10C16 30 16 50 10 68" />
                <path class="gloss" d="M-17 26C-20 38 -19 48 -15 56" />
                <!-- orejitas del nudo y moñito -->
                <path class="cloth" d="M0 0C-8 -8 -14 -8 -15 -2C-14 3 -6 3 0 0ZM0 0C8 -8 14 -8 15 -2C14 3 6 3 0 0Z" />
                <path class="cloth-edge" d="M0 0C-8 -8 -14 -8 -15 -2C-14 3 -6 3 0 0ZM0 0C8 -8 14 -8 15 -2C14 3 6 3 0 0Z" />
                <g transform="translate(0 14)">
                  <path class="bow-loop" d="M0 0C-5 -9 -17 -10 -18 -2C-18 6 -6 6 0 1ZM0 0C5 -9 17 -10 18 -2C18 6 6 6 0 1Z" />
                  <path class="bow-loop" d="M-1 2C-5 9 -7 14 -9 18L-3 15L-1 20ZM1 2C5 9 7 14 9 18L3 15L1 20Z" />
                  <circle class="bow-knot" cx="0" cy="0.5" r="3.4" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.fs {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_paper: var(--color-paper, #fdf8f0);
  --_cool: color-mix(in srgb, var(--_bow-dark) 22%, #a38f7a);
  --_ink: color-mix(in srgb, var(--_cool) 70%, #6b5240);
  --_white: color-mix(in srgb, var(--_paper) 62%, #fff);
  /* El pico y las patas son del animal, no de la paleta. */
  --_beak: #ee8a58;
  --_beak-dark: #cf5f36;
  display: block;
  width: 100%;
}
.fs svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.fs--flip .fs__art {
  transform: scaleX(-1);
  transform-box: view-box;
  transform-origin: 220px 0;
}

.white {
  fill: var(--_white);
}
.white--far {
  fill: color-mix(in srgb, var(--_white) 70%, #dccbb4);
}
.white-2 {
  fill: color-mix(in srgb, var(--_paper) 50%, #e6d6bd);
  opacity: 0.55;
}
.shade {
  fill: var(--_cool);
  opacity: 0.32;
}
.tips {
  fill: #3d3948;
  fill-opacity: 0.88;
}
.tips--far {
  fill-opacity: 0.6;
}
.edge {
  fill: none;
  stroke: var(--_ink);
  stroke-opacity: 0.6;
  stroke-width: 1.2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.feather,
.rib {
  fill: none;
  stroke: var(--_ink);
  stroke-opacity: 0.38;
  stroke-width: 1.4;
  stroke-linecap: round;
}
.rib {
  stroke-opacity: 0.3;
  stroke-width: 2;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.85;
  stroke-width: 3;
  stroke-linecap: round;
}
.eye {
  fill: #3a2f38;
}
.eye-glint {
  fill: #fff;
}
.eyeline {
  fill: none;
  stroke: #3a2f38;
  stroke-opacity: 0.55;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.beak {
  fill: var(--_beak);
  stroke: var(--_beak-dark);
  stroke-opacity: 0.6;
  stroke-width: 1;
  stroke-linejoin: round;
}
.beak-2 {
  fill: var(--_beak-dark);
  opacity: 0.3;
}
.beak-line {
  fill: none;
  stroke: var(--_beak-dark);
  stroke-opacity: 0.7;
  stroke-width: 1.1;
  stroke-linecap: round;
}
.leg {
  fill: none;
  stroke: var(--_beak);
  stroke-width: 3.8;
  stroke-linecap: round;
}
.toe {
  fill: none;
  stroke: var(--_beak-dark);
  stroke-opacity: 0.85;
  stroke-width: 2.4;
  stroke-linecap: round;
}

/* Bultito de tela */
.cord {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.7;
  stroke-width: 2.2;
  stroke-linecap: round;
}
.cloth {
  fill: var(--_bow);
  fill-opacity: 0.62;
}
.cloth--2 {
  fill-opacity: 0.3;
}
.cloth-shade {
  fill: var(--_cool);
  fill-opacity: 0.26;
}
.cloth-edge {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.5;
  stroke-width: 1.1;
  stroke-linejoin: round;
}
.fold {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.3;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.bow-loop {
  fill: var(--_bow-soft);
  stroke: var(--_bow-dark);
  stroke-opacity: 0.5;
  stroke-width: 0.9;
  stroke-linejoin: round;
}
.bow-knot {
  fill: var(--_bow-dark);
  fill-opacity: 0.75;
}

/* Cada grupo gira o sube desde su apoyo (px del dibujo): ala desde el hombro, bultito desde el pico. */
.fs__wing,
.fs__bob,
.fs__bundle {
  transform-box: view-box;
}
.fs__wing {
  transform-origin: 246px 116px;
}
.fs__bundle {
  transform-origin: 398px 118px;
}

/* Quieta: alas en alto. Volando: aletean (la lejana a destiempo), el cuerpo a contratiempo. */
.is-flying .fs__wing {
  animation: fs-flap calc(0.95s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-flying .fs__wing--far {
  animation-delay: calc(-0.22s * var(--motion-scale, 1));
}
.is-flying .fs__bob {
  animation: fs-bob calc(0.95s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}
.is-flying .fs__bundle {
  animation: fs-swing calc(1.9s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}

@keyframes fs-flap {
  from {
    transform: rotate(8deg) scaleY(1);
  }
  to {
    transform: rotate(-52deg) scaleY(0.82);
  }
}
@keyframes fs-bob {
  from {
    transform: translateY(-4px);
  }
  to {
    transform: translateY(5px);
  }
}
@keyframes fs-swing {
  from {
    transform: rotate(-9deg);
  }
  to {
    transform: rotate(9deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-flying .fs__wing,
  .is-flying .fs__bob,
  .is-flying .fs__bundle {
    animation: none;
  }
}
</style>
