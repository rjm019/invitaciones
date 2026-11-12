<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import handSvg from '@fortawesome/fontawesome-free/svgs/solid/hand-pointer.svg?raw'
import BabyPram from '@/components/ui/BabyPram.vue'
import FxText from '@/components/ui/FxText.vue'
import FlyingStork from '@/components/ui/FlyingStork.vue'
import PartyGoose from '@/components/ui/PartyGoose.vue'
import RibbonGarland from '@/components/ui/RibbonGarland.vue'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import { usePreview } from '@/composables/usePreview'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useScrollLock } from '@/composables/useScrollLock'
import { dateParts, hourMinute, time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada "medallón amarrado" (`lazo`). Cerrada es una hoja de papel crema con vichy rosa
 * arriba que se desvanece, una guirnalda de moño a todo lo ancho, el gansito sentado con sus
 * globos, el encabezado, el nombre en manuscrita y "Toca el moño". Al tocar empieza la música y:
 *
 * 1. la guirnalda se desata (se recoge al nudo) y el encabezado y el nombre se desvanecen;
 * 2. el nudo se va hacia arriba y el gansito sube flotando con sus globos hasta salir;
 * 3. la hoja se desvanece y el medallón ovalado crece sobre las rayas de la página;
 * 4. entran el encabezado, el nombre (en caligrafía, se traza) y el texto;
 * 5. la carriola entra rodando con el día a un lado y la hora al otro;
 * 6. el gansito de pie asoma por la esquina; al final cruza una cigüeña, una sola vez.
 *
 * Abierta, las colas del moñito, las ramitas y la carriola se mecen apenas. Mientras está
 * cerrada la página no hace scroll. Con "menos movimiento" (o en la vista previa del gestor)
 * ya aparece abierta y quieta, sin cigüeña. Todo con transform y opacity. Sirve en cualquier
 * tema: los dibujos toman el listón de `--color-primary` y las hojas de `--color-accent`.
 */
defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

type Phase = 'closed' | 'opening' | 'open'
const phase = ref<Phase>(
  !reduced.value || !!preview.value ? (preview.value?.envelopeOpen ? 'open' : 'closed') : 'open',
)
useScrollLock(() => phase.value === 'closed' || phase.value === 'opening')

/** Los pasos de la apertura (0 = cerrada, 6 = todo puesto). */
const step = ref(phase.value === 'open' ? 6 : 0)
const rolling = ref(false)
const stork = ref(false) // la cigüeña cruza al final, una sola vez

const name = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
const longestWord = computed(() =>
  Math.max(1, ...name.value.split(/\s+/).map((w) => Array.from(w).length)),
)
const family = computed(() => invitation?.invitation.value?.label ?? null)
const place = computed(() => event.value.venue.city || event.value.venue.name || '')
const parts = computed(() =>
  event.value.starts_at ? dateParts(event.value.starts_at, event.value.timezone) : null,
)
// "SÁB" / "20 FEB" y "4:00" / "PM": el día y la hora del evento, en dos renglones cada uno.
const day = computed(() =>
  parts.value
    ? {
        weekday: parts.value.weekday.slice(0, 3),
        date: `${parts.value.day} ${parts.value.month.slice(0, 3)}`,
      }
    : null,
)
const hour = computed(() => {
  if (!event.value.starts_at) return null
  const [clock = '', suffix = ''] = time12h(
    hourMinute(event.value.starts_at, event.value.timezone),
  ).split(' ')
  return { clock, suffix }
})

const monoSrc = computed(() => resolveAsset.value('mono-linea.svg'))
const sprigSrc = computed(() => resolveAsset.value('ramita.svg'))
const daisySrc = computed(() => resolveAsset.value('margarita.svg'))
const stageStyle = computed(() => ({
  '--hb-chars': String(longestWord.value),
  ...(monoSrc.value ? { '--hb-mono': `url("${monoSrc.value}")` } : {}),
}))
/*
 * Ramitas y margaritas: posición final (en % del escenario) y de dónde parten, detrás del
 * moño (dx, dy en cqi). `flip` voltea la ramita para que crezca hacia afuera del óvalo.
 */
const sprigs = [
  { k: 'a', left: -5, top: 84, width: 36, rotate: 10, flip: true, dx: 14, dy: -33 },
  { k: 'b', left: 70, top: 3, width: 34, rotate: -6, flip: false, dx: -11, dy: 30 },
]
const daisies = [
  { k: 'a', left: 2, top: 78, width: 11, rotate: -10, dx: 22, dy: -26 },
  { k: 'b', left: 20, top: 100, width: 9, rotate: 14, dx: 14, dy: -50 },
  { k: 'c', left: 86, top: 14, width: 11, rotate: 8, dx: -24, dy: 34 },
  { k: 'd', left: 72, top: 2, width: 8, rotate: -14, dx: -14, dy: 50 },
]

// Margaritas chicas y quietas de la hoja cerrada (en % de la hoja, ancho en cqi del escenario).
const coverDaisies = [
  { k: 'a', left: 5, top: 54, width: 9, rotate: -12 },
  { k: 'b', left: 85, top: 60, width: 8, rotate: 14 },
  { k: 'c', left: 78, top: 31, width: 6, rotate: -6 },
]

// Al abrir, la portada deja de ocupar toda la pantalla: la escena se queda donde estaba.
const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const lift = ref<number | null>(null)
const heroStyle = computed(() =>
  lift.value === null ? undefined : { '--hero-lift': `${lift.value}px` },
)

const timers: ReturnType<typeof setTimeout>[] = []
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms * motionScale()))

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
    step.value = 6
    phase.value = 'open'
    return
  }
  phase.value = 'opening'
  step.value = 1 // la guirnalda se desata
  later(500, () => (step.value = 2)) // el nudo se va y el ganso sube
  later(1500, () => (step.value = 3)) // la hoja se va y el óvalo crece
  later(2200, () => (step.value = 4)) // los textos
  later(2900, () => {
    step.value = 5 // la carriola rueda
    rolling.value = true
  })
  later(4450, () => (rolling.value = false))
  later(4000, () => (step.value = 6)) // el gansito asoma
  later(4300, () => (stork.value = true)) // la cigüeña cruza
  later(5200, () => (phase.value = 'open'))
  later(7700, () => (stork.value = false))
}
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div
    ref="root"
    class="hb"
    :class="[
      `hb--${phase}`,
      {
        'hb--pinned': lift !== null,
        'is-untied': step >= 1,
        'is-lift': step >= 2,
        'is-grown': step >= 3,
        'is-texts': step >= 4,
        'is-pram': step >= 5,
        'is-goose': step >= 6,
      },
    ]"
    :style="heroStyle"
  >
    <div ref="stage" class="hb__stage" :style="stageStyle" @click="open">
      <!-- La hoja cerrada: papel crema con vichy arriba, guirnalda, globos y el ganso sentado. -->
      <div v-if="phase !== 'open'" class="hb__sheet" aria-hidden="true">
        <span class="hb__sheet-paper" />
        <div class="hb__garland">
          <RibbonGarland
            :tied="step < 1"
            :sway="phase === 'closed'"
            size="lg"
            tone="var(--color-primary-strong, var(--color-primary))"
          />
        </div>
        <span class="hb__loose hb__loose--a" />
        <span class="hb__loose hb__loose--b" />
        <span class="hb__loose hb__loose--c" />
        <img
          v-for="d in coverDaisies"
          v-show="daisySrc"
          :key="`c${d.k}`"
          :src="daisySrc ?? undefined"
          alt=""
          class="hb__cover-daisy"
          :style="{ left: `${d.left}%`, top: `${d.top}%`, width: `${d.width}cqi`, '--r': `${d.rotate}deg` }"
        />
        <span class="hb__goose-shadow" />
        <div class="hb__cover-goose">
          <div class="hb__cover-goose-sway">
            <PartyGoose pose="sitting" :balloons="2" />
          </div>
        </div>
      </div>

      <!-- El medallón: óvalo crema con filete. Cerrado es chico y queda atado. -->
      <div class="hb__oval" aria-hidden="true" />

      <div class="hb__content">
        <span v-if="monoSrc" class="hb__mono" aria-hidden="true" />
        <p v-if="section.title" class="hb__title hb__in" style="--i: 0" data-text="title">
          {{ section.title }}
        </p>
        <h1 class="hb__name hb__in" style="--i: 1" data-text="name">
          <FxText :text="name" :effects="['calligraphy']" :active="phase === 'closed' || step >= 4" />
        </h1>
        <p v-if="section.text" class="hb__text hb__in" style="--i: 2" data-text="text">
          {{ section.text }}
        </p>

        <div class="hb__row">
          <p v-if="day" class="hb__side hb__side--day" data-text="date">
            <span>{{ day.weekday }}</span>
            <span>{{ day.date }}</span>
          </p>
          <div class="hb__pram">
            <div class="hb__pram-roll"><BabyPram :rolling="rolling" /></div>
          </div>
          <p v-if="hour" class="hb__side hb__side--hour" data-text="date">
            <span>{{ hour.clock }}</span>
            <span>{{ hour.suffix }}</span>
          </p>
        </div>

        <p v-if="place" class="hb__place hb__in" style="--i: 3" data-text="place">{{ place }}</p>
        <p v-if="family" class="hb__to hb__in" style="--i: 4" data-text="to">{{ family }}</p>
      </div>

      <!-- Ramitas con bayas y margaritas: asoman detrás del moño y se acomodan en las esquinas. -->
      <div class="hb__garden" aria-hidden="true">
        <img
          v-for="(s, i) in sprigs"
          v-show="sprigSrc"
          :key="`s${s.k}`"
          :src="sprigSrc ?? undefined"
          alt=""
          class="hb__sprig"
          :class="{ 'hb__sprig--flip': s.flip }"
          :style="{
            left: `${s.left}cqi`,
            top: `${s.top}cqi`,
            width: `${s.width}cqi`,
            '--r': `${s.rotate}deg`,
            '--dx': s.dx,
            '--dy': s.dy,
            '--i': i,
          }"
        />
        <img
          v-for="(d, i) in daisies"
          v-show="daisySrc"
          :key="`d${d.k}`"
          :src="daisySrc ?? undefined"
          alt=""
          class="hb__daisy"
          :style="{
            left: `${d.left}cqi`,
            top: `${d.top}cqi`,
            width: `${d.width}cqi`,
            '--r': `${d.rotate}deg`,
            '--dx': d.dx,
            '--dy': d.dy,
            '--i': i + 2,
          }"
        />
      </div>

      <div class="hb__goose" aria-hidden="true">
        <PartyGoose :balloons="2" />
      </div>

      <div v-if="stork" class="hb__stork" aria-hidden="true">
        <div class="hb__stork-bob"><FlyingStork flying /></div>
      </div>
    </div>

    <!-- La señal de tocar: el texto bajo la escena, con una manita que late. -->
    <button v-if="phase === 'closed'" type="button" class="hb__tap" @click="open">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="hb__tap-icon" aria-hidden="true" v-html="handSvg" />
      <span class="hb__tap-text" data-text="button">{{ section.button ?? 'Toca el moño' }}</span>
    </button>
  </div>
