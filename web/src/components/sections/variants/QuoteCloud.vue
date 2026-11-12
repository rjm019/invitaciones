<script setup lang="ts">
import { computed } from 'vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Frase en nube (`nube`): la frase va dentro de una nube grande, armada con formas CSS que se
 * estiran (un cuerpo de esquinas muy redondas y gajos redondos arriba, abajo y a los lados),
 * así crece con el texto y las frases largas no se salen. Es crema, con borde de pigmento
 * (cada forma se pinta dos veces: una más grande con el color del borde y otra crema encima) y
 * una sombra de lavado suave. Respira muy despacio (la propiedad `scale`, apenas). Detrás,
 * nubes chicas que derivan a distinta velocidad y estrellitas doradas que titilan a destiempo.
 * Con "menos movimiento" todo queda quieto. Con el efecto "escribir", la frase aparece letra por
 * letra. Sirve en cualquier tema: el borde sale del primario y las estrellas del dorado.
 */
const props = defineProps<{ section: ResolvedSection }>()
const text = computed(() => props.section.text ?? props.section.title ?? '')
const author = computed(() => (props.section.text ? (props.section.title ?? '') : ''))

// Gajos de la nube: posición en % del cuerpo y tamaño en múltiplos de la unidad `--u`.
const lobes = [
  { l: '6%', t: '-1.5rem', s: 1.0 },
  { l: '27%', t: 'calc(var(--u) * -0.78)', s: 1.5 },
  { l: '55%', t: 'calc(var(--u) * -0.62)', s: 1.25 },
  { l: '78%', t: '-1.4rem', s: 0.95 },
  { l: '-3%', t: '38%', s: 1.0 },
  { l: '86%', t: '46%', s: 0.85 },
  { l: '10%', b: '-1.2rem', s: 0.9 },
  { l: '34%', b: 'calc(var(--u) * -0.42)', s: 1.1 },
  { l: '60%', b: 'calc(var(--u) * -0.38)', s: 1.05 },
  { l: '82%', b: '-1.1rem', s: 0.85 },
]
function lobeStyle(l: { l: string; t?: string; b?: string; s: number }) {
  return { left: l.l, top: l.t, bottom: l.b, '--k': String(l.s) }
}
const stars = [
  { x: '4%', y: '14%', s: 0.9, d: 0 },
  { x: '93%', y: '8%', s: 1.2, d: 1.3 },
  { x: '88%', y: '84%', s: 0.8, d: 2.1 },
]
const puffs = [
  { x: '-2%', y: '1%', w: 5.2, dur: 17, delay: -4, o: 0.85 },
  { x: '66%', y: '0%', w: 3.6, dur: 23, delay: -11, o: 0.7 },
  { x: '60%', y: '91%', w: 4.2, dur: 13, delay: -2, o: 0.7 },
  { x: '-3%', y: '90%', w: 3.2, dur: 19, delay: -7, o: 0.6 },
]
</script>

