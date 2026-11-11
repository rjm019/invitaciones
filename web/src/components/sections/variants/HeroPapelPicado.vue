<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import handSvg from '@fortawesome/fontawesome-free/svgs/solid/hand-pointer.svg?raw'
import { useCelebration } from '@/composables/useCelebration'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import { usePreview } from '@/composables/usePreview'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useScrollLock } from '@/composables/useScrollLock'
import { dateParts } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada "papel picado" (`papel-picado`): un collage a pantalla completa (una carpeta de
 * encaje con la tarjeta de los nombres y la fecha, gerberas y cempasúchil en las esquinas,
 * cactus y nopal abajo, el corazón sagrado arriba y una cenefa de azulejos al pie) tapado
 * por tres hileras de papel picado, como una cortina. Al tocar: empieza la música, las
 * hileras se levantan una tras otra (cada bandera gira desde su hilo, rotateX con
 * perspectiva, y la hilera sube y se desvanece), las flores brotan (scale) y la tarjeta se
 * asienta. Abierta queda una sola hilera de banderas arriba, meciéndose. Todo con transform
 * y opacity. Mientras está cerrada la página no hace scroll. Con "menos movimiento" ya
 * aparece abierta; en el gestor se ve abierta, salvo en "Ver como invitado". Sirve en
 * cualquier tema: los colores salen de la paleta y cada dibujo es una ranura de adorno.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const celebration = useCelebration()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

const decor = computed(() => props.section.decor)
const asset = (slot: string, file: string) => decorOr(decor.value, slot, resolveAsset.value(file))
const lace = computed(() => asset('lace', 'encaje.svg'))
const heart = computed(() => asset('sacred_heart', 'corazon-sagrado.svg'))
const gerbera = computed(() => asset('flowers', 'gerbera.svg'))
const gerberaRed = computed(() => resolveAsset.value('gerbera-roja.svg'))
const gerberaOrange = computed(() => resolveAsset.value('gerbera-naranja.svg'))
const marigold = computed(() => asset('marigold', 'cempasuchil.svg'))
const nopal = computed(() => asset('nopal', 'nopal.svg'))
const saguaro = computed(() => asset('saguaro', 'saguaro.svg'))
const flagMask = computed(() => resolveAsset.value('papel-picado.svg'))
// La cenefa: los cuatro azulejos en fila (o el que ponga la ranura, repetido).
const tiles = computed(() => {
  const own = decorOr(decor.value, 'tile', null)
  if (own) return Array.from({ length: 16 }, () => own)
  if ('tile' in decor.value) return []
  // 16: en el celular se ven 8; en escritorio, la cenefa llena todo el ancho.
  return Array.from({ length: 16 }, (_, i) =>
    resolveAsset.value(`azulejo-${(i % 4) + 1}.svg`),
  ).filter((t): t is string => !!t)
})

// Colores de las banderas: la paleta de la fiesta, con respaldo en la del tema.
const FLAG_COLORS = [
  'var(--color-rosa, var(--color-accent))',
  'var(--color-cempasuchil, var(--color-primary))',
  'var(--color-turquesa, var(--color-primary-soft))',
  'var(--color-amarillo, var(--color-primary-soft))',
  'var(--color-talavera, var(--color-primary-strong))',
  'var(--color-nopal, var(--color-primary))',
  'var(--color-rojo, var(--color-accent))',
]
const ROWS = 3
// 10: en el celular se ven 5 por hilera; en escritorio, las 10.
const FLAGS_PER_ROW = 10
const rows = computed(() =>
  Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: FLAGS_PER_ROW }, (_, j) => FLAG_COLORS[(r * 3 + j * 2) % FLAG_COLORS.length]),
  ),
)
// 14: en el celular se ven 7; en escritorio, las 14.
const bunting = Array.from({ length: 14 }, (_, j) => ({ color: FLAG_COLORS[j % FLAG_COLORS.length], j }))
// Más flores y cactus que solo se ven en escritorio (la escena se abre a lo ancho).
const extras = computed(() =>
  [gerbera.value, marigold.value, gerberaRed.value, gerberaOrange.value, nopal.value, gerbera.value, marigold.value]
    .map((src, k) => ({ src, k }))
    .filter((e): e is { src: string; k: number } => !!e.src),
)

const phase = ref<'closed' | 'opening' | 'open'>(
  !reduced.value || !!preview.value ? (preview.value?.envelopeOpen ? 'open' : 'closed') : 'open',
)
useScrollLock(() => phase.value === 'closed')