</template>

<style scoped>
.hb {
  --hb-w: min(100cqi, 30rem, calc((100svh - 2 * var(--section-gap) - 4.5rem) * 0.8));
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.hb--closed,
.hb--opening {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.hb--pinned {
  place-content: start center;
  padding-top: var(--hero-lift);
}

/*
 * El escenario: 4:5. Todas las medidas van en cqi del escenario (100 de ancho, 125 de alto).
 * El óvalo mide 84 × 100 y su centro está en (50, 53.75), donde se cruzan las bandas.
 */
.hb__stage {
  --hb-ink: var(--color-text);
  --hb-ribbon: var(--color-primary);
  --hb-ribbon-dark: var(--color-primary-strong, var(--color-primary));
  --hb-ribbon-soft: var(--color-primary-soft, var(--color-primary));
  position: relative;
  container-type: inline-size;
  width: var(--hb-w);
  aspect-ratio: 4 / 5;
}
.hb--closed .hb__stage {
  cursor: pointer;
}

.hb__oval {
  position: absolute;
  left: 8%;
  top: 3%;
  width: 84%;
  height: 80%;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 30%, rgb(255 255 255 / 0.5), transparent 70%),
    var(--color-paper, #fdf8f0);
  border: 0.55cqi solid var(--hb-ribbon);
  box-shadow:
    0 1.4cqi 3.4cqi -1cqi color-mix(in srgb, var(--hb-ribbon-dark) 45%, transparent),
    inset 0 0 0 1.6cqi var(--color-paper, #fdf8f0),
    inset 0 0 0 1.9cqi color-mix(in srgb, var(--hb-ribbon) 55%, transparent);
  opacity: 0;
  transform: scale(0.72);
  transition:
    transform calc(1s * var(--motion-scale)) cubic-bezier(0.34, 1.3, 0.64, 1),
    opacity calc(0.5s * var(--motion-scale)) ease;
}
.is-grown .hb__oval {
  opacity: 1;
  transform: scale(1);
}

/* Lo de adentro: se acomoda dentro del óvalo, ya a su tamaño final. */
.hb__content {
  position: absolute;
  left: 8%;
  top: 3%;
  width: 84%;
  height: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3cqi 9cqi 10cqi;
  gap: 0.6cqi;
  text-align: center;
}
.hb__in,
.hb__mono,
.hb__side {
  opacity: 0;
  translate: 0 1.4cqi;
  transition:
    opacity calc(0.7s * var(--motion-scale)) ease calc(var(--i, 0) * 0.16s * var(--motion-scale)),
    translate calc(0.8s * var(--motion-scale)) var(--ease-out)
      calc(var(--i, 0) * 0.16s * var(--motion-scale));
}
.is-texts .hb__in {
  opacity: 1;
  translate: 0 0;
}
.hb__mono {
  display: block;
  width: 20cqi;
  aspect-ratio: 120 / 66;
  margin-bottom: 0.4cqi;
  background: var(--hb-ribbon);
  -webkit-mask: var(--hb-mono) center / contain no-repeat;
  mask: var(--hb-mono) center / contain no-repeat;
}
.is-grown .hb__mono {
  opacity: 1;
  translate: 0 0;
}

.hb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-size: calc(3.5cqi * var(--t-title-size, 1));
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--t-title-color, color-mix(in srgb, var(--color-oro, var(--hb-ink)) 55%, var(--hb-ink)));
}
.hb__name {
  display: block;
  max-width: 100%;
  margin: 0;
  font-family: var(--t-name-font, var(--font-script));
  font-weight: 400;
  font-size: min(
    calc(18cqi * var(--t-name-size, 1)),
    calc(150cqi / var(--hb-chars, 1) * var(--t-name-size, 1))
  );
  line-height: 1.1;
  color: var(--t-name-color, var(--hb-ribbon-dark));
  overflow-wrap: anywhere;
}
.hb__text {
  max-width: 58cqi;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(3.7cqi * var(--t-text-size, 1));
  font-style: italic;
  line-height: 1.25;
  color: var(--t-text-color, var(--hb-ink));
}

/* La carriola entra rodando; a un lado el día y al otro la hora. */
.hb__row {
  display: grid;
  grid-template-columns: 1fr 34cqi 1fr;
  align-items: center;
  width: calc(100% + 12cqi);
  margin-top: 1cqi;
}
.hb__pram {
  grid-column: 2;
  grid-row: 1;
}
.hb__pram-roll {
  translate: -125cqi 0;
}
.hb--open .hb__pram-roll,
.is-pram .hb__pram-roll {
  translate: 0 0;
}
.hb--opening.is-pram .hb__pram-roll {
  animation: hb-roll calc(1.55s * var(--motion-scale)) cubic-bezier(0.2, 0.7, 0.35, 1) both;
}
.hb__side {
  display: grid;
  gap: 0.2cqi;
  margin: 0;
  font-family: var(--t-date-font, var(--font-caps));
  font-size: calc(3.8cqi * var(--t-date-size, 1));
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.2;
  color: var(--t-date-color, var(--hb-ink));
  --i: 0;
}
.hb__side span:first-child {
  font-size: 0.88em;
  letter-spacing: 0.26em;
  color: color-mix(in srgb, var(--color-oro, var(--hb-ink)) 60%, var(--hb-ink));
}
.hb__side--day {
  grid-column: 1;
  grid-row: 1;
  justify-items: end;
  padding-right: 1.5cqi;
  translate: 3cqi 0;
}
.hb__side--hour {
  grid-column: 3;
  grid-row: 1;
  justify-items: start;
  padding-left: 1.5cqi;
  translate: -3cqi 0;
}
.is-pram .hb__side {
  opacity: 1;
  translate: 0 0;
  transition-delay: calc(1.1s * var(--motion-scale));
}
.hb--open .hb__side {
  transition: none;
}
.hb__place {
  margin: 0.6cqi 0 0;
  font-family: var(--t-place-font, var(--font-script-mono));
  font-size: calc(5cqi * var(--t-place-size, 1));
  line-height: 1.1;
  color: var(--t-place-color, var(--hb-ribbon-dark));
}
.hb__to {
  margin: 0;
  font-family: var(--t-to-font, var(--font-caps));
  font-size: calc(2.9cqi * var(--t-to-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-to-color, var(--hb-ink));
}

/* Ramitas y margaritas: cerradas están detrás del moño; al crecer el óvalo van a su esquina. */
.hb__garden {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity calc(0.6s * var(--motion-scale)) ease;
}
.is-grown .hb__garden {
  opacity: 1;
}
.hb__sprig,
.hb__daisy {
  position: absolute;
  height: auto;
  rotate: var(--r, 0deg);
  translate: calc(var(--dx, 0) * 1cqi) calc(var(--dy, 0) * 1cqi);
  scale: 0.7;
  filter: drop-shadow(0 0.4cqi 0.6cqi rgb(0 0 0 / 0.14));
  transition:
    translate calc(1.1s * var(--motion-scale)) cubic-bezier(0.34, 1.25, 0.64, 1)
      calc(var(--i, 0) * 0.08s * var(--motion-scale)),
    scale calc(1.1s * var(--motion-scale)) cubic-bezier(0.34, 1.25, 0.64, 1)
      calc(var(--i, 0) * 0.08s * var(--motion-scale));
}
.hb__sprig--flip {
  scale: -0.7 0.7;
}
.is-grown .hb__sprig,
.is-grown .hb__daisy {
  translate: 0 0;
  scale: 1;
}
.is-grown .hb__sprig--flip {
  scale: -1 1;
}

/* La hoja cerrada: papel crema, con el vichy rosa arriba que se desvanece hacia abajo. */
.hb__sheet {
  position: absolute;
  top: 0;
  left: 50%;
  width: 100%;
  height: 100%;
  translate: -50% 0;
  pointer-events: none;
  transition: opacity calc(0.8s * var(--motion-scale)) ease;
}
.is-grown .hb__sheet {
  opacity: 0;
}
.hb__sheet-paper {
  position: absolute;
  inset: 0;
  border-radius: 4cqi;
  overflow: hidden;
  background: var(--color-paper, #fdf8f0);
  box-shadow: 0 1.2cqi 4cqi -1.4cqi color-mix(in srgb, var(--hb-ribbon-dark) 40%, transparent);
}
.hb__sheet-paper::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--hb-ribbon-soft) 70%, transparent) 0 6cqi,
      transparent 6cqi 12cqi
    ),
    repeating-linear-gradient(
      0deg,
      color-mix(in srgb, var(--hb-ribbon-soft) 70%, transparent) 0 6cqi,
      transparent 6cqi 12cqi
    );
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 12%, transparent 52%);
  mask-image: linear-gradient(180deg, #000 0, #000 12%, transparent 52%);
}
.hb__garland {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition:
    translate calc(1s * var(--motion-scale)) cubic-bezier(0.5, 0, 0.8, 0.5),
    opacity calc(0.8s * var(--motion-scale)) ease-in;
}
.is-lift .hb__garland {
  translate: 0 -30%;
  opacity: 0;
}
.hb__cover-daisy {
  position: absolute;
  height: auto;
  rotate: var(--r, 0deg);
  filter: drop-shadow(0 0.4cqi 0.6cqi rgb(0 0 0 / 0.14));
}
/* Globos sueltos que suben a los costados. */
.hb__loose {
  position: absolute;
  width: 7cqi;
  aspect-ratio: 5 / 6;
  border-radius: 50% 50% 48% 48%;
  background: radial-gradient(
    circle at 35% 30%,
    rgb(255 255 255 / 0.75),
    var(--_c, var(--hb-ribbon-soft)) 45%,
    var(--hb-ribbon) 130%
  );
  opacity: 0.85;
  animation: hb-rise calc(6s * var(--motion-scale)) ease-in-out infinite;
}
.hb__loose::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 0.25cqi;
  height: 14cqi;
  background: color-mix(in srgb, var(--hb-ink) 35%, transparent);
}
.hb__loose--a {
  left: 6%;
  top: 38%;
}
.hb__loose--b {
  right: 7%;
  top: 44%;
  width: 6cqi;
  --_c: var(--color-accent, var(--hb-ribbon-soft));
  animation-delay: calc(-2.2s * var(--motion-scale));
}
.hb__loose--c {
  right: 18%;
  top: 33%;
  width: 4.5cqi;
  animation-delay: calc(-4s * var(--motion-scale));
}
.hb__goose-shadow {
  position: absolute;
  left: 50%;
  top: 69%;
  width: 36cqi;
  height: 4cqi;
  margin-left: -17cqi;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--hb-ink) 22%, transparent), transparent);
  transition: opacity calc(0.5s * var(--motion-scale)) ease;
}
.is-lift .hb__goose-shadow {
  opacity: 0;
}
/* El ganso sentado, grande al centro; al tocar sube flotando con sus globos. */
.hb__cover-goose {
  position: absolute;
  left: 50%;
  top: 27%;
  width: 50cqi;
  margin-left: -25cqi;
  transition:
    translate calc(1.9s * var(--motion-scale)) cubic-bezier(0.45, 0, 0.7, 0.6),
    opacity calc(0.5s * var(--motion-scale)) ease calc(1.5s * var(--motion-scale));
}
.is-lift .hb__cover-goose {
  translate: 0 -135cqi;
  opacity: 0;
}
.is-lift .hb__cover-goose-sway {
  animation: hb-bob calc(1.3s * var(--motion-scale)) ease-in-out infinite;
}

