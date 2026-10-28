<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import { usePreview } from '@/composables/usePreview'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useScrollLock } from '@/composables/useScrollLock'
import { dateParts } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import { coupleNames, formalDate, parentGroups } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada "sobre con lacre" (`sobre-lacre`): un sobre de papel de color (el olivo del
 * tema, `--color-olivo`) cerrado con un lacre dorado con el monograma. Al tocar empieza la
 * música, el lacre se levanta, la solapa abre sobre su bisagra de arriba (rotateX) y deja ver
 * el forro de damasco en relieve; la tarjeta sube desde adentro mientras el sobre baja, pasa
 * al frente y todo se acomoda como una papelería sobre la mesa: el sobre abierto detrás, la
 * tarjeta al frente con su lacre y un sello ovalado borgoña al costado.
 *
 * La tarjeta es la portada: el encabezado (`titulo`, "Con todo el corazón"), los papás (los
 * grupos de papás de la bendición), los nombres en mayúsculas espaciadas con el "&"
 * caligráfico, la frase (`texto`), la fecha y la ciudad. Todo con transform y opacity; la
 * profundidad (qué va delante) también es un transform (translateZ con preserve-3d).
 * Mientras está cerrado la página no hace scroll. Con "menos movimiento" ya aparece abierto;
 * en el gestor se ve abierto, salvo en "Ver como invitado". Sirve en cualquier tema: los
 * colores salen de la paleta (`--color-olivo`, `--color-paper`, `--color-borgona`…) y el
 * damasco del forro es una ranura (`forro`).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const phase = ref<'closed' | 'opening' | 'open'>(
  !reduced.value || !!preview.value ? (preview.value?.envelopeOpen ? 'open' : 'closed') : 'open',
)
useScrollLock(() => phase.value === 'closed')

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const lift = ref<number | null>(null)
const heroStyle = computed(() =>
  lift.value === null ? undefined : { '--hero-lift': `${lift.value}px` },
)

const lining = computed(() =>
  decorOr(props.section.decor, 'lining', resolveAsset.value('damasco.svg')),
)
const stageStyle = computed(() =>
  lining.value ? { '--lh-lining': `url("${lining.value.replace(/"/g, '%22')}")` } : undefined,
)