// Al abrir, la portada deja de ocupar toda la pantalla: la escena se queda donde estaba.
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
const parts = computed(() =>
  event.value.starts_at ? dateParts(event.value.starts_at, event.value.timezone) : null,
)
const longestWord = computed(() =>
  Math.max(1, ...name.value.split(/\s+/).map((w) => Array.from(w).length)),
)
const frameStyle = computed(() => ({
  '--hero-name-chars': String(longestWord.value),
  ...(flagMask.value ? { '--pp-flag': `url("${flagMask.value}")` } : {}),
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
  // por si animationend no llega (las tres hileras tardan ~2.4 s a velocidad 1)
  timer = setTimeout(() => (phase.value = 'open'), 2800 * motionScale())
}
function onLiftEnd(e: AnimationEvent) {
  if (e.animationName.includes('pp-lift') && (e.target as HTMLElement).dataset.last) {
    phase.value = 'open'
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="root"
    class="pp-hero"
    :class="[`pp-hero--${phase}`, { 'pp-hero--pinned': lift !== null }]"
    :style="heroStyle"
  >
    <div ref="stage" class="pp-hero__stage" @click="open">
      <div class="pp-hero__frame" :style="frameStyle">
        <!-- La escena del collage. -->
        <div class="pp-hero__scene">
          <img v-if="lace" :src="lace" alt="" class="pp-hero__lace" />
          <img v-if="heart" :src="heart" alt="" class="pp-hero__heart" />
          <img v-if="gerbera" :src="gerbera" alt="" class="pp-hero__bloom pp-hero__bloom--a" style="--i: 0" />
          <img v-if="gerberaRed" :src="gerberaRed" alt="" class="pp-hero__bloom pp-hero__bloom--b" style="--i: 1" />
          <img v-if="gerberaOrange" :src="gerberaOrange" alt="" class="pp-hero__bloom pp-hero__bloom--c" style="--i: 2" />
          <img v-if="marigold" :src="marigold" alt="" class="pp-hero__bloom pp-hero__bloom--d" style="--i: 3" />
          <img v-if="marigold" :src="marigold" alt="" class="pp-hero__bloom pp-hero__bloom--e" style="--i: 4" />
          <img v-if="saguaro" :src="saguaro" alt="" class="pp-hero__bloom pp-hero__bloom--f" style="--i: 5" />
          <img v-if="nopal" :src="nopal" alt="" class="pp-hero__bloom pp-hero__bloom--g" style="--i: 6" />
          <img
            v-for="e in extras"
            :key="`x${e.k}`"
            :src="e.src"
            alt=""
            class="pp-hero__bloom pp-hero__extra"
            :class="`pp-hero__extra--${e.k}`"
            :style="{ '--i': 7 + e.k }"
          />

          <div class="pp-hero__card">
            <p v-if="event.subtitle" class="pp-hero__subtitle" data-text="subtitle">
              {{ event.subtitle }}
            </p>
            <h1 class="pp-hero__name" data-text="name">{{ name }}</h1>
            <p v-if="parts" class="pp-hero__date" data-text="date">
              {{ parts.day }} de {{ parts.month }} de {{ parts.year }}
            </p>
            <p v-if="event.venue.name || event.venue.city" class="pp-hero__venue" data-text="place">
              <span v-if="event.venue.name">{{ event.venue.name }}</span>
              <span v-if="event.venue.city">{{ event.venue.city }}</span>
            </p>
          </div>

          <div v-if="tiles.length" class="pp-hero__tiles" aria-hidden="true">
            <img
              v-for="(tile, i) in tiles"
              :key="i"
              :src="tile"
              alt=""
              :class="{ 'pp-hero__wide': i >= 8 }"
            />
          </div>

          <!-- Abierta: una sola hilera de banderas, meciéndose arriba. -->
          <div class="pp-hero__bunting" aria-hidden="true">
            <span
              v-for="flag in bunting"
              :key="flag.j"
              class="pp-hero__swing"
              :class="{ 'pp-hero__wide': flag.j >= 7 }"
              :style="{ '--flag': flag.color, '--j': flag.j }"
            />
          </div>
        </div>

        <!-- Cerrada: las tres hileras de papel picado que la tapan. -->
        <template v-if="phase !== 'open'">
          <div
            v-for="(row, r) in rows"
            :key="r"
            class="pp-hero__row"
            :class="`pp-hero__row--${r}`"
            :style="{ '--r': r }"
            :data-last="r === rows.length - 1 ? 'true' : undefined"
            @animationend="onLiftEnd"
          >
            <span
              v-for="(color, j) in row"
              :key="j"
              class="pp-hero__flag"
              :class="{ 'pp-hero__wide': j >= 5 }"
              :style="{ '--flag': color, '--j': j }"
            />
          </div>
          <p v-if="family" class="pp-hero__plate" data-text="to">{{ family }}</p>
        </template>
      </div>
    </div>

    <!-- La señal de tocar es discreta: solo el texto bajo la escena, con una manita que late. -->
    <button v-if="phase === 'closed'" type="button" class="pp-hero__tap" @click="open">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="pp-hero__tap-icon" aria-hidden="true" v-html="handSvg" />
      <span class="pp-hero__tap-text" data-text="button">{{
        section.button ?? 'Toca para abrir'
      }}</span>
    </button>
  </div>
</template>

<style scoped>
.pp-hero {
  display: grid;
  place-content: start center;
  justify-items: center;
  gap: var(--space-2);
}
.pp-hero--closed,
.pp-hero--opening {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.pp-hero--pinned {
  place-content: start center;
  padding-top: var(--hero-lift);
}
.pp-hero__stage {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100cqi, 32rem);
}
.pp-hero--closed .pp-hero__stage {
  cursor: pointer;
}

/* El marco: la escena y las hileras viven aquí; la perspectiva nace en cada hilera. */
.pp-hero__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  box-shadow: 0 1.2rem 2.4rem rgb(0 0 0 / 0.3);
}
/* Fondo del tema con una trama de puntitos. */
.pp-hero__scene {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--color-text) 10%, transparent) 1.2px, transparent 1.6px)
      0 0 / 14px 14px,
    var(--color-bg);
}
.pp-hero__lace {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 98%;
  translate: -50% -50%;
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.25));
}
.pp-hero__heart {
  position: absolute;
  left: 50%;
  top: 8%;
  width: 26%;
  translate: -50% 0;
  filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.25));
}

