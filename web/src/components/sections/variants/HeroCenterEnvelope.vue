<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import laceEdgeUrl from '@/effects/assets/encaje-abajo.svg?url'
import { useCelebration } from '@/composables/useCelebration'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import { usePreview } from '@/composables/usePreview'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useScrollLock } from '@/composables/useScrollLock'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada "sobre central" (`sobre-central`): un sobre marfil cerrado por la mitad, con una
 * costura que lo parte de lado a lado, una perla (o el lacre del tema) en el centro y la
 * orilla de encaje en la costura. Al tocar: empieza la música, la perla salta, la mitad de
 * arriba se levanta girando sobre la costura (bisagra en el centro, rotateX con perspectiva)
 * y la tarjeta sube desde adentro con una luz tras ella; la mitad de abajo baja y se desvanece.
 * Todo con transform y opacity. Mientras está cerrado la página no hace scroll. Con "menos
 * movimiento" ya aparece abierto; en el gestor se ve abierto, salvo en "Ver como invitado".
 * Sirve en cualquier tema: el papel sale de la paleta y cada pieza es una ranura de adorno
 * (`tarjeta`, `lacre`, `papel`).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const decor = computed(() => props.section.decor)
const seal = computed(() => decorOr(decor.value, 'seal', null))
const paper = computed(() => decorOr(decor.value, 'paper', null))
const card = computed(() => decorOr(decor.value, 'card', null))

const phase = ref<'closed' | 'opening' | 'open'>(
  !reduced.value || !!preview.value ? (preview.value?.envelopeOpen ? 'open' : 'closed') : 'open',
)
useScrollLock(() => phase.value === 'closed')

// Al abrir, la portada deja de ocupar toda la pantalla: la tarjeta se queda donde estaba.
const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const lift = ref<number | null>(null)
const heroStyle = computed(() =>
  lift.value === null ? undefined : { '--hero-lift': `${lift.value}px` },
)

const name = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
const family = computed(() => invitation?.invitation.value?.label ?? null)
const longestWord = computed(() =>
  Math.max(1, ...name.value.split(/\s+/).map((w) => Array.from(w).length)),
)
const frameStyle = computed(() => ({
  '--hero-name-chars': String(longestWord.value),
  '--ce-lace': `url("${laceEdgeUrl}")`,
  ...(paper.value ? { '--ce-paper': `url("${paper.value}")` } : {}),
  ...(card.value ? { '--ce-card': `url("${card.value}")` } : {}),
}))

