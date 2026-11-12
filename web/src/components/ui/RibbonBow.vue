<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Moño de listón de satén en acuarela: dos lazos, nudo y dos colas con punta en V. Cada forma
 * lleva dos lavados superpuestos, un borde de pigmento, luces en blanco y sombras frías; el
 * grano y el borde irregular vienen de un filtro estático (nunca se anima: se mueven los
 * grupos que lo contienen). Con `tied` en falso solo se ve el nudo chico; al pasar a verdadero
 * los lazos crecen desde el nudo y las colas caen, uno tras otro. Con `sway` las colas y los
 * lazos se mecen despacio. Solo transform y opacity; con "menos movimiento" no hay transición
 * ni vaivén y queda en su estado final. Color: `--bow-color` (listón), `--bow-color-dark` y
 * `--bow-color-soft`, con respaldo en `--color-primary`, `-strong` y `-soft`; `tone` los pisa
 * con un solo color y deriva los otros dos. Sirve en cualquier tema.
 */
const props = withDefaults(
  defineProps<{ tied?: boolean; sway?: boolean; size?: string; tone?: string }>(),
  { tied: true, sway: false, size: undefined, tone: undefined },
)

// Identificador propio por instancia: el filtro no depende de que otro moño esté a la vista.
const fid = `rb-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.size) s.width = props.size
  if (props.tone) {
    s['--bow-color'] = props.tone
    s['--bow-color-dark'] = `color-mix(in srgb, ${props.tone} 68%, #3f3550)`
    s['--bow-color-soft'] = `color-mix(in srgb, ${props.tone} 36%, #fff)`
  }
  return s
})

// Lazo izquierdo (el derecho es el mismo, volteado y un poco girado para que no sea simétrico).
const LOOP_OUT =
  'M194 132C176 84 126 32 74 40C26 48 8 112 52 148C96 182 160 154 194 146Z'
const LOOP_IN = 'M184 136C164 100 126 62 88 66C52 70 40 112 72 134C104 154 150 146 184 142Z'
const LOOP_SHADE = 'M184 136C164 100 126 62 88 66C104 78 150 104 184 141Z'
const LOOP_GLOSS = 'M176 112C152 76 118 50 80 52'
const LOOP_GLOSS_LOW = 'M170 150C130 168 80 164 54 140'
const LOOP_PLEATS =
  'M190 134C176 124 164 112 156 98M190 140C172 138 158 134 146 126M190 146C172 150 158 152 142 150'
const loops = [
  { key: 'l', t: '' },
  { key: 'r', t: 'translate(400 0) scale(-0.97 0.97) rotate(4 200 138)' },
]
</script>