/* Las flores brotan: cerradas están en cero y crecen una tras otra al abrir. */
.pp-hero__bloom {
  position: absolute;
  height: auto;
  transform: scale(1);
  transition: transform calc(0.7s * var(--motion-scale)) cubic-bezier(0.34, 1.56, 0.64, 1)
    calc((0.7s + var(--i, 0) * 0.12s) * var(--motion-scale));
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.25));
}
.pp-hero--closed .pp-hero__bloom {
  transform: scale(0);
  transition: none;
}
.pp-hero__bloom--a {
  left: -7%;
  top: 2%;
  width: 36%;
  rotate: -12deg;
}
.pp-hero__bloom--b {
  right: -6%;
  top: 4%;
  width: 30%;
  rotate: 14deg;
}
.pp-hero__bloom--c {
  right: -5%;
  top: 46%;
  width: 24%;
  rotate: -8deg;
}
.pp-hero__bloom--d {
  left: -4%;
  top: 40%;
  width: 22%;
  rotate: 10deg;
}
.pp-hero__bloom--e {
  right: 9%;
  bottom: 13%;
  width: 20%;
  rotate: -14deg;
}
.pp-hero__bloom--f {
  left: 3%;
  bottom: 10%;
  width: 17%;
  transform-origin: 50% 100%;
}
.pp-hero__bloom--g {
  left: 19%;
  bottom: 10%;
  width: 17%;
  transform-origin: 50% 100%;
}