/* Cerrada, el encabezado y el nombre van bajo el ganso; lo demás espera al medallón. */
.hb:not(.is-grown) .hb__content {
  left: 0;
  top: 70%;
  width: 100%;
  height: 26%;
  padding: 0 6cqi;
}
.hb:not(.is-grown) :is(.hb__mono, .hb__text, .hb__row, .hb__place, .hb__to) {
  position: absolute;
  visibility: hidden;
}
.hb--closed .hb__in {
  opacity: 1;
  translate: 0 0;
}

/* La cigüeña cruza por arriba del medallón (grande, un poco sobre su borde), de lado a lado. */
.hb__stork {
  position: absolute;
  left: 0;
  top: -22cqi;
  width: 56cqi;
  pointer-events: none;
  animation: hb-stork calc(3.2s * var(--motion-scale)) linear both;
}
.hb__stork-bob {
  animation: hb-bob calc(1.6s * var(--motion-scale)) ease-in-out infinite;
}

/* Abierta, todo se mece apenas. */
.hb--open .hb__mono {
  animation: hb-wag calc(4.5s * var(--motion-scale)) ease-in-out infinite;
  transform-origin: 50% 40%;
}
.hb--open .hb__sprig,
.hb--open .hb__daisy {
  animation: hb-tremble calc(5s * var(--motion-scale)) ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * -0.9s * var(--motion-scale));
}
.hb--open .hb__pram-roll {
  animation: hb-rock calc(7s * var(--motion-scale)) ease-in-out infinite;
  transform-origin: 50% 100%;
}

