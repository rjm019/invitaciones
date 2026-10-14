<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useCelebration } from '@/composables/useCelebration'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useScrollLock } from '@/composables/useScrollLock'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada: la tarjeta está guardada en el sobre. Al tocar, sale del sobre, queda al
 * frente y empieza la música (los navegadores solo dejan sonar audio después de un toque).
 * Mientras el sobre está cerrado la página no hace scroll y la portada ocupa la pantalla.
 * Ya abierto, la portada se ajusta a su contenido: la tarjeta se queda donde está y lo de
 * abajo sube, para que el espacio hasta la siguiente sección sea el mismo de todas. Con
 * "menos movimiento" la tarjeta ya aparece afuera.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()

const decor = computed(() => props.section.decor)
const hasEnvelope = computed(() => !!decor.value.envelope)
const phase = ref<'closed' | 'opening' | 'open'>(
  hasEnvelope.value && !reduced.value ? 'closed' : 'open',
)
useScrollLock(() => phase.value === 'closed')

// Distancia de la portada a la tarjeta en el momento de abrir: se conserva como margen
// para que la tarjeta no brinque cuando la portada deja de ocupar toda la pantalla.
const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const lift = ref<number | null>(null)
const heroStyle = computed(() =>
  lift.value === null ? undefined : { '--hero-lift': `${lift.value}px` },
)

const name = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
// En un enlace personal, el sobre lleva el nombre que el dueño le puso a la invitación.
const family = computed(() => invitation?.invitation.value?.label ?? null)
const cardStyle = computed(() =>
  decor.value.card ? { backgroundImage: `url("${decor.value.card}")` } : {},
)

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
  celebration?.celebrate('stars') // estrellitas doradas mientras sale la tarjeta
  phase.value = 'opening'
  // por si animationend no llega (la animación dura 1.5 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 1700 * motionScale())
}
function onAnimationEnd(e: AnimationEvent) {
  if (e.animationName.includes('hero-card')) phase.value = 'open'
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="hero"
    :class="[
      `hero--${phase}`,
      { 'hero--no-envelope': !hasEnvelope, 'hero--pinned': lift !== null },
    ]"
    :style="heroStyle"
  >
    <div ref="stage" class="hero__stage" @click="open">
      <img v-if="decor.flowers" :src="decor.flowers" alt="" class="hero__flowers decor-float" />

      <div class="hero__envelope">
        <img v-if="decor.envelope" :src="decor.envelope" alt="" class="hero__envelope-back" />

        <div class="hero__card" :style="cardStyle" @animationend="onAnimationEnd">
          <img v-if="decor.crown" :src="decor.crown" alt="" class="hero__crown" />
          <p v-if="event.subtitle" class="hero__subtitle">{{ event.subtitle }}</p>
          <h1 class="hero__name">{{ name }}</h1>
          <p v-if="event.venue.name || event.venue.city" class="hero__venue">
            <span v-if="event.venue.name">{{ event.venue.name }}</span>
            <span v-if="event.venue.city">{{ event.venue.city }}</span>
          </p>
        </div>

        <!-- La bolsa del sobre, recortada, va enfrente de la tarjeta: así parece guardada adentro. -->
        <template v-if="decor.envelope">
          <img :src="decor.envelope" alt="" class="hero__pocket" aria-hidden="true" />
          <p v-if="family" class="hero__to">{{ family }}</p>
          <img v-if="decor.seal" :src="decor.seal" alt="" class="hero__seal" />
        </template>
      </div>

      <img
        v-if="decor.butterflies"
        :src="decor.butterflies"
        alt=""
        class="hero__butterflies decor-float"
      />
    </div>

    <button v-if="phase === 'closed'" type="button" class="hero__open" @click="open">
      {{ section.button ?? 'Toca para abrir' }}
    </button>
  </div>
</template>

<style scoped>
/*
 * Medidas tomadas del diseño original (columna de 430 px de sobre): todo en % del
 * escenario para que escale igual en un celular de 360 px que en una computadora.
 */