/* La tarjeta crema con los nombres y la fecha, encima de la carpeta de encaje. */
.pp-hero__card {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  width: 64%;
  min-height: 40%;
  translate: -50% -50%;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 8% 6%;
  text-align: center;
  background: var(--color-paper, #fbf3e2);
  box-shadow: 0 0.5rem 1.2rem rgb(0 0 0 / 0.3);
  outline: 1px solid color-mix(in srgb, var(--color-tinta, var(--color-text)) 35%, transparent);
  outline-offset: -0.4rem;
  transition: transform calc(0.8s * var(--motion-scale)) var(--ease-out)
    calc(1.3s * var(--motion-scale));
}
.pp-hero--closed .pp-hero__card {
  transform: translateY(5%) scale(0.92);
  transition: none;
}
.pp-hero__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-script-mono));
  font-size: calc(7cqi * var(--t-subtitle-size, 1));
  line-height: 1.2;
  color: var(--t-subtitle-color, var(--color-tinta, var(--color-text)));
}
.pp-hero__name {
  display: grid;
  place-items: center;
  max-width: 100%;
  margin: 0;
  font-family: var(--t-name-font, var(--font-script));
  font-weight: 400;
  font-size: min(
    calc(clamp(2.2rem, 24cqi, 6rem) * var(--t-name-size, 1)),
    calc(170cqi / var(--hero-name-chars, 1))
  );
  line-height: 1;
  color: var(--t-name-color, var(--color-rosa, var(--color-accent)));
  overflow-wrap: anywhere;
}
.pp-hero__date {
  margin: 0.2rem 0 0;
  font-family: var(--t-date-font, var(--font-caps));
  font-size: calc(clamp(0.66rem, 5cqi, 0.9rem) * var(--t-date-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-date-color, var(--color-tinta, var(--color-text)));
}
.pp-hero__venue {
  display: grid;
  margin: 0;
  font-family: var(--t-place-font, var(--font-script-mono));
  font-size: calc(5.4cqi * var(--t-place-size, 1));
  line-height: 1.15;
  color: var(--t-place-color, var(--color-tinta, var(--color-text)));
}

/* Piezas que solo existen en escritorio (la escena se abre a lo ancho). */
.pp-hero__frame .pp-hero__extra,
.pp-hero__frame .pp-hero__wide {
  display: none;
}

/* La cenefa de azulejos al pie. */
.pp-hero__tiles {
  position: absolute;
  inset: auto 0 0;
  z-index: 1;
  display: flex;
  box-shadow: 0 -2px 6px rgb(0 0 0 / 0.2);
}
.pp-hero__tiles img {
  flex: 1 1 0;
  min-width: 0;
  display: block;
}

/* La hilera que queda abierta: banderas chicas que se mecen desde su hilo. */
.pp-hero__bunting {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  display: flex;
  padding-inline: 2%;
  opacity: 1;
  transition: opacity calc(0.5s * var(--motion-scale)) ease calc(1.2s * var(--motion-scale));
}
.pp-hero__bunting::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: color-mix(in srgb, var(--color-tinta, var(--color-text)) 55%, transparent);
}
.pp-hero--closed .pp-hero__bunting {
  opacity: 0;
  transition: none;
}
.pp-hero__swing {
  flex: 1 1 0;
  aspect-ratio: 200 / 132;
  background: var(--flag);
  -webkit-mask: var(--pp-flag) center / 100% 100% no-repeat;
  mask: var(--pp-flag) center / 100% 100% no-repeat;
  transform-origin: 50% 0;
  animation: pp-sway calc(4.5s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(var(--j) * -0.7s * var(--motion-scale));
}

/* Las tres hileras de papel picado que tapan la escena. */
.pp-hero__row {
  position: absolute;
  left: -10%;
  z-index: 3;
  display: flex;
  width: 150%;
  top: calc(var(--r) * 33%);
  perspective: 700px;
  perspective-origin: 50% 0;
  will-change: transform, opacity;
}
.pp-hero__row--1 {
  left: -25%;
}
/* El hilo del que cuelgan. */
.pp-hero__row::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: var(--color-tinta, var(--color-text));
  opacity: 0.6;
}
.pp-hero__flag {
  flex: 0 0 20%;
  aspect-ratio: 4 / 5;
  background: var(--flag);
  -webkit-mask: var(--pp-flag) center / 100% 100% no-repeat;
  mask: var(--pp-flag) center / 100% 100% no-repeat;
  transform-origin: 50% 0;
  will-change: transform;
}
/* Cada hilera arranca medio segundo después de la anterior; cada bandera, un poco después de su vecina. */
.pp-hero--opening .pp-hero__row {
  animation: pp-lift calc(1s * var(--motion-scale)) cubic-bezier(0.5, 0, 0.75, 0.4) both;
  animation-delay: calc(var(--r) * 0.5s * var(--motion-scale));
}
.pp-hero--opening .pp-hero__flag {
  animation: pp-flip calc(0.8s * var(--motion-scale)) cubic-bezier(0.4, 0, 0.6, 1) both;
  animation-delay: calc((var(--r) * 0.5s + var(--j) * 0.07s) * var(--motion-scale));
}

