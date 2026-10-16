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
 * Portada de Nueva York ("elevador"): la invitación llega en un elevador art déco. Cerrado,
 * se ven las puertas (con el nombre de la familia en su placa, si es un enlace personal),
 * el indicador de piso arriba y el botón de llamada. Al tocar: empieza la música, la aguja
 * recorre los pisos, las puertas se abren y adentro está la tarjeta con el nombre. Mientras
 * está cerrado la página no hace scroll. Con "menos movimiento" ya aparece abierto; en el
 * gestor se ve abierto, salvo en "Ver como invitado".
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const decor = computed(() => props.section.decor)
// La puerta del tema o, si no trae una, la art déco compartida (themes/_shared).
const door = computed(() => decorOr(decor.value, 'door', resolveAsset.value('puerta.svg')))
const hasDoors = computed(() => !!door.value)
const phase = ref<'closed' | 'opening' | 'open'>(
  hasDoors.value && (!reduced.value || !!preview.value) && !preview.value?.envelopeOpen
    ? 'closed'
    : 'open',
)
useScrollLock(() => phase.value === 'closed')

// Al abrir, la portada deja de ocupar toda la pantalla: el elevador se queda donde estaba.
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
const cabinStyle = computed(() => ({
  ...(decor.value.card ? { backgroundImage: `url("${decor.value.card}")` } : {}),
  '--hero-name-chars': String(longestWord.value),
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
  // por si animationend no llega (aguja y puertas: 2 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 2200 * motionScale())
}
function onDoorsOpen(e: AnimationEvent) {
  if (e.animationName.includes('ny-door')) phase.value = 'open'
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="ny-hero"
    :class="[`ny-hero--${phase}`, { 'ny-hero--pinned': lift !== null }]"
    :style="heroStyle"
  >
    <div ref="stage" class="ny-hero__stage" @click="open">
      <div class="ny-hero__dial" aria-hidden="true">
        <span class="ny-hero__needle" />
      </div>

      <div class="ny-hero__frame">
        <div class="ny-hero__cabin" :style="cabinStyle">
          <img v-if="decor.crown" :src="decor.crown" alt="" class="ny-hero__crown" />
          <p v-if="event.subtitle" class="ny-hero__subtitle" data-text="subtitle">
            {{ event.subtitle }}
          </p>
          <h1 class="ny-hero__name" data-text="name">{{ name }}</h1>
          <p v-if="event.venue.name || event.venue.city" class="ny-hero__venue" data-text="place">
            <span v-if="event.venue.name">{{ event.venue.name }}</span>
            <span v-if="event.venue.city">{{ event.venue.city }}</span>
          </p>
        </div>

        <template v-if="hasDoors && phase !== 'open'">
          <img
            :src="door!"
            alt=""
            class="ny-hero__door ny-hero__door--left"
            @animationend="onDoorsOpen"
          />
          <img :src="door!" alt="" class="ny-hero__door ny-hero__door--right" />
          <p v-if="family" class="ny-hero__plate" data-text="to">{{ family }}</p>
        </template>
      </div>
    </div>

    <button
      v-if="phase === 'closed'"
      type="button"
      class="ny-hero__call hero__open"
      data-text="button"
      @click="open"
    >
      <span class="ny-hero__light" aria-hidden="true" />
      {{ section.button ?? 'Toca para abrir' }}
    </button>
  </div>
</template>

<style scoped>
.ny-hero {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.ny-hero--closed,
.ny-hero--opening {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.ny-hero--pinned {
  place-content: start center;
  padding-top: var(--hero-lift);
}
.ny-hero__stage {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100cqi, 22rem);
}
.ny-hero--closed .ny-hero__stage {
  cursor: pointer;
}

/* El indicador de piso: medio círculo con sus marcas y una aguja que recorre los pisos. */
.ny-hero__dial {
  position: relative;
  width: 44%;
  aspect-ratio: 2 / 1;
  margin-bottom: 0.6rem;
}
/* El arco con sus marcas (máscara de anillo); la aguja y su eje van encima, sin máscara. */
.ny-hero__dial::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--color-primary);
  border-bottom: 0;
  border-radius: 999px 999px 0 0;
  background: repeating-conic-gradient(
    from -90deg at 50% 100%,
    color-mix(in srgb, var(--color-primary) 80%, transparent) 0 1.2deg,
    transparent 1.2deg 22.5deg
  );
  -webkit-mask: radial-gradient(circle at 50% 100%, transparent 0 62%, #000 63%);
  mask: radial-gradient(circle at 50% 100%, transparent 0 62%, #000 63%);
}
.ny-hero__needle {
  position: absolute;
  left: calc(50% - 1px);
  bottom: 0;
  width: 2px;
  height: 92%;
  transform-origin: 50% 100%;
  transform: rotate(-72deg);
  background: linear-gradient(to top, var(--color-primary-soft), var(--color-primary-strong));
}
/* El eje de la aguja. */
.ny-hero__dial::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -0.35rem;
  width: 0.7rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: var(--color-primary-strong);
}

/* El marco de la puerta: doble filo plateado; las puertas se esconden en la pared. */
.ny-hero__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  outline: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  outline-offset: 5px;
  box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.55);
}
.ny-hero__cabin {
  position: absolute;
  inset: 0;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 13% 7% 9%;
  text-align: center;
  background: var(--color-surface) center / cover no-repeat;
}
.ny-hero__crown {
  width: 16%;
}
.ny-hero__subtitle {
  margin: 2% 0 0;
  font-family: var(--t-subtitle-font, var(--font-script-mono));
  font-size: calc(13cqi * var(--t-subtitle-size, 1));
  line-height: 1.2;
  color: var(--t-subtitle-color, var(--color-primary));
}
.ny-hero__name {
  flex: 1;
  display: grid;
  place-items: center;
  max-width: 100%;
  margin: 0;
  font-family: var(--t-name-font, var(--font-script));
  font-weight: 400;
  font-size: min(
    calc(clamp(2.5rem, 40cqi, 10rem) * var(--t-name-size, 1)),
    calc(190cqi / var(--hero-name-chars, 1))
  );
  line-height: 1;
  color: var(--t-name-color, var(--color-primary));
  overflow-wrap: anywhere;
}
.ny-hero__venue {
  display: grid;
  margin: 0;
  font-family: var(--t-place-font, var(--font-script-mono));
  font-size: calc(10cqi * var(--t-place-size, 1));
  line-height: 1.15;
  color: var(--t-place-color, var(--color-primary));
}
.ny-hero__door {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  object-fit: fill;
  z-index: 1;
}
.ny-hero__door--left {
  left: 0;
}
.ny-hero__door--right {
  right: 0;
  scale: -1 1;
}
/* Placa con el nombre de la familia, sobre las puertas cerradas. */
.ny-hero__plate {
  position: absolute;
  left: 50%;
  top: 64%;
  z-index: 2;
  max-width: 70%;
  margin: 0;
  padding: 0.35rem 0.9rem;
  translate: -50% 0;
  border: 1px solid var(--color-primary);
  background: linear-gradient(180deg, var(--color-primary-soft), var(--color-primary));
  color: var(--t-to-color, var(--color-bg));
  font-family: var(--t-to-font, var(--font-caps));
  font-size: calc(clamp(0.72rem, 3.6cqi, 0.9rem) * var(--t-to-size, 1));
  letter-spacing: 0.16em;
  text-align: center;
  text-transform: uppercase;
  box-shadow: 0 0.3rem 0.8rem rgb(0 0 0 / 0.4);
}

/* El botón de llamada: un foco que late junto al texto. */
.ny-hero__call {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 1.1rem;
  border: 0;
  background: none;
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(clamp(0.85rem, 4.2cqi, 1.05rem) * var(--t-button-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-primary));
  cursor: pointer;
}
.ny-hero__light {
  width: 1.6rem;
  aspect-ratio: 1;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 18%, var(--color-primary-soft) 45%, transparent 70%);
  animation: ny-call calc(1.8s * var(--motion-scale)) ease-in-out infinite;
}
.ny-hero__call:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 999px;
}
@keyframes ny-call {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

/* Al abrir: la aguja llega al piso, y las puertas se abren hacia los lados. */
.ny-hero--opening .ny-hero__needle,
.ny-hero--open .ny-hero__needle {
  transform: rotate(72deg);
}
.ny-hero--opening .ny-hero__needle {
  transition: transform calc(0.8s * var(--motion-scale)) var(--ease-out);
}
.ny-hero--opening .ny-hero__door--left {
  animation: ny-door-left calc(1.3s * var(--motion-scale)) cubic-bezier(0.6, 0, 0.3, 1)
    calc(0.7s * var(--motion-scale)) forwards;
}
.ny-hero--opening .ny-hero__door--right {
  animation: ny-door-right calc(1.3s * var(--motion-scale)) cubic-bezier(0.6, 0, 0.3, 1)
    calc(0.7s * var(--motion-scale)) forwards;
}
.ny-hero--opening .ny-hero__plate {
  animation: ny-plate-off calc(0.5s * var(--motion-scale)) ease-in forwards;
}
.ny-hero--opening .ny-hero__cabin {
  animation: ny-cabin calc(2s * var(--motion-scale)) var(--ease-out) forwards;
}
@keyframes ny-door-left {
  to {
    transform: translateX(-101%);
  }
}
/* La derecha está volteada (scale: -1 1): para irse a la derecha se mueve "hacia atrás". */
@keyframes ny-door-right {
  to {
    transform: translateX(-101%);
  }
}
@keyframes ny-plate-off {
  to {
    opacity: 0;
  }
}
@keyframes ny-cabin {
  0%,
  35% {
    opacity: 0.55;
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ny-hero__light {
    animation: none;
  }
}
</style>