<template>
  <figure class="qc">
    <span
      v-for="(p, i) in puffs"
      :key="`p${i}`"
      class="qc__puff"
      aria-hidden="true"
      :style="{ left: p.x, top: p.y, '--w': `${p.w}rem`, '--dur': `${p.dur}s`, '--delay': `${p.delay}s`, opacity: p.o }"
    />
    <svg
      v-for="(s, i) in stars"
      :key="`s${i}`"
      class="qc__star"
      viewBox="-10 -10 20 20"
      aria-hidden="true"
      focusable="false"
      :style="{ left: s.x, top: s.y, '--sz': `${s.s}rem`, '--delay': `${s.d}s` }"
    >
      <path d="M0 -9C1 -3 3 -1 9 0C3 1 1 3 0 9C-1 3 -3 1 -9 0C-3 -1 -1 -3 0 -9Z" />
    </svg>

    <div class="qc__cloud">
      <span class="qc__wash" aria-hidden="true" />
      <!-- Primero las formas con el color del borde (más grandes), luego las crema encima. -->
      <span class="qc__shapes qc__shapes--ink" aria-hidden="true">
        <i class="qc__trunk" />
        <i v-for="(l, i) in lobes" :key="i" class="qc__lobe" :style="lobeStyle(l)" />
      </span>
      <span class="qc__shapes" aria-hidden="true">
        <i class="qc__trunk" />
        <i v-for="(l, i) in lobes" :key="i" class="qc__lobe" :style="lobeStyle(l)" />
      </span>
      <div class="qc__content">
        <blockquote class="qc__text" data-text="text">
          <TypewriterText :text="text" :active="section.effects.includes('typewriter')" />
        </blockquote>
        <figcaption v-if="author" class="qc__author" data-text="title">{{ author }}</figcaption>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.qc {
  --ink: color-mix(in srgb, var(--color-primary) 50%, var(--color-paper, #fdf8f0));
  position: relative;
  isolation: isolate;
  container-type: inline-size;
  max-width: 27rem;
  margin: 0 auto;
  padding: 3.6rem 1.4rem 3.4rem;
}
.qc__cloud {
  --u: clamp(3.4rem, 22cqi, 5.6rem);
  position: relative;
  isolation: isolate;
  transform-origin: 50% 55%;
  animation: qc-breathe calc(9s * var(--motion-scale)) ease-in-out infinite alternate;
}
/* La sombra de lavado: un manchón suave del color del listón debajo de la nube. */
.qc__wash {
  position: absolute;
  inset: 8% 2% -12%;
  z-index: -3;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 38%, transparent);
  filter: blur(1.3rem);
}
.qc__shapes {
  position: absolute;
  inset: 0;
  z-index: -1;
  --fill: var(--color-paper, #fdf8f0);
  --grow: 0px;
}
.qc__shapes--ink {
  z-index: -2;
  --fill: var(--ink);
  --grow: 2px;
}
.qc__trunk {
  position: absolute;
  inset: 0;
  border-radius: calc(var(--u) * 0.7);
  background: var(--fill);
  box-shadow: 0 0 0 var(--grow) var(--fill);
}
.qc__lobe {
  position: absolute;
  width: calc(var(--u) * var(--k));
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--fill);
  box-shadow: 0 0 0 var(--grow) var(--fill);
}
/* El crema lleva un leve brillo arriba, como acuarela aún húmeda. */
.qc__shapes:not(.qc__shapes--ink) .qc__trunk {
  background:
    radial-gradient(ellipse at 40% 10%, rgb(255 255 255 / 0.75), transparent 65%),
    var(--fill);
}
.qc__content {
  position: relative;
  padding: 2.2rem 1.6rem 2.2rem;
  text-align: center;
}
.qc__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.7rem, 9cqi, 2.5rem) * var(--t-text-size, 1));
  line-height: 1.25;
  color: var(--t-text-color, var(--color-primary-strong, var(--color-primary)));
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.qc__author {
  margin-top: 0.7rem;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.8rem * var(--t-title-size, 1));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-oro, var(--color-text)));
}

/* Nubes chicas de fondo: una pastilla con dos gajos, que deriva de lado a lado. */
.qc__puff {
  position: absolute;
  z-index: -1;
  width: var(--w);
  height: calc(var(--w) * 0.36);
  border-radius: 999px;
  background: var(--color-primary-soft, #f3d3d8);
  animation: qc-drift calc(var(--dur) * var(--motion-scale)) ease-in-out var(--delay) infinite alternate;
}
.qc__puff::before,
.qc__puff::after {
  content: '';
  position: absolute;
  bottom: 40%;
  border-radius: 50%;
  background: inherit;
}
.qc__puff::before {
  left: 16%;
  width: 42%;
  aspect-ratio: 1;
}
.qc__puff::after {
  left: 42%;
  width: 34%;
  aspect-ratio: 1;
}
.qc__star {
  position: absolute;
  width: var(--sz);
  height: var(--sz);
  fill: var(--color-oro, #b8925a);
  animation: qc-twinkle calc(3.2s * var(--motion-scale)) ease-in-out var(--delay) infinite;
}
@keyframes qc-breathe {
  from {
    scale: 1;
  }
  to {
    scale: 1.025;
  }
}
@keyframes qc-drift {
  from {
    translate: -1.4rem 0;
  }
  to {
    translate: 1.4rem 0.3rem;
  }
}
@keyframes qc-twinkle {
  0%,
  100% {
    opacity: 0.25;
    scale: 0.7;
  }
  50% {
    opacity: 1;
    scale: 1.15;
  }
}
@container section (min-width: 30rem) {
  .qc {
    max-width: 36rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .qc__cloud,
  .qc__puff {
    animation: none;
  }
  .qc__star {
    animation: none;
    opacity: 0.9;
  }
}
</style>