let timer: ReturnType<typeof setTimeout> | undefined
function open() {
  if (phase.value !== 'closed') return
  if (root.value && stage.value) {
    lift.value = Math.max(
      0,
      stage.value.getBoundingClientRect().top - root.value.getBoundingClientRect().top,
    )
  }
  void music?.play() // dentro del toque: así iOS sí deja sonar
  if (reduced.value) {
    phase.value = 'open'
    return
  }
  celebration?.celebrate('stars')
  phase.value = 'opening'
  // por si animationend no llega (todo dura ~2.7 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 3000 * motionScale())
}
function onAwayEnd(e: AnimationEvent) {
  if (e.animationName.includes('ce-away')) phase.value = 'open'
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="ce-hero"
    :class="[`ce-hero--${phase}`, { 'ce-hero--pinned': lift !== null }]"
    :style="heroStyle"
  >
    <div ref="stage" class="ce-hero__stage" @click="open">
      <div class="ce-hero__frame" :style="frameStyle">
        <span v-if="phase !== 'open'" class="ce-hero__glow" aria-hidden="true" />

        <div class="ce-hero__card">
          <p v-if="event.subtitle" class="ce-hero__subtitle" data-text="subtitle">
            {{ event.subtitle }}
          </p>
          <h1 class="ce-hero__name" data-text="name">{{ name }}</h1>
          <p v-if="event.venue.name || event.venue.city" class="ce-hero__venue" data-text="place">
            <span v-if="event.venue.name">{{ event.venue.name }}</span>
            <span v-if="event.venue.city">{{ event.venue.city }}</span>
          </p>
        </div>

        <template v-if="phase !== 'open'">
          <!-- La mitad de abajo: el bolsillo, con la costura arriba. -->
          <span class="ce-hero__bottom" @animationend="onAwayEnd" />
          <!-- La mitad de arriba: gira sobre la costura. Por fuera el papel; por dentro, el forro. -->
          <span class="ce-hero__top">
            <span class="ce-hero__face ce-hero__face--front" />
            <span class="ce-hero__face ce-hero__face--back" />
          </span>
          <p v-if="family" class="ce-hero__plate" data-text="to">{{ family }}</p>
          <span class="ce-hero__seal" aria-hidden="true">
            <img v-if="seal" :src="seal" alt="" />
            <i v-else class="ce-hero__pearl" />
          </span>
        </template>
      </div>
    </div>

    <button
      v-if="phase === 'closed'"
      type="button"
      class="ce-hero__call hero__open"
      data-text="button"
      @click="open"
    >
      {{ section.button ?? 'Toca para abrir' }}
    </button>
  </div>
</template>

<style scoped>
.ce-hero {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.ce-hero--closed,
.ce-hero--opening {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.ce-hero--pinned {
  place-content: start center;
  padding-top: var(--hero-lift);
}
.ce-hero__stage {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100cqi, 21rem);
}
.ce-hero--closed .ce-hero__stage {
  cursor: pointer;
}

/* El sobre: la perspectiva nace de la costura (el centro), donde está la bisagra. */
.ce-hero__frame {
  --ce-ivory: color-mix(in srgb, var(--color-paper, #f3eedf) 94%, #d8cdb0);
  --ce-ink: var(--color-on-button, #3f4535);
  position: relative;
  width: 100%;
  aspect-ratio: 14 / 15;
  perspective: 1100px;
  perspective-origin: 50% 50%;
}

/* La luz detrás de la tarjeta: un resplandor que se enciende al abrir. */
.ce-hero__glow {
  position: absolute;
  inset: -14% -18%;
  z-index: 0;
  background: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    color-mix(in srgb, #fff6dc 70%, transparent),
    color-mix(in srgb, #fff6dc 18%, transparent) 55%,
    transparent 75%
  );
  opacity: 0;
  pointer-events: none;
}

/* La tarjeta guardada adentro: asomada apenas, más abajo, hasta que sube. */
.ce-hero__card {
  position: absolute;
  inset: 4% 6%;
  z-index: 1;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10% 6% 8%;
  text-align: center;
  background: var(--ce-card, none) center / 100% 100% no-repeat, var(--color-paper, #f3eedf);
  box-shadow: 0 0.6rem 1.6rem rgb(0 0 0 / 0.28);
}
.ce-hero--closed .ce-hero__card,
.ce-hero--opening .ce-hero__card {
  transform: translateY(3%) scale(0.9);
}
.ce-hero__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-script-mono));
  font-size: calc(11cqi * var(--t-subtitle-size, 1));
  line-height: 1.2;
  color: var(--t-subtitle-color, var(--ce-ink));
}
.ce-hero__name {
  flex: 1;
  display: grid;
  place-items: center;
  max-width: 100%;
  margin: 0;
  font-family: var(--t-name-font, var(--font-script));
  font-weight: 400;
  font-size: min(
    calc(clamp(2.5rem, 36cqi, 9rem) * var(--t-name-size, 1)),
    calc(190cqi / var(--hero-name-chars, 1))
  );
  line-height: 1;
  color: var(--t-name-color, var(--ce-ink));
  overflow-wrap: anywhere;
}
.ce-hero__venue {
  display: grid;
  margin: 0;
  font-family: var(--t-place-font, var(--font-script-mono));
  font-size: calc(9cqi * var(--t-place-size, 1));
  line-height: 1.15;
  color: var(--t-place-color, var(--ce-ink));
}

/*
 * Las dos mitades del sobre: papel marfil (o la imagen de la ranura `papel`), con una puntada
 * discontinua por dentro. La de arriba lleva en su orilla de abajo (la costura) la tira de
 * encaje, que cuelga sobre la de abajo.
 */
.ce-hero__bottom,
.ce-hero__face--front,
.ce-hero__face--back {
  background:
    linear-gradient(160deg, rgb(255 255 255 / 0.45), transparent 55%, rgb(0 0 0 / 0.07)),
    var(--ce-paper, none) center / cover,
    var(--ce-ivory);
}
.ce-hero__bottom {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 50%;
  z-index: 2;
  border: 1px solid color-mix(in srgb, var(--ce-ink) 55%, transparent);
  border-top: 0;
  box-shadow: 0 1rem 2rem rgb(0 0 0 / 0.35);
}
.ce-hero__bottom::before {
  content: '';
  position: absolute;
  inset: 0.45rem;
  border: 1px dashed color-mix(in srgb, var(--ce-ink) 45%, transparent);
  border-top: 0;
}
.ce-hero__top {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 50%;
  z-index: 3;
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  will-change: transform;
}
.ce-hero__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border: 1px solid color-mix(in srgb, var(--ce-ink) 55%, transparent);
  border-bottom: 0;
}
.ce-hero__face--front::before {
  content: '';
  position: absolute;
  inset: 0.45rem;
  border: 1px dashed color-mix(in srgb, var(--ce-ink) 45%, transparent);
  border-bottom: 0;
}
/* La tira de encaje de la costura: cuelga bajo la mitad de arriba. */
.ce-hero__face--front::after {
  content: '';
  position: absolute;
  left: -1px;
  right: -1px;
  top: 100%;
  height: 2.2rem;
  background: var(--ce-ivory);
  -webkit-mask: var(--ce-lace) 0 0 / auto 100% repeat-x;
  mask: var(--ce-lace) 0 0 / auto 100% repeat-x;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.25));
}
/* El forro (se ve cuando la mitad ya se levantó): más cálido y con sombra hacia la costura. */
.ce-hero__face--back {
  transform: rotateX(180deg);
  background:
    linear-gradient(to top, rgb(0 0 0 / 0.16), transparent 60%),
    color-mix(in srgb, var(--color-panel-warm, #f8f1e3) 70%, var(--ce-ivory));
}

/* La costura: una sombra fina que parte el sobre de lado a lado. */
.ce-hero__bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 0.7rem;
  background: linear-gradient(rgb(0 0 0 / 0.18), transparent);
}

/* Placa con el nombre de la familia, bajo la perla. */
.ce-hero__plate {
  position: absolute;
  left: 50%;
  top: 62%;
  z-index: 4;
  max-width: 70%;
  margin: 0;
  padding: 0.3rem 0.9rem;
  translate: -50% 0;
  border: 1px solid var(--ce-ink);
  background: var(--ce-ivory);
  color: var(--t-to-color, var(--ce-ink));
  font-family: var(--t-to-font, var(--font-caps));
  font-size: calc(clamp(0.72rem, 3.6cqi, 0.95rem) * var(--t-to-size, 1));
  letter-spacing: 0.14em;
  text-align: center;
  box-shadow: 0 0.2rem 0.6rem rgb(0 0 0 / 0.25);
}

/* La perla (o el lacre) sobre la costura, al centro. */
.ce-hero__seal {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 5;
  width: 22%;
  aspect-ratio: 1;
  translate: -50% -50%;
  display: grid;
  place-items: center;
}
.ce-hero__seal img {
  width: 100%;
  filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.4));
}
.ce-hero__pearl {
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, #f1ebdb 45%, #b7ad95 100%);
  box-shadow:
    0 2px 6px rgb(0 0 0 / 0.4),
    0 0 0 3px color-mix(in srgb, var(--ce-ink) 35%, transparent);
}