const names = computed(() =>
  coupleNames(event.value.celebrant.full_name || event.value.celebrant.short_name || event.value.title),
)
const parents = computed(() => parentGroups(event.value.family ?? []).slice(0, 2))
const date = computed(() =>
  event.value.starts_at ? formalDate(dateParts(event.value.starts_at, event.value.timezone)) : '',
)
const place = computed(() => event.value.venue.city || event.value.venue.display_name || '')
const family = computed(() => invitation?.invitation.value?.label ?? null)
// La palabra más larga fija un tope a la letra de los nombres: así no se parten.
const longest = computed(() =>
  Math.max(6, ...names.value.flatMap((n) => n.split(/\s+/)).map((w) => Array.from(w).length)),
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
  if (reduced.value) {
    phase.value = 'open'
    return
  }
  phase.value = 'opening'
  // por si animationend no llega (todo dura ~3.4 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 3700 * motionScale())
}
function onCardEnd(e: AnimationEvent) {
  if (e.animationName.includes('lh-card')) phase.value = 'open'
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="lh"
    :class="[`lh--${phase}`, { 'lh--pinned': lift !== null }]"
    :style="heroStyle"
  >
    <div
      ref="stage"
      class="lh__stage"
      :style="stageStyle"
      :data-open="phase === 'closed' ? '' : undefined"
      @click="open"
    >
      <!-- El sobre: el fondo con el forro, la tarjeta adentro, la bolsa y la solapa. -->
      <div class="lh__envelope" aria-hidden="true">
        <div class="lh__inside"><span class="lh__damask" /></div>
        <div class="lh__pocket">
          <svg class="lh__seams" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100L44 62M100 100L56 62M0 20L44 62H56L100 20" />
          </svg>
          <p v-if="family" class="lh__to" data-text="to">{{ family }}</p>
        </div>
        <div class="lh__flap">
          <span class="lh__flap-face lh__flap-face--out" />
          <span class="lh__flap-face lh__flap-face--in"><span class="lh__damask" /></span>
        </div>
      </div>
      <WaxSeal class="lh__seal" tone="gold" size="18%" seed="sobre-lacre" />

      <!-- La tarjeta: la portada. -->
      <div class="lh__card" @animationend="onCardEnd">
        <div
          class="lh__paper paper-notched"
          data-fillet="burgundy"
          :style="{ '--lh-chars': String(longest) }"
        >
          <p v-if="section.title" class="lh__kicker" data-text="title">{{ section.title }}</p>
          <div v-if="parents.length" class="lh__parents" :class="{ 'lh__parents--one': parents.length === 1 }">
            <div v-for="(group, i) in parents" :key="i" class="lh__parent">
              <p class="lh__role" data-text="role">{{ group.role }}</p>
              <p class="lh__parent-names" data-text="names">
                <span v-for="(n, j) in group.names" :key="j">{{ n }}</span>
              </p>
            </div>
          </div>
          <h1 class="lh__names" data-text="name">
            <template v-if="names.length === 2">
              <span class="lh__name">{{ names[0] }}</span>
              <span class="lh__amp" aria-label="y">&amp;</span>
              <span class="lh__name">{{ names[1] }}</span>
            </template>
            <span v-else class="lh__name">{{ names[0] }}</span>
          </h1>
          <p v-if="section.text" class="lh__text" data-text="text">{{ section.text }}</p>
          <p v-if="date" class="lh__date" data-text="date">{{ date }}</p>
          <p v-if="place" class="lh__place" data-text="place">{{ place }}</p>
        </div>
        <WaxSeal class="lh__card-seal" tone="gold" size="18%" seed="tarjeta" />
      </div>
      <WaxSeal class="lh__oval" shape="oval" tone="burgundy" size="27%" seed="ovalado" />
    </div>

    <button v-if="phase === 'closed'" type="button" class="lh__open" data-text="button" @click="open">
      {{ section.button ?? 'Toca para abrir' }}
    </button>
  </div>
</template>

<style scoped>
/*
 * El escenario mide 100 × 165 (en % de su ancho): todo va en % para que escale igual en un
 * celular que en una computadora. Las posiciones de base son las del final (abierto); cerrado
 * y abriendo son transforms sobre ellas.
 *   sobre:   x 0–86, y 46–166 (girado -3°)       cerrado: centrado
 *   tarjeta: x 12–94, y 40–155                    cerrado: dentro del sobre
 *   óvalo:   x 66–94, y 128–163
 */
.lh {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.lh--closed {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.lh--opening {
  min-height: calc(100svh - 2 * var(--section-gap));
}
.lh--pinned {
  padding-top: var(--hero-lift);
}
.lh__stage {
  --lh-ink: var(--color-text);
  --lh-olive: var(--color-olivo, var(--color-primary));
  --lh-paper: var(--color-paper, var(--color-surface));
  --lh-T: calc(3.4s * var(--motion-scale));
  position: relative;
  /* cabe a lo alto de la pantalla, cerrado o abierto */
  width: min(100cqi, 31rem, calc((100svh - 6rem) / 1.65));
  aspect-ratio: 100 / 165;
  perspective: 1400px;
  transform-style: preserve-3d;
}
.lh--closed .lh__stage {
  cursor: pointer;
}

/* ------------------------------------------------------------------ el sobre */
.lh__envelope {
  position: absolute;
  left: 0;
  top: 27.88%;
  width: 86%;
  height: 72.73%;
  transform-style: preserve-3d;
  transform: rotate(-3deg);
  transform-origin: 50% 60%;
}
.lh__inside,
.lh__pocket {
  position: absolute;
  inset: 0;
}
/* El fondo del sobre por dentro: el forro de damasco (se ve por la abertura en V). */
.lh__inside {
  transform: translateZ(-3px);
  background: color-mix(in srgb, var(--lh-olive) 82%, #000);
}
.lh__inside .lh__damask {
  inset: 3% 3% 45%;
}
/* La bolsa: el papel de color con su trama, las costuras y la abertura en V arriba. */
.lh__pocket {
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 180px,
    linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 40%, rgb(0 0 0 / 0.14)),
    var(--lh-olive);
  clip-path: polygon(0 0, 50% 34%, 100% 0, 100% 100%, 0 100%);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
}
.lh__seams {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: rgb(0 0 0 / 0.22);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.lh__seams path {
  vector-effect: non-scaling-stroke;
}
.lh__to {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 9%;
  margin: 0;
  text-align: center;
  font-family: var(--t-to-font, var(--font-script));
  font-size: calc(clamp(1.05rem, 6cqi, 1.7rem) * var(--t-to-size, 1));
  line-height: 1.1;
  color: var(--t-to-color, var(--lh-paper));
  opacity: 0.92;
}
/* La solapa: un triángulo con bisagra arriba; por fuera el papel de color, por dentro el forro. */
.lh__flap {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 42%;
  transform-origin: 50% 0;
  transform-style: preserve-3d;
  transform: rotateX(180deg) translateZ(2px);
}
.lh__flap-face {
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 54% 95%, 50% 100%, 46% 95%);
  backface-visibility: hidden;
}
.lh__flap-face--out {
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 180px,
    linear-gradient(180deg, rgb(255 255 255 / 0.04), rgb(0 0 0 / 0.1)),
    color-mix(in srgb, var(--lh-olive) 92%, #fff);
}
.lh__flap-face--in {
  transform: rotateX(180deg);
  background: var(--lh-paper);
}
.lh__flap-face--in .lh__damask {
  inset: 0;
}

/*
 * El damasco en relieve (blind emboss): el mismo dibujo tres veces, en sombra abajo a la
 * derecha, en luz arriba a la izquierda y en el color del papel encima. Sin filtros.
 */
.lh__damask {
  position: absolute;
  background: var(--lh-paper);
}
.lh__damask::before,
.lh__damask::after {
  content: '';
  position: absolute;
  inset: 0;
  -webkit-mask: var(--lh-lining) 0 0 / 3.2rem 4rem repeat;
  mask: var(--lh-lining) 0 0 / 3.2rem 4rem repeat;
}
.lh__damask::before {
  background: rgb(59 52 46 / 0.22);
  translate: 0.7px 0.9px;
}
.lh__damask::after {
  background: rgb(255 255 255 / 0.85);
  translate: -0.6px -0.7px;
  opacity: 0.9;
}

/* ------------------------------------------------------------------ lacres */
.lh__seal {
  position: absolute;
  left: 41%;
  top: 38.7%;
  width: 18%;
  transform: translateZ(4px);
  filter: drop-shadow(0 2px 2px rgb(40 30 20 / 0.35));
}
.lh__oval {
  position: absolute;
  left: 71%;
  top: 80%;
  width: 27%;
  filter: drop-shadow(0 6px 8px rgb(40 20 20 / 0.35));
}

/* ------------------------------------------------------------------ la tarjeta */
.lh__card {
  /* todo lo de la tarjeta se mide contra su ancho (cqi) */
  container-type: inline-size;
  position: absolute;
  left: 12%;
  top: 24.24%;
  width: 82%;
  height: 69.7%;
  transform-style: preserve-3d;
  filter: drop-shadow(0 1px 1px rgb(59 52 46 / 0.18)) drop-shadow(0 10px 14px rgb(59 52 46 / 0.22));
}
.lh__card-seal {
  position: absolute;
  left: 41%;
  top: -6.5%;
  width: 18%;
}
.lh__paper {
  /* paper-notched la deja en position: relative: llena la tarjeta con su alto */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3.2cqi;
  padding: 11cqi 9cqi 18cqi;
  text-align: center;
  color: var(--lh-ink);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    radial-gradient(120% 80% at 50% 35%, rgb(255 255 255 / 0.5), transparent 70%),
    var(--lh-paper);
  --notch-size: 7cqi;
  --notch-a: 6.6cqi;
  --fillet-inset: 3cqi;
}
.lh__kicker,
.lh__role,
.lh__text,
.lh__place {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  text-transform: uppercase;
  line-height: 1.45;
}
.lh__kicker {
  font-family: var(--t-title-font, var(--font-caps));
  font-size: calc(3.5cqi * var(--t-title-size, 1));
  letter-spacing: 0.24em;
  color: var(--t-title-color, var(--lh-ink));
}
.lh__parents {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4cqi;
  width: 100%;
}
.lh__parents--one {
  grid-template-columns: 1fr;
}
.lh__role {
  font-family: var(--t-role-font, var(--font-caps));
  font-size: calc(2.9cqi * var(--t-role-size, 1));
  letter-spacing: 0.2em;
  color: var(--t-role-color, color-mix(in srgb, var(--lh-ink) 62%, transparent));
}
.lh__parent-names {
  display: grid;
  margin: 1.2cqi 0 0;
  font-family: var(--t-names-font, var(--font-serif));
  font-weight: 500;
  font-size: calc(3.9cqi * var(--t-names-size, 1));
  line-height: 1.3;
  color: var(--t-names-color, var(--lh-ink));
}
.lh__names {
  display: grid;
  justify-items: center;
  margin: 2cqi 0;
  font-family: var(--t-name-font, var(--font-display));
  font-weight: 400;
  color: var(--t-name-color, color-mix(in srgb, var(--lh-ink) 78%, var(--color-taupe, #a99c88)));
}
.lh__name {
  font-size: min(
    calc(10.5cqi * var(--t-name-size, 1)),
    calc(118cqi / var(--lh-chars, 8))
  );
  line-height: 1.05;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  /* el espaciado de la última letra no empuja el centro */
  margin-right: -0.1em;
}
.lh__amp {
  margin: -2cqi 0 -3.5cqi;
  font-family: var(--font-script);
  font-size: 19cqi;
  line-height: 1;
  color: var(--color-borgona, var(--color-accent));
  text-transform: none;
  letter-spacing: 0;
}
.lh__text {
  max-width: 30ch;
  font-family: var(--t-text-font, var(--font-caps));
  font-size: calc(3cqi * var(--t-text-size, 1));
  letter-spacing: 0.14em;
  color: var(--t-text-color, var(--lh-ink));
}
.lh__date {
  margin: 0;
  font-family: var(--t-date-font, var(--font-serif));
  font-weight: 600;
  font-size: calc(4.2cqi * var(--t-date-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--lh-ink));
}
.lh__place {
  font-family: var(--t-place-font, var(--font-caps));
  font-size: calc(3cqi * var(--t-place-size, 1));
  letter-spacing: 0.24em;
  color: var(--t-place-color, color-mix(in srgb, var(--lh-ink) 70%, transparent));
}

/* ------------------------------------------------------------------ cerrado */
.lh--closed .lh__envelope {
  transform: translate(8.14%, -19.58%);
}
.lh--closed .lh__flap {
  transform: rotateX(0deg) translateZ(2px);
}
.lh--closed .lh__card {
  transform: translate(-3.66%, -11.74%) translateZ(-1px);
}
.lh--closed .lh__card-seal,
.lh--closed .lh__oval {
  opacity: 0;
}
/* Abierto: sin profundidad (lo de adelante es lo que va después). El lacre ya no está. */
.lh--open .lh__stage {
  transform-style: flat;
}
.lh--open .lh__seal {
  opacity: 0;
}

/* ------------------------------------------------------------------ abriendo */
.lh--opening .lh__seal {
  animation: lh-seal-lift calc(0.7s * var(--motion-scale)) var(--ease-out) forwards;
}
.lh--opening .lh__flap {
  animation: lh-flap calc(1.05s * var(--motion-scale)) cubic-bezier(0.45, 0, 0.25, 1)
    calc(0.35s * var(--motion-scale)) both;
}
.lh--opening .lh__envelope {
  animation: lh-envelope var(--lh-T) var(--ease-out) both;
}
.lh--opening .lh__card {
  animation: lh-card var(--lh-T) var(--ease-out) both;
}
.lh--opening .lh__card-seal {
  animation: lh-appear calc(0.6s * var(--motion-scale)) var(--ease-out)
    calc(2.75s * var(--motion-scale)) both;
}
.lh--opening .lh__oval {
  animation: lh-oval calc(0.8s * var(--motion-scale)) var(--ease-out)
    calc(2.6s * var(--motion-scale)) both;
}
@keyframes lh-seal-lift {
  0% {
    transform: translateZ(4px);
    opacity: 1;
  }
  45% {
    transform: translateZ(4px) translateY(-14%) scale(1.06);
    opacity: 1;
  }
  100% {
    transform: translateZ(4px) translateY(-40%) scale(1.12);
    opacity: 0;
  }
}
@keyframes lh-flap {
  from {
    transform: rotateX(0deg) translateZ(2px);
  }
  to {
    transform: rotateX(180deg) translateZ(2px);
  }
}
@keyframes lh-envelope {
  0%,
  40% {
    transform: translate(8.14%, -19.58%);
  }
  68% {
    transform: translate(8.14%, 38.75%);
  }
  100% {
    transform: rotate(-3deg);
  }
}
@keyframes lh-card {
  0%,
  40% {
    transform: translate(-3.66%, -11.74%) translateZ(-1px);
  }
  68% {
    transform: translate(-3.66%, -55.2%) translateZ(-1px);
  }
  70% {
    transform: translate(-3.66%, -55.2%) translateZ(6px);
  }
  100% {
    transform: translateZ(6px);
  }
}
@keyframes lh-appear {
  from {
    opacity: 0;
    transform: translateY(-30%) scale(1.2);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes lh-oval {
  from {
    opacity: 0;
    transform: translate(18%, 14%) rotate(8deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.lh__open {
  padding: 0.5rem 1.2rem;
  border: 0;
  background: none;
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-text));
  cursor: pointer;
  animation: lh-hint calc(2.8s * var(--motion-scale)) ease-in-out infinite;
}
.lh__open:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 4px;
}
@keyframes lh-hint {
  0%,
  100% {
    opacity: 0.95;
  }
  50% {
    opacity: 0.5;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lh__open {
    animation: none;
  }
}
</style>