.hero {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
/* Sobre cerrado: la portada llena la pantalla (menos el espacio de arriba y el de abajo). */
.hero--closed {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
/* Abriendo: la tarjeta se queda en su lugar aunque se vaya el botón. */
.hero--opening {
  min-height: calc(100svh - 2 * var(--section-gap));
}
.hero--pinned {
  padding-top: var(--hero-lift);
}
.hero__stage {
  position: relative;
  width: min(100cqi, 28rem);
  aspect-ratio: 430 / 530;
}
.hero--closed .hero__stage {
  cursor: pointer;
}
.hero__flowers {
  position: absolute;
  left: 2.3%;
  top: 0;
  width: 46.5%;
  rotate: 180deg; /* como en el diseño: rosas arriba y hojas cayendo por la orilla */
  z-index: 3;
  pointer-events: none;
}
.hero__butterflies {
  position: absolute;
  left: 68.6%;
  top: 75.5%;
  width: 31.4%;
  z-index: 3;
  pointer-events: none;
}
/* Recorta abajo (la tarjeta guardada no debe asomar bajo el sobre), nunca arriba. */
.hero__envelope {
  position: absolute;
  inset: 0;
  clip-path: inset(-60% -20% 0 -20%);
}
.hero__envelope-back,
.hero__pocket {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
}
/* Solo la bolsa: debajo de las solapas laterales y de la de abajo (sobre de 561×668). */
.hero__pocket {
  z-index: 2;
  clip-path: polygon(0 43%, 33% 69.2%, 66.8% 69.2%, 100% 44.2%, 100% 100%, 0 100%);
}

.hero__card {
  position: absolute;
  left: 7%;
  top: 9.4%;
  width: 83.7%;
  height: 76.4%;
  z-index: 1;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12% 5% 7%;
  text-align: center;
  background: var(--color-surface) center / cover no-repeat;
  box-shadow: var(--shadow-card);
}
.hero__crown {
  width: 17%;
}
.hero__subtitle {
  margin: 1% 0 0;
  font-family: var(--font-script-mono);
  font-size: 13cqi;
  line-height: 1.2;
  color: var(--color-primary);
}
.hero__name {
  flex: 1;
  display: grid;
  place-items: center;
  margin: 0;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2.5rem, 40cqi, 10rem);
  line-height: 1;
  color: var(--color-primary);
  /* Nombres largos (12 letras): se achican en vez de cortarse */
  max-width: 100%;
  overflow-wrap: anywhere;
}
.hero__venue {
  display: grid;
  margin: 0;
  font-family: var(--font-script-mono);
  font-size: 10cqi;
  line-height: 1.15;
  color: var(--color-primary);
}

.hero__to {
  position: absolute;
  left: 0;
  right: 0;
  top: 88%;
  z-index: 2;
  margin: 0;
  text-align: center;
  font-family: var(--font-script-mono);
  font-size: clamp(1.1rem, 6cqi, 1.6rem);
  color: var(--color-text);
}
.hero__seal {
  position: absolute;
  left: 40%;
  top: 63%;
  width: 20%;
  z-index: 2;
  filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.18));
}
.hero__open {
  padding: 0.5rem 1.2rem;
  border: 0;
  background: none;
  font-family: var(--font-script-mono);
  font-size: clamp(1.4rem, 7cqi, 2rem);
  color: var(--color-primary);
  cursor: pointer;
  animation: hero-hint calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.hero__open:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 999px;
}

/* Sobre cerrado: la tarjeta abajo, dentro de la bolsa. */
.hero--closed .hero__card {
  transform: translateY(40%);
}
.hero--open .hero__pocket,
.hero--open .hero__seal,
.hero--open .hero__to {
  opacity: 0;
}

/* Al abrir: el sello se va, la tarjeta sube, pasa al frente y se acomoda. */
.hero--opening .hero__card {
  animation: hero-card-out calc(1.5s * var(--motion-scale)) var(--ease-out) forwards;
}
.hero--opening .hero__pocket,
.hero--opening .hero__to {
  animation: hero-pocket-hide calc(1.5s * var(--motion-scale)) linear forwards;
}
.hero--opening .hero__seal {
  animation: hero-seal-off calc(0.45s * var(--motion-scale)) ease-in forwards;
}
@keyframes hero-card-out {
  0% {
    transform: translateY(40%);
  }
  55% {
    transform: translateY(-9%);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-pocket-hide {
  0%,
  45% {
    opacity: 1;
  }
  58%,
  100% {
    opacity: 0;
  }
}
@keyframes hero-seal-off {
  to {
    opacity: 0;
    transform: scale(1.3);
  }
}
@keyframes hero-hint {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

/* Sin sobre en el tema: solo la tarjeta. */
.hero--no-envelope .hero__card {
  inset: 0;
  width: 100%;
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .hero__open {
    animation: none;
  }
}
</style>