/* El gansito asoma por la esquina de abajo del óvalo y se queda con sus globos. */
.hb__goose {
  position: absolute;
  right: 1%;
  bottom: 0;
  width: 30%;
  opacity: 0;
  translate: 24% 38%;
  transition:
    translate calc(1s * var(--motion-scale)) cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity calc(0.4s * var(--motion-scale)) ease;
}
.is-goose .hb__goose {
  opacity: 1;
  translate: 0 0;
}

.hb__tap {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border: 0;
  background: transparent;
  color: var(--color-primary-strong, var(--color-text));
  cursor: pointer;
}
.hb__tap:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
  border-radius: 999px;
}
.hb__tap-icon {
  display: block;
  width: 1.2rem;
  height: 1.2rem;
  animation: hb-pulse calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.hb__tap-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.hb__tap-text {
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(1.1rem * var(--t-button-size, 1));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-primary-strong, var(--color-text)));
}

@keyframes hb-roll {
  0% {
    translate: -125cqi 0;
  }
  72% {
    translate: 2.4cqi 0;
  }
  88% {
    translate: -0.9cqi 0;
  }
  100% {
    translate: 0 0;
  }
}
@keyframes hb-stork {
  from {
    translate: -60cqi 0;
  }
  to {
    translate: 125cqi -3cqi;
  }
}
@keyframes hb-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2.5deg);
  }
  50% {
    transform: translateY(-1.6cqi) rotate(2.5deg);
  }
}
@keyframes hb-rise {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3cqi);
  }
}
@keyframes hb-wag {
  0%,
  100% {
    transform: rotate(0);
  }
  50% {
    transform: rotate(2.2deg);
  }
}
@keyframes hb-tremble {
  0%,
  100% {
    transform: rotate(0);
  }
  50% {
    transform: rotate(1.6deg);
  }
}
@keyframes hb-rock {
  0%,
  72%,
  100% {
    transform: rotate(0);
  }
  80% {
    transform: rotate(-1.4deg);
  }
  90% {
    transform: rotate(1.2deg);
  }
}
@keyframes hb-pulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.18);
  }
}