<template>
  <div class="rb" :class="{ 'is-tied': tied, 'is-sway': sway }" :style="rootStyle" aria-hidden="true">
    <svg viewBox="0 0 400 310" focusable="false">
      <defs>
        <filter :id="fid" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
      </defs>
      <!-- sombra suave en el suelo -->
      <ellipse class="rb__ground" cx="200" cy="300" rx="120" ry="5" />

      <!-- colas -->
      <g class="rb__tail rb__tail--l">
        <g class="rb__tail-sway">
          <g :filter="`url(#${fid})`">
            <path class="wash" d="M188 148C172 196 146 240 112 284L136 270L148 296C172 252 196 204 208 150Z" />
            <path class="wash-2" transform="translate(3 2)" d="M188 148C172 196 146 240 112 284L136 270L148 296C172 252 196 204 208 150Z" />
            <path class="shade" d="M148 296C172 252 196 204 208 150L200 150C190 196 168 244 140 280Z" />
            <path class="edge" d="M188 148C172 196 146 240 112 284L136 270L148 296C172 252 196 204 208 150Z" />
            <path class="crease" d="M198 152C176 200 150 244 128 280" />
            <path class="gloss" d="M190 160C176 198 154 234 130 268" />
            <path class="knot-shade" d="M188 148L208 150L204 180C198 170 192 160 188 148Z" />
          </g>
        </g>
      </g>
      <g class="rb__tail rb__tail--r">
        <g class="rb__tail-sway">
          <g :filter="`url(#${fid})`">
            <path class="wash" d="M212 148C228 194 258 232 292 276L268 264L252 290C230 246 206 200 194 152Z" />
            <path class="wash-2" transform="translate(-3 2)" d="M212 148C228 194 258 232 292 276L268 264L252 290C230 246 206 200 194 152Z" />
            <path class="shade" d="M252 290C230 246 206 200 194 152L202 152C214 198 240 244 262 270Z" />
            <path class="edge" d="M212 148C228 194 258 232 292 276L268 264L252 290C230 246 206 200 194 152Z" />
            <path class="crease" d="M202 152C224 198 250 232 276 268" />
            <path class="gloss" d="M214 162C226 196 248 224 270 252" />
            <path class="knot-shade" d="M212 148L192 150L196 180C202 170 208 160 212 148Z" />
          </g>
        </g>
      </g>

      <!-- lazos -->
      <g v-for="l in loops" :key="l.key" class="rb__loop" :class="`rb__loop--${l.key}`">
        <g class="rb__loop-sway">
          <g :transform="l.t || undefined">
            <g :filter="`url(#${fid})`">
              <path class="wash" :d="LOOP_OUT" />
              <path class="wash-2" transform="translate(2.5 2.5)" :d="LOOP_OUT" />
              <path class="back" :d="LOOP_IN" />
              <path class="shade" :d="LOOP_SHADE" />
              <path class="edge" :d="LOOP_OUT" />
              <path class="edge edge--in" :d="LOOP_IN" />
              <path class="gloss" :d="LOOP_GLOSS" />
              <path class="gloss gloss--low" :d="LOOP_GLOSS_LOW" />
              <path class="crease" :d="LOOP_PLEATS" />
              <path class="pleat" d="M192 134C178 128 168 118 162 106L174 120Z" />
              <path class="pleat" d="M192 145C176 148 164 150 150 148L168 143Z" />
            </g>
          </g>
        </g>
      </g>

      <!-- nudo -->
      <g class="rb__knot">
        <g :filter="`url(#${fid})`">
          <path class="wash" d="M176 122C184 111 216 111 226 122C233 134 231 152 223 161C212 169 188 169 178 161C170 151 170 133 176 122Z" />
          <path class="wash-2" transform="translate(2 2.5)" d="M176 122C184 111 216 111 226 122C233 134 231 152 223 161C212 169 188 169 178 161C170 151 170 133 176 122Z" />
          <path class="shade" d="M226 124C233 136 231 152 223 161C212 169 190 169 180 162C198 164 218 156 226 124Z" />
          <path class="edge" d="M176 122C184 111 216 111 226 122C233 134 231 152 223 161C212 169 188 169 178 161C170 151 170 133 176 122Z" />
          <path class="crease" d="M184 122C180 134 180 150 186 162M196 116C192 134 193 152 198 166M210 116C208 132 210 150 214 165" />
          <path class="gloss gloss--knot" d="M182 128C186 120 198 117 210 118" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.rb {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_cool: color-mix(in srgb, var(--_bow-dark) 35%, #6f7ba6);
  display: block;
  width: 12rem;
}
.rb svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Pintura: dos lavados, sombra fría, borde de pigmento y luces en blanco. */
.wash {
  fill: var(--_bow);
  opacity: 0.58;
}
.wash-2 {
  fill: var(--_bow);
  opacity: 0.34;
}
.back {
  fill: var(--_bow-soft);
  opacity: 0.85;
}
.shade {
  fill: var(--_cool);
  opacity: 0.26;
}
.knot-shade {
  fill: var(--_cool);
  opacity: 0.3;
}
.edge {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.4;
  stroke-width: 1;
  stroke-linejoin: round;
}
.pleat {
  fill: var(--_bow-dark);
  opacity: 0.2;
}
.edge--in {
  stroke-opacity: 0.26;
}
.crease {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.32;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.6;
  stroke-width: 3;
  stroke-linecap: round;
}
.gloss--low {
  stroke-opacity: 0.38;
  stroke-width: 2.2;
}
.gloss--knot {
  stroke-opacity: 0.7;
  stroke-width: 2.6;
}
.rb__ground {
  fill: var(--_cool);
  opacity: 0.14;
}

/* Cada pieza crece o cae desde su punto de apoyo: lazos y nudo desde el centro, colas desde arriba. */
.rb__loop,
.rb__knot,
.rb__tail,
.rb__loop-sway,
.rb__tail-sway {
  transform-box: view-box;
}
.rb__loop,
.rb__knot,
.rb__loop-sway {
  transform-origin: 200px 140px;
}
.rb__tail,
.rb__tail-sway {
  transform-origin: 200px 150px;
}

/* Desatado: solo el nudo, chico. */
.rb__loop {
  transform: scale(0.04);
  opacity: 0;
  transition:
    transform calc(0.35s * var(--motion-scale, 1)) ease-in,
    opacity calc(0.25s * var(--motion-scale, 1)) ease-in;
}
.rb__tail {
  transform: scaleY(0.04) rotate(-6deg);
  opacity: 0;
  transition:
    transform calc(0.3s * var(--motion-scale, 1)) ease-in,
    opacity calc(0.2s * var(--motion-scale, 1)) ease-in;
}
.rb__knot {
  transform: scale(0.6);
  transition: transform calc(0.45s * var(--motion-scale, 1)) cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* Atado: los lazos crecen con un poco de rebote y luego caen las colas, escalonadas. */
.is-tied .rb__loop,
.is-tied .rb__tail,
.is-tied .rb__knot {
  transform: none;
  opacity: 1;
}
.is-tied .rb__loop {
  transition:
    transform calc(0.9s * var(--motion-scale, 1)) cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity calc(0.3s * var(--motion-scale, 1)) ease-out;
}
.is-tied .rb__loop--r {
  transition-delay: calc(0.12s * var(--motion-scale, 1));
}
.is-tied .rb__tail {
  transition:
    transform calc(0.85s * var(--motion-scale, 1)) cubic-bezier(0.3, 1.45, 0.5, 1),
    opacity calc(0.25s * var(--motion-scale, 1)) ease-out;
  transition-delay: calc(0.42s * var(--motion-scale, 1));
}
.is-tied .rb__tail--r {
  transition-delay: calc(0.55s * var(--motion-scale, 1));
}
.is-tied .rb__knot {
  transition-delay: calc(0.05s * var(--motion-scale, 1));
}

/* Vaivén: va en un grupo interno para no pelear con la transición de entrada. */
.is-sway.is-tied .rb__tail--l .rb__tail-sway {
  animation: rb-sway-l calc(3.6s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-sway.is-tied .rb__tail--r .rb__tail-sway {
  animation: rb-sway-r calc(4.2s * var(--motion-scale, 1)) ease-in-out infinite alternate;
  animation-delay: calc(-1.3s * var(--motion-scale, 1));
}
.is-sway.is-tied .rb__loop--l .rb__loop-sway {
  animation: rb-breathe calc(5s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-sway.is-tied .rb__loop--r .rb__loop-sway {
  animation: rb-breathe calc(5.6s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}

@keyframes rb-sway-l {
  from {
    transform: rotate(-3.5deg);
  }
  to {
    transform: rotate(3deg);
  }
}
@keyframes rb-sway-r {
  from {
    transform: rotate(3.5deg);
  }
  to {
    transform: rotate(-3deg);
  }
}
@keyframes rb-breathe {
  from {
    transform: rotate(-1.4deg) scale(1);
  }
  to {
    transform: rotate(1.4deg) scale(1.025);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rb__loop,
  .rb__tail,
  .rb__knot {
    transition: none !important;
  }
  .rb__tail-sway,
  .rb__loop-sway {
    animation: none !important;
  }
}
</style>
