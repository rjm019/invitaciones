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
 * Portada de Nueva York ("estatua"): la Estatua de la Libertad de frente, cerrada sobre la
 * tarjeta (con el nombre de la familia en una placa, si es un enlace personal). Al tocar:
 * empieza la música y la estatua se parte por el centro, cada mitad hacia su lado, y
 * detrás aparece la tarjeta con la foto (la `imagen` de la portada, si hay) y el nombre.
 * Mientras está cerrada la página no hace scroll. Con "menos movimiento" ya aparece
 * abierta; en el gestor se ve abierta, salvo en "Ver como invitado".
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const decor = computed(() => props.section.decor)
// La estatua del tema; sin ella la portada se queda abierta.
const statue = computed(() => decorOr(decor.value, 'statue', resolveAsset.value('estatua-portada.svg')))
const hasStatue = computed(() => !!statue.value)
const photo = computed(() => resolveAsset.value(props.section.image ?? null))
const phase = ref<'closed' | 'opening' | 'open'>(
  hasStatue.value && (!reduced.value || !!preview.value) && !preview.value?.envelopeOpen
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
// Con foto: la foto de fondo y una sombra abajo para que el nombre se lea.
const cabinStyle = computed(() => {
  const image = photo.value
    ? `linear-gradient(to top, rgb(0 0 0 / 0.78), rgb(0 0 0 / 0.1) 55%, rgb(0 0 0 / 0.35)), url("${photo.value}")`
    : decor.value.card
      ? `url("${decor.value.card}")`
      : null
  return { ...(image ? { backgroundImage: image } : {}), '--hero-name-chars': String(longestWord.value) }
})

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
  // por si animationend no llega (la estatua se parte en ~2 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 2200 * motionScale())
}
function onSplitEnd(e: AnimationEvent) {
  if (e.animationName.includes('ny-statue')) phase.value = 'open'
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

        <template v-if="hasStatue && phase !== 'open'">
          <span class="ny-hero__half ny-hero__half--left" @animationend="onSplitEnd">
            <img :src="statue!" alt="" class="ny-hero__statue" />
          </span>
          <span class="ny-hero__half ny-hero__half--right">
            <img :src="statue!" alt="" class="ny-hero__statue" />
          </span>
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

/* El marco: doble filo plateado; las mitades de la estatua se van por los lados. */
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
/* Cada mitad enseña la mitad de la misma estatua: la imagen mide el doble y se recorta. */
.ny-hero__half {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}
.ny-hero__half--left {
  left: 0;
}
.ny-hero__half--right {
  right: 0;
}
.ny-hero__statue {
  display: block;
  width: 200%;
  max-width: none;
  height: 100%;
  object-fit: fill;
}
.ny-hero__half--right .ny-hero__statue {
  margin-left: -100%;
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

/* Al abrir: la estatua se parte y cada mitad sale hacia su lado. */
.ny-hero--opening .ny-hero__half--left {
  animation: ny-statue-left calc(1.4s * var(--motion-scale)) cubic-bezier(0.6, 0, 0.3, 1)
    calc(0.5s * var(--motion-scale)) forwards;
}
.ny-hero--opening .ny-hero__half--right {
  animation: ny-statue-right calc(1.4s * var(--motion-scale)) cubic-bezier(0.6, 0, 0.3, 1)
    calc(0.5s * var(--motion-scale)) forwards;
}
.ny-hero--opening .ny-hero__plate {
  animation: ny-plate-off calc(0.5s * var(--motion-scale)) ease-in forwards;
}
.ny-hero--opening .ny-hero__cabin {
  animation: ny-cabin calc(2s * var(--motion-scale)) var(--ease-out) forwards;
}
@keyframes ny-statue-left {
  to {
    transform: translateX(-101%);
  }
}
@keyframes ny-statue-right {
  to {
    transform: translateX(101%);
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