/*
 * Celular y tableta: la hoja cerrada es alta (llena ~80 % del alto de la pantalla). El escenario
 * sigue siendo 4:5 (el medallón no cambia), pero el papel sale de él 45cqi por arriba y 37cqi
 * por abajo; el ganso, el nombre y los globos se acomodan en ese alto. Las medidas van en cqi
 * del escenario y los márgenes dejan sitio al papel (y a "Toca el moño" bajo él).
 */
@container section (max-width: 55.99rem) {
  .hb--closed,
  .hb--opening {
    --hb-w: min(100cqi, 30rem, calc((100svh - 2 * var(--section-gap) - 4.5rem) / 2.07));
  }
  .hb--closed .hb__stage,
  .hb--opening .hb__stage {
    margin-block: calc(var(--hb-w) * 0.45) calc(var(--hb-w) * 0.37);
  }
  .hb__sheet-paper {
    inset: -45cqi 0 -37cqi;
  }
  .hb__sheet-paper::before {
    -webkit-mask-image: linear-gradient(180deg, #000 0, #000 44cqi, transparent 104cqi);
    mask-image: linear-gradient(180deg, #000 0, #000 44cqi, transparent 104cqi);
  }
  .hb__garland {
    top: -45cqi;
  }
  .hb__goose-shadow {
    top: 88cqi;
    width: 52cqi;
    margin-left: -25cqi;
  }
  .hb__cover-goose {
    top: 17cqi;
    width: 76cqi;
    margin-left: -38cqi;
  }
  .hb:not(.is-grown) .hb__content {
    top: 82%;
    height: 30%;
  }
  .hb:not(.is-grown) .hb__title {
    font-size: calc(4.6cqi * var(--t-title-size, 1));
  }
  .hb:not(.is-grown) .hb__name {
    font-size: min(
      calc(29cqi * var(--t-name-size, 1)),
      calc(220cqi / var(--hb-chars, 1) * var(--t-name-size, 1))
    );
  }
}

/* Escritorio: el medallón es el mismo; el escenario crece sin pasarse del alto de la ventana. */
@container section (min-width: 56rem) {
  .hb,
  .hb--closed,
  .hb--opening {
    --hb-w: min(100cqi, 40rem, calc((100svh - 2 * var(--section-gap) - 5rem) * 0.8));
  }
  .hb__sheet {
    width: min(60rem, calc(100vw - 2rem));
  }
  .hb__garland {
    left: 50%;
    width: min(100%, 112cqi);
    margin-left: calc(min(100%, 112cqi) / -2);
  }
  /* En escritorio el medallón queda arriba de la ventana: la cigüeña cruza más abajo para no cortarse. */
  .hb__stork {
    top: -7cqi;
  }
  .hb__tap-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
  .hb__tap-text {
    font-size: calc(1.25rem * var(--t-button-size, 1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .hb__oval,
  .hb__in,
  .hb__mono,
  .hb__side,
  .hb__sprig,
  .hb__daisy,
  .hb__garden,
  .hb__sheet,
  .hb__garland,
  .hb__cover-goose,
  .hb__goose-shadow,
  .hb__goose {
    transition: none;
  }
  .hb__loose,
  .hb__stork,
  .hb__stork-bob,
  .hb__cover-goose-sway,
  .hb--open .hb__mono,
  .hb--open .hb__sprig,
  .hb--open .hb__daisy,
  .hb--open .hb__pram-roll,
  .hb__tap-icon,
  .hb--opening.is-pram .hb__pram-roll {
    animation: none;
  }
}
</style>