/* El botón de llamada. */
.ce-hero__call {
  padding: 0.5rem 1.1rem;
  border: 0;
  background: none;
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(clamp(0.95rem, 4.4cqi, 1.15rem) * var(--t-button-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-primary));
  cursor: pointer;
  animation: ce-call calc(2s * var(--motion-scale)) ease-in-out infinite;
}
.ce-hero__call:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 999px;
}
@keyframes ce-call {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/*
 * Al abrir (a velocidad 1): 0 a 0.45 s la perla salta; de 0.3 a 1.6 s la mitad de arriba se
 * levanta sobre la costura; de 0.4 s en adelante la luz se enciende; de 0.9 a 2.3 s la tarjeta
 * sube; de 1.5 a 2.5 s la mitad de abajo baja y se desvanece.
 */
.ce-hero--opening .ce-hero__seal {
  animation: ce-seal calc(0.45s * var(--motion-scale)) ease-in forwards;
}
.ce-hero--opening .ce-hero__plate {
  animation: ce-fade calc(0.4s * var(--motion-scale)) ease-in forwards;
}
.ce-hero--opening .ce-hero__top {
  animation: ce-flap calc(1.4s * var(--motion-scale)) cubic-bezier(0.5, 0, 0.2, 1)
    calc(0.3s * var(--motion-scale)) forwards;
}
.ce-hero--opening .ce-hero__glow {
  animation: ce-glow calc(1.8s * var(--motion-scale)) ease-out calc(0.4s * var(--motion-scale))
    forwards;
}
.ce-hero--opening .ce-hero__card {
  animation: ce-rise calc(1.5s * var(--motion-scale)) var(--ease-out) calc(0.9s * var(--motion-scale))
    both;
}
.ce-hero--opening .ce-hero__bottom {
  animation: ce-away calc(1s * var(--motion-scale)) ease-in calc(1.5s * var(--motion-scale))
    forwards;
}
@keyframes ce-seal {
  40% {
    transform: scale(1.18);
  }
  to {
    opacity: 0;
    transform: scale(0.2);
  }
}
@keyframes ce-fade {
  to {
    opacity: 0;
  }
}
/* Se levanta sobre la costura hasta quedar de canto (a 90° ya no se ve) y se desvanece. */
@keyframes ce-flap {
  0% {
    transform: rotateX(0deg);
  }
  65% {
    transform: rotateX(-78deg);
    opacity: 1;
  }
  100% {
    transform: rotateX(-96deg);
    opacity: 0;
  }
}
@keyframes ce-glow {
  0% {
    opacity: 0;
  }
  45% {
    opacity: 1;
  }
  100% {
    opacity: 0.55;
  }
}
@keyframes ce-rise {
  0% {
    transform: translateY(3%) scale(0.9);
  }
  65% {
    transform: translateY(-7%) scale(1.03);
  }
  100% {
    transform: none;
  }
}
@keyframes ce-away {
  to {
    transform: translateY(70%);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ce-hero__call {
    animation: none;
  }
}
</style>
