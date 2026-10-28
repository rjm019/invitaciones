<script setup lang="ts">
import { ref } from 'vue'
import { useInView } from '@/composables/useInView'

/**
 * La iglesia o la hacienda de línea (los mismos trazos de themes/_shared/assets/iglesia.svg y
 * hacienda.svg), pero vivas: al entrar a la pantalla se dibujan trazo a trazo (cada parte
 * aparece con opacity + scale, una tras otra, como `encaje_dibujado`) y luego las campanas se
 * mecen, los árboles ondean con la brisa, las aves vuelan y aletean, las ventanas y el
 * rosetón se encienden con luz cálida y, en la hacienda, el sol gira despacio. Solo se anima
 * transform y opacity; los ciclos se pausan fuera de la pantalla y con menos movimiento el
 * dibujo sale completo y quieto (las ventanas encendidas). La tinta es `currentColor`; la luz,
 * `--landmark-light` (si no, el oro del tema). Decorativo: oculto a lectores de pantalla.
 */
defineProps<{ kind: 'church' | 'estate' }>()

const root = ref<SVGSVGElement | null>(null)
const entered = useInView(root, { threshold: 0.35 })
const visible = useInView(root, { once: false, threshold: 0 })
</script>

<template>
  <svg
    ref="root"
    class="ll"
    :class="{ 'is-in': entered, 'is-live': visible }"
    viewBox="0 0 320 170"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="kind === 'church'">
      <!-- Luz de las ventanas y el rosetón (debajo de los trazos) -->
      <g class="ll-light" stroke="none">
        <path d="M126 120V106a5 5 0 0 1 10 0V120ZM184 120V106a5 5 0 0 1 10 0V120Z" />
        <path d="M88 112V98a7 7 0 0 1 14 0V112ZM218 112V98a7 7 0 0 1 14 0V112Z" />
        <path class="ll-light--door" d="M148 150V118a12 12 0 0 1 24 0V150Z" />
      </g>
      <circle class="ll-rose" cx="160" cy="94" r="6.2" stroke="none" />

      <g class="ll-s" style="--i: 0">
        <path d="M10 150H310" />
        <path d="M20 156H300" stroke-width="0.9" opacity="0.7" />
      </g>
      <g class="ll-s" style="--i: 1">
        <path d="M112 150V82H208V150" />
        <path d="M112 82L160 56L208 82" />
        <path d="M124 82L160 63L196 82" stroke-width="0.9" />
      </g>
      <g class="ll-s" style="--i: 2">
        <path d="M136 82V70H184V82" stroke-width="1.2" />
        <path d="M140 70a20 20 0 0 1 40 0" />
        <path d="M160 50V40M156 44H164" stroke-width="1.2" />
        <path d="M150 70V62M160 70V58M170 70V62" stroke-width="0.9" />
      </g>
      <g class="ll-s" style="--i: 3">
        <path d="M82 150V68H112" />
        <path d="M82 68V52H108V68" stroke-width="1.3" />
        <path d="M88 64V57a7 7 0 0 1 14 0V64" stroke-width="1" />
        <path d="M80 52H110" />
        <path d="M84 52L95 34L106 52" />
        <path d="M95 34V24M91.5 28H98.5" stroke-width="1.2" />
        <path d="M88 112V98a7 7 0 0 1 14 0V112Z" stroke-width="1.1" />
      </g>
      <g class="ll-s" style="--i: 4">
        <path d="M238 150V68H208" />
        <path d="M238 68V52H212V68" stroke-width="1.3" />
        <path d="M218 64V57a7 7 0 0 1 14 0V64" stroke-width="1" />
        <path d="M210 52H240" />
        <path d="M214 52L225 34L236 52" />
        <path d="M225 34V24M221.5 28H228.5" stroke-width="1.2" />
        <path d="M218 112V98a7 7 0 0 1 14 0V112Z" stroke-width="1.1" />
      </g>
      <g class="ll-s" style="--i: 5">
        <path d="M142 150V116a18 18 0 0 1 36 0V150" />
        <path d="M148 150V118a12 12 0 0 1 24 0V150" stroke-width="1" />
        <path d="M160 106V150" stroke-width="1" />
        <path
          d="M126 120V106a5 5 0 0 1 10 0V120ZM184 120V106a5 5 0 0 1 10 0V120Z"
          stroke-width="1.1"
        />
      </g>
      <g class="ll-s" style="--i: 6">
        <circle cx="160" cy="94" r="7" />
        <path d="M160 87V101M153 94H167M155 89L165 99M165 89L155 99" stroke-width="0.7" />
      </g>
      <!-- Las campanas, colgadas en cada campanario -->
      <g class="ll-s" style="--i: 7">
        <g class="ll-loop ll-bell" style="transform-origin: 95px 57.5px">
          <path
            d="M95 57.5v1.3M92 63.4c0-3.200 1.200-4.600 3-4.600s3 1.400 3 4.600Z"
            stroke-width="1"
          />
          <circle cx="95" cy="64.3" r="0.7" stroke-width="0.8" />
        </g>
        <g class="ll-loop ll-bell ll-bell--late" style="transform-origin: 225px 57.5px">
          <path
            d="M225 57.5v1.3M222 63.4c0-3.200 1.200-4.600 3-4.600s3 1.400 3 4.600Z"
            stroke-width="1"
          />
          <circle cx="225" cy="64.3" r="0.7" stroke-width="0.8" />
        </g>
      </g>
      <g class="ll-s" style="--i: 8">
        <path d="M40 150V138H82M238 138H280V150" stroke-width="1.1" />
        <path d="M52 138V150M66 138V150M254 138V150M268 138V150" stroke-width="0.9" />
      </g>
      <g class="ll-s" style="--i: 9">
        <g class="ll-loop ll-tree" style="transform-origin: 28px 150px">
          <path
            d="M28 150V130M28 132C16 132 14 116 22 110C20 98 36 96 38 106C46 108 44 130 28 132Z"
          />
        </g>
        <g class="ll-loop ll-tree ll-tree--late" style="transform-origin: 292px 150px">
          <path
            d="M292 150V130M292 132C280 132 278 116 286 110C284 98 300 96 302 106C310 108 308 130 292 132Z"
          />
        </g>
      </g>
      <g class="ll-s" style="--i: 10">
        <g class="ll-loop ll-fly">
          <path class="ll-loop ll-wing" d="M250 30q4-5 8 0q4-5 8 0" stroke-width="1.2" />
        </g>
        <g class="ll-loop ll-fly ll-fly--late">
          <path
            class="ll-loop ll-wing ll-wing--late"
            d="M62 40q4-5 8 0q4-5 8 0"
            stroke-width="1.2"
          />
        </g>
      </g>
    </template>

    <template v-else>
      <g class="ll-light" stroke="none">
        <path
          d="M80 106V92a6 6 0 0 1 12 0V106ZM112 106V92a6 6 0 0 1 12 0V106ZM196 106V92a6 6 0 0 1 12 0V106ZM228 106V92a6 6 0 0 1 12 0V106Z"
        />
        <path class="ll-light--door" d="M148 150V110a12 12 0 0 1 24 0V150Z" />
      </g>

      <g class="ll-s" style="--i: 0">
        <path d="M10 150H310" />
        <path d="M20 156H300" stroke-width="0.9" opacity="0.7" />
      </g>
      <g class="ll-s" style="--i: 1">
        <path d="M62 150V84H258V150" />
        <path d="M48 84L72 66H248L272 84Z" />
        <path
          d="M80 66L72 84M96 66L88 84M112 66L104 84M128 66L120 84M192 66L200 84M208 66L216 84M224 66L232 84M240 66L248 84"
          stroke-width="1"
        />
      </g>
      <g class="ll-s" style="--i: 2">
        <path d="M138 66V34H182V66" />
        <path d="M132 34L160 12L188 34Z" />
        <path d="M148 56V45a12 12 0 0 1 24 0V56Z" />
        <path d="M160 33V25M156 29H164" stroke-width="1.2" />
      </g>
      <g class="ll-s" style="--i: 3">
        <g class="ll-loop ll-bell" style="transform-origin: 160px 42px">
          <path
            d="M160 42v1.6M155.5 52.5c0-5.400 1.800-8.800 4.500-8.800s4.500 3.400 4.500 8.800Z"
            stroke-width="1.1"
          />
          <circle cx="160" cy="53.6" r="0.9" stroke-width="0.9" />
        </g>
      </g>
      <g class="ll-s" style="--i: 4">
        <path d="M74 150V122a13 13 0 0 1 26 0V150" />
        <path d="M104 150V122a13 13 0 0 1 26 0V150" />
        <path d="M190 150V122a13 13 0 0 1 26 0V150" />
        <path d="M220 150V122a13 13 0 0 1 26 0V150" />
      </g>
      <g class="ll-s" style="--i: 5">
        <path d="M138 150V108a22 22 0 0 1 44 0V150" />
        <path d="M148 150V110a12 12 0 0 1 24 0V150" stroke-width="1" />
        <path d="M160 98V150" stroke-width="1" />
      </g>
      <g class="ll-s" style="--i: 6">
        <path
          d="M80 106V92a6 6 0 0 1 12 0V106ZM112 106V92a6 6 0 0 1 12 0V106ZM196 106V92a6 6 0 0 1 12 0V106ZM228 106V92a6 6 0 0 1 12 0V106Z"
          stroke-width="1.2"
        />
      </g>
      <g class="ll-s" style="--i: 7">
        <g class="ll-loop ll-tree" style="transform-origin: 28px 150px">
          <path d="M28 150C14 122 18 84 28 52C38 84 42 122 28 150Z" />
          <path
            d="M28 150V60M22 128C26 110 26 96 28 80M34 128C30 110 30 96 28 80"
            stroke-width="0.9"
          />
        </g>
        <g class="ll-loop ll-tree ll-tree--late" style="transform-origin: 294px 150px">
          <path d="M294 150C280 124 284 90 294 62C304 90 308 124 294 150Z" />
          <path
            d="M294 150V70M288 130C291 112 291 100 294 88M300 130C297 112 297 100 294 88"
            stroke-width="0.9"
          />
        </g>
      </g>
      <g class="ll-s" style="--i: 8">
        <path
          d="M46 150C48 144 52 142 56 140M50 150C52 146 58 146 60 143M262 150C264 144 268 142 272 140M266 150C268 146 274 146 276 143"
        />
      </g>
      <g class="ll-s" style="--i: 9">
        <circle cx="246" cy="34" r="8" />
        <g class="ll-loop ll-sun" style="transform-origin: 246px 34px">
          <path
            d="M246 18V21M246 47V50M230 34H233M259 34H262M234.7 22.7L236.8 24.8M255.2 43.2L257.3 45.3M257.3 22.7L255.2 24.8M236.8 43.2L234.7 45.3"
            stroke-width="1.1"
          />
        </g>
      </g>
      <g class="ll-s" style="--i: 10">
        <g class="ll-loop ll-fly ll-fly--late">
          <path class="ll-loop ll-wing" d="M76 36q5-6 10 0q5-6 10 0" stroke-width="1.3" />
        </g>
        <g class="ll-loop ll-fly">
          <path
            class="ll-loop ll-wing ll-wing--late"
            d="M96 24q4-5 8 0q4-5 8 0"
            stroke-width="1.3"
          />
        </g>
      </g>
    </template>
  </svg>
