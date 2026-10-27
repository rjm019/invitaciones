<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
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
 * Portada "telón": un telón de terciopelo (dos mitades con pliegues verticales) cerrado
 * sobre un paisaje pintado, con el cortinaje de gasa y perlas arriba y la tela arrugada al
 * pie. Al tocar: empieza la música y cada mitad se recoge hacia su lado (transform), y
 * detrás aparece el paisaje con el nombre y el salón. Mientras está cerrado la página no
 * hace scroll. Con "menos movimiento" ya aparece abierta; en el gestor se ve abierta, salvo
 * en "Ver como invitado". Sirve en cualquier tema: el color del telón sale de la paleta y
 * cada pieza (paisaje, cortinaje, tela, pliegues, alcatraces) es una ranura de adorno.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const decor = computed(() => props.section.decor)
const landscape = computed(() => resolveAsset.value(props.section.image ?? null))
const sceneImage = computed(() =>
  landscape.value ?? decorOr(decor.value, 'landscape', resolveAsset.value('paisaje.svg')),
)
const valance = computed(() => decorOr(decor.value, 'valance', resolveAsset.value('cortinaje.svg')))
const folds = computed(() => decorOr(decor.value, 'folds', resolveAsset.value('pliegues.svg')))
const fabric = computed(() => decorOr(decor.value, 'curtain', null))
const cloth = computed(() => decorOr(decor.value, 'cloth', resolveAsset.value('tela-pie.svg')))
const lily = computed(() => decorOr(decor.value, 'lily', resolveAsset.value('alcatraz.svg')))

const phase = ref<'closed' | 'opening' | 'open'>(
  !reduced.value || !!preview.value
    ? preview.value?.envelopeOpen
      ? 'open'
      : 'closed'
    : 'open',
)
useScrollLock(() => phase.value === 'closed')