/* Placa con el nombre de la familia, sobre la hilera de en medio. */
.pp-hero__plate {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 4;
  max-width: 70%;
  margin: 0;
  padding: 0.4rem 1rem;
  translate: -50% -50%;
  background: var(--color-paper, #fbf3e2);
  border: 2px solid var(--color-talavera, var(--color-primary));
  color: var(--t-to-color, var(--color-tinta, var(--color-text)));
  font-family: var(--t-to-font, var(--font-caps));
  font-size: calc(clamp(0.72rem, 3.6cqi, 0.95rem) * var(--t-to-size, 1));
  letter-spacing: 0.14em;
  text-align: center;
  box-shadow: 0 0.3rem 0.8rem rgb(0 0 0 / 0.35);
}
.pp-hero--opening .pp-hero__plate {
  animation: pp-plate-off calc(0.3s * var(--motion-scale)) ease-in forwards;
}

.pp-hero__tap {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border: 0;
  background: transparent;
  color: var(--color-paper, #fbf3e2);
  cursor: pointer;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.55);
}
.pp-hero__tap:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
.pp-hero__tap-icon {
  display: block;
  width: 1.3rem;
  height: 1.3rem;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.5));
  animation: pp-tap-pulse calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
.pp-hero__tap-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.pp-hero__tap-text {
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(1.05rem * var(--t-button-size, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-button-color, var(--color-paper, #fbf3e2));
}

@keyframes pp-tap-pulse {
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
@keyframes pp-lift {
  to {
    transform: translateY(-70%);
    opacity: 0;
  }
}
@keyframes pp-flip {
  to {
    transform: rotateX(-100deg);
  }
}
@keyframes pp-plate-off {
  to {
    opacity: 0;
  }
}
@keyframes pp-sway {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(4deg);
  }
}
/*
 * Escritorio: la escena crece (3:2, sin pasarse del alto de la ventana) y el collage se abre
 * hacia los lados: más flores, cactus y azulejos, y el papel picado de lado a lado.
 */
@container section (min-width: 56rem) {
  .pp-hero__stage {
    width: min(100cqi, 76rem, calc((100svh - 2 * var(--section-gap) - 7rem) * 1.5));
  }
  .pp-hero__frame {
    aspect-ratio: 3 / 2;
  }
  .pp-hero__frame .pp-hero__extra,
  .pp-hero__frame .pp-hero__wide {
    display: block;
  }
  .pp-hero__flag {
    flex-basis: 10%;
  }
  .pp-hero__lace {
    width: auto;
    height: 106%;
  }
  .pp-hero__heart {
    top: 3%;
    width: 9%;
  }
  .pp-hero__card {
    width: 34%;
    min-height: 44%;
  }
  .pp-hero__bloom--a {
    left: -2%;
    top: 1%;
    width: 15%;
  }
  .pp-hero__bloom--b {
    right: -2%;
    top: 2%;
    width: 14%;
  }
  .pp-hero__bloom--c {
    right: 0;
    top: 38%;
    width: 11%;
  }
  .pp-hero__bloom--d {
    left: 0;
    top: 36%;
    width: 11%;
  }
  .pp-hero__bloom--e {
    right: 11%;
    bottom: 11%;
    width: 9%;
  }
  .pp-hero__bloom--f {
    left: 3%;
    bottom: 11%;
    width: 6.5%;
  }
  .pp-hero__bloom--g {
    left: 11%;
    bottom: 11%;
    width: 6.5%;
  }
  .pp-hero__extra--0 {
    left: 10%;
    top: 12%;
    width: 9%;
    rotate: 20deg;
  }
  .pp-hero__extra--1 {
    right: 9%;
    top: 13%;
    width: 9%;
    rotate: -10deg;
  }
  .pp-hero__extra--2 {
    left: -1%;
    top: 58%;
    width: 10%;
    rotate: 8deg;
  }
  .pp-hero__extra--3 {
    right: -1%;
    top: 60%;
    width: 10%;
    rotate: -18deg;
  }
  .pp-hero__extra--4 {
    right: 3%;
    bottom: 11%;
    width: 6.5%;
    transform-origin: 50% 100%;
  }
  .pp-hero__extra--5 {
    right: 20%;
    bottom: 10%;
    width: 7%;
    rotate: 12deg;
  }
  .pp-hero__extra--6 {
    left: 19%;
    bottom: 10%;
    width: 7%;
    rotate: -12deg;
  }
  .pp-hero__tap-icon {
    width: 1.6rem;
    height: 1.6rem;
  }
  .pp-hero__tap-text {
    font-size: calc(1.2rem * var(--t-button-size, 1));
  }
}
@media (prefers-reduced-motion: reduce) {
  .pp-hero__swing,
  .pp-hero__tap-icon {
    animation: none;
  }
  .pp-hero__bloom,
  .pp-hero__card,
  .pp-hero__bunting {
    transition: none;
  }
}
</style>