</template>

<style scoped>
.ll {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* ---- El dibujo trazo a trazo ---- */
.ll-s {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.ll.is-in .ll-s {
  animation: ll-draw calc(0.75s * var(--motion-scale)) var(--ease-out, ease-out) both;
  animation-delay: calc(var(--i) * 0.11s * var(--motion-scale));
}
@keyframes ll-draw {
  from {
    opacity: 0;
    transform: translateY(3px) scale(0.82);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---- La luz: ventanas y rosetón que se encienden y titilan apenas ---- */
.ll-light,
.ll-rose {
  fill: var(--landmark-light, var(--color-oro, #b08d57));
  opacity: 0;
}
.ll.is-in .ll-light {
  animation:
    ll-light-on calc(1.2s * var(--motion-scale)) ease-out calc(1.4s * var(--motion-scale)) both,
    ll-flicker calc(5s * var(--motion-scale)) ease-in-out calc(2.6s * var(--motion-scale)) infinite;
}
.ll.is-in .ll-rose {
  animation:
    ll-light-on calc(1.2s * var(--motion-scale)) ease-out calc(1.6s * var(--motion-scale)) both,
    ll-rose calc(4s * var(--motion-scale)) ease-in-out calc(2.8s * var(--motion-scale)) infinite;
}
.ll-light--door {
  opacity: 0.6;
}
@keyframes ll-light-on {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.38;
  }
}
@keyframes ll-flicker {
  0%,
  100% {
    opacity: 0.38;
  }
  45% {
    opacity: 0.3;
  }
  60% {
    opacity: 0.44;
  }
}
@keyframes ll-rose {
  0%,
  100% {
    opacity: 0.38;
  }
  50% {
    opacity: 0.7;
  }
}

/* ---- Lo que se mueve: solo mientras se ve (`.ll .ll-loop` gana a cada `animation`) ---- */
.ll .ll-loop {
  animation-play-state: paused;
}
.ll.is-in.is-live .ll-loop {
  animation-play-state: running;
}
/* Campanas: se mecen desde su yugo, con una pausa entre repique y repique. */
.ll-bell {
  animation: ll-bell calc(3.2s * var(--motion-scale)) ease-in-out calc(1.6s * var(--motion-scale))
    infinite;
}
.ll-bell--late {
  animation-delay: calc(2.1s * var(--motion-scale));
}
@keyframes ll-bell {
  0%,
  55%,
  100% {
    transform: rotate(0);
  }
  12% {
    transform: rotate(16deg);
  }
  26% {
    transform: rotate(-13deg);
  }
  38% {
    transform: rotate(7deg);
  }
  48% {
    transform: rotate(-3deg);
  }
}
/* Árboles: ondean desde la raíz. */
.ll-tree {
  animation: ll-sway calc(5.5s * var(--motion-scale)) ease-in-out infinite alternate;
}
.ll-tree--late {
  animation-delay: calc(-2.4s * var(--motion-scale));
}
@keyframes ll-sway {
  from {
    transform: rotate(-1.8deg);
  }
  to {
    transform: rotate(2deg);
  }
}
/* Aves: cruzan un poco el cielo y aletean. */
.ll-fly {
  animation: ll-fly calc(9s * var(--motion-scale)) ease-in-out infinite alternate;
}
.ll-fly--late {
  animation-duration: calc(11s * var(--motion-scale));
  animation-direction: alternate-reverse;
}
@keyframes ll-fly {
  from {
    transform: translate(-6px, 2px);
  }
  50% {
    transform: translate(4px, -5px);
  }
  to {
    transform: translate(12px, 0);
  }
}
.ll-wing {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: ll-flap calc(0.9s * var(--motion-scale)) ease-in-out infinite alternate;
}
.ll-wing--late {
  animation-duration: calc(1.1s * var(--motion-scale));
}
@keyframes ll-flap {
  from {
    transform: scaleY(1);
  }
  to {
    transform: scaleY(0.45);
  }
}
/* El sol: sus rayos giran despacio. */
.ll-sun {
  animation: ll-spin calc(40s * var(--motion-scale)) linear infinite;
}
@keyframes ll-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Menos movimiento: el dibujo completo y quieto, con las ventanas encendidas. */
@media (prefers-reduced-motion: reduce) {
  .ll-s,
  .ll.is-in .ll-s {
    opacity: 1;
    animation: none;
  }
  .ll-loop,
  .ll.is-in.is-live .ll-loop {
    animation: none;
  }
  .ll-light,
  .ll-rose,
  .ll.is-in .ll-light,
  .ll.is-in .ll-rose {
    opacity: 0.38;
    animation: none;
  }
}
</style>