// Al abrir, la portada deja de ocupar toda la pantalla: el telón se queda donde estaba.
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
  ...(sceneImage.value ? { '--cr-scene': `url("${sceneImage.value}")` } : {}),
  ...(folds.value ? { '--cr-folds': `url("${folds.value}")` } : {}),
  ...(fabric.value ? { '--cr-fabric': `url("${fabric.value}")` } : {}),
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
  // por si animationend no llega (el telón se recoge en ~2 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 2300 * motionScale())
}
function onDrawEnd(e: AnimationEvent) {
  if (e.animationName.includes('cr-draw')) phase.value = 'open'
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="cr-hero"
    :class="[`cr-hero--${phase}`, { 'cr-hero--pinned': lift !== null }]"
    :style="heroStyle"
  >
    <div ref="stage" class="cr-hero__stage" @click="open">
      <div class="cr-hero__frame" :style="frameStyle">
        <div class="cr-hero__scene">
          <img v-if="lily" :src="lily" alt="" class="cr-hero__lily cr-hero__lily--left" />
          <img v-if="lily" :src="lily" alt="" class="cr-hero__lily cr-hero__lily--right" />
          <div class="cr-hero__text">
            <p v-if="event.subtitle" class="cr-hero__subtitle" data-text="subtitle">
              {{ event.subtitle }}
            </p>
            <h1 class="cr-hero__name" data-text="name">{{ name }}</h1>
            <p v-if="event.venue.name || event.venue.city" class="cr-hero__venue" data-text="place">
              <span v-if="event.venue.name">{{ event.venue.name }}</span>
              <span v-if="event.venue.city">{{ event.venue.city }}</span>
            </p>
          </div>
        </div>

        <span class="cr-hero__half cr-hero__half--left" @animationend="onDrawEnd" />
        <span class="cr-hero__half cr-hero__half--right" />
        <p v-if="family && phase !== 'open'" class="cr-hero__plate" data-text="to">{{ family }}</p>

        <img v-if="cloth" :src="cloth" alt="" class="cr-hero__cloth" />
        <div
          v-if="valance"
          class="cr-hero__valance"
          :style="{ backgroundImage: `url('${valance}')` }"
          aria-hidden="true"
        />
      </div>
    </div>

    <button
      v-if="phase === 'closed'"
      type="button"
      class="cr-hero__call hero__open"
      data-text="button"
      @click="open"
    >
      <span class="cr-hero__pearl" aria-hidden="true" />
      {{ section.button ?? 'Toca para abrir' }}
    </button>
  </div>
</template>

<style scoped>
.cr-hero {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.cr-hero--closed,
.cr-hero--opening {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.cr-hero--pinned {
  place-content: start center;
  padding-top: var(--hero-lift);
}
.cr-hero__stage {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100cqi, 22rem);
}
.cr-hero--closed .cr-hero__stage {
  cursor: pointer;
}

/* El escenario: el telón corre por dentro de este marco. */
.cr-hero__frame {
  --cr-cloth: var(--color-curtain, color-mix(in srgb, var(--color-primary-strong, #5f6b4f) 55%, #000));
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  outline: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  outline-offset: 5px;
  box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.5);
  background: var(--cr-cloth);
}
/* El paisaje (pintado) y una sombra abajo para que el nombre se lea. */
.cr-hero__scene {
  position: absolute;
  inset: 0;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24% 7% 22%;
  text-align: center;
  background:
    linear-gradient(to top, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0) 55%, rgb(0 0 0 / 0.25)),
    var(--cr-scene, linear-gradient(#b9cde0, #f2dcc7 55%, #7d9a5a)) center / cover no-repeat;
}
.cr-hero__text {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-shadow: 0 1px 12px rgb(0 0 0 / 0.55);
}
.cr-hero__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-script-mono));
  font-size: calc(11cqi * var(--t-subtitle-size, 1));
  line-height: 1.2;
  color: var(--t-subtitle-color, var(--color-text));
}
.cr-hero__name {
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
  color: var(--t-name-color, var(--color-text));
  overflow-wrap: anywhere;
}
.cr-hero__venue {
  display: grid;
  margin: 0;
  font-family: var(--t-place-font, var(--font-script-mono));
  font-size: calc(8cqi * var(--t-place-size, 1));
  line-height: 1.15;
  color: var(--t-place-color, var(--color-text));
}

/* Alcatraces en el piso, a los lados del paisaje. */
.cr-hero__lily {
  position: absolute;
  bottom: 2%;
  width: 24%;
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
}
.cr-hero__lily--left {
  left: 3%;
  transform: rotate(-6deg);
}
.cr-hero__lily--right {
  right: 3%;
  transform: scaleX(-1) rotate(-4deg);
}

/* Cada mitad del telón: la tela del color de la paleta, con sus pliegues encima. */
.cr-hero__half {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  z-index: 2;
  background:
    var(--cr-folds, none) 0 0 / 120px 100% repeat-x,
    var(--cr-fabric, linear-gradient(var(--cr-cloth), var(--cr-cloth)));
  background-blend-mode: normal;
  will-change: transform;
}
.cr-hero__half--left {
  left: 0;
  transform-origin: left center;
  border-right: 1px solid rgb(0 0 0 / 0.35);
}
.cr-hero__half--right {
  right: 0;
  transform-origin: right center;
  border-left: 1px solid rgb(0 0 0 / 0.35);
}
/* Recogido: cada mitad queda como una columna de tela a su lado. */
.cr-hero--open .cr-hero__half {
  transform: scaleX(0.16);
}

/* Placa con el nombre de la familia, sobre el telón cerrado. */
.cr-hero__plate {
  position: absolute;
  left: 50%;
  top: 56%;
  z-index: 3;
  max-width: 70%;
  margin: 0;
  padding: 0.35rem 0.9rem;
  translate: -50% 0;
  border: 1px solid var(--color-primary);
  background: linear-gradient(180deg, var(--color-primary-soft), var(--color-primary));
  color: var(--t-to-color, var(--color-bg));
  font-family: var(--t-to-font, var(--font-caps));
  font-size: calc(clamp(0.72rem, 3.6cqi, 0.95rem) * var(--t-to-size, 1));
  letter-spacing: 0.14em;
  text-align: center;
  box-shadow: 0 0.3rem 0.8rem rgb(0 0 0 / 0.4);
}

/* Tela arrugada al pie y cortinaje arriba: quietos, por encima del telón. */
.cr-hero__cloth {
  position: absolute;
  left: 0;
  bottom: -1px;
  z-index: 3;
  width: 100%;
  height: 16%;
  object-fit: fill;
  pointer-events: none;
}
.cr-hero__valance {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  width: 100%;
  height: 25%;
  background: center top / auto 100% repeat-x;
  filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.35));
  pointer-events: none;
}

/* El botón de llamada: una perla que late junto al texto. */
.cr-hero__call {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 1.1rem;
  border: 0;
  background: none;
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(clamp(0.95rem, 4.4cqi, 1.15rem) * var(--t-button-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-primary));
  cursor: pointer;
}
.cr-hero__pearl {
  width: 1.1rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, #f1ebdb 45%, #b7ad95 100%);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
  animation: cr-pearl calc(2s * var(--motion-scale)) ease-in-out infinite;
}
.cr-hero__call:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 999px;
}
@keyframes cr-pearl {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Al abrir: cada mitad se recoge hacia su lado; el paisaje asoma. */
.cr-hero--opening .cr-hero__half--left {
  animation: cr-draw calc(1.7s * var(--motion-scale)) cubic-bezier(0.55, 0, 0.25, 1)
    calc(0.4s * var(--motion-scale)) forwards;
}
.cr-hero--opening .cr-hero__half--right {
  animation: cr-draw calc(1.7s * var(--motion-scale)) cubic-bezier(0.55, 0, 0.25, 1)
    calc(0.4s * var(--motion-scale)) forwards;
}
.cr-hero--opening .cr-hero__plate {
  animation: cr-plate-off calc(0.4s * var(--motion-scale)) ease-in forwards;
}
.cr-hero--opening .cr-hero__scene {
  animation: cr-scene calc(2.1s * var(--motion-scale)) var(--ease-out) forwards;
}
@keyframes cr-draw {
  to {
    transform: scaleX(0.16);
  }
}
@keyframes cr-plate-off {
  to {
    opacity: 0;
  }
}
@keyframes cr-scene {
  0%,
  30% {
    opacity: 0.7;
    transform: scale(1.06);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cr-hero__pearl {
    animation: none;
  }
}
</style>
