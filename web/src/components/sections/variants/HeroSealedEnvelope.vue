<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import FxText from '@/components/ui/FxText.vue'
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
import type { TextEffect } from '@/services/textEffectService'
import type { ResolvedSection } from '@/types/event'

/**
 * Portada "sobre con lacre" (`sobre-lacre`): un sobre tradicional, apaisado, de papel de
 * color (el olivo del tema, `--color-olivo`) con la solapa triangular arriba, cerrada con un
 * lacre dorado con el monograma. Al tocar empieza la música y:
 *
 * 1. el lacre se desvanece en su lugar (los lacres no se mueven);
 * 2. la solapa abre sobre su bisagra de arriba: la de afuera gira hacia quien mira hasta
 *    quedar de canto y la de adentro (el forro de damasco) sigue el giro hasta quedar
 *    parada detrás de la tarjeta (dos piezas planas, sin 3D compartido: nada queda
 *    flotando ni se cruza);
 * 3. la tarjeta sube desde adentro del sobre hasta salir;
 * 4. la tarjeta pasa al frente y crece a su lugar mientras el sobre entero (con su solapa)
 *    baja y se desvanece: queda solo la tarjeta, con su lacre arriba;
 * 5. al final, si la portada ya no ocupa la pantalla, la tarjeta se acomoda arriba con un
 *    deslizamiento (FLIP, solo transform).
 *
 * La tarjeta es la portada: el encabezado (`titulo`), los papás (los grupos de la
 * bendición), los nombres en mayúsculas espaciadas con el "&" caligráfico, la frase
 * (`texto`), la fecha y la ciudad. Los efectos de texto de la sección (FxText) arrancan
 * cuando la tarjeta llega: máquina de escribir en el encabezado, letras estampadas, tinta o
 * letterpress en los nombres y caligrafía en el "&".
 *
 * Mientras está cerrado la página no se mueve (ni con el dedo ni con las teclas). Con "menos
 * movimiento" ya aparece abierta; en el gestor se ve abierta, salvo en "Ver como invitado".
 * Sirve en cualquier tema: los colores salen de la paleta y el damasco es una ranura (`forro`).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const music = useMusic()
const invitation = useInvitation()
const reduced = useReducedMotion()
const preview = usePreview()

type Phase = 'closed' | 'opening' | 'presenting' | 'open'
const phase = ref<Phase>(
  !reduced.value || !!preview.value ? (preview.value?.envelopeOpen ? 'open' : 'closed') : 'open',
)
useScrollLock(() => phase.value === 'closed' || phase.value === 'opening', { strict: true })

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const settle = ref<number | null>(null)
// Lo que sube la tarjeta mientras crece, para quedar ya en su lugar cuando la portada se acorta.
const lift = ref(0)

const lining = computed(() =>
  decorOr(props.section.decor, 'lining', resolveAsset.value('damasco.svg')),
)
const stageStyle = computed(() => ({
  ...(lining.value ? { '--lh-lining': `url("${lining.value.replace(/"/g, '%22')}")` } : {}),
  ...(settle.value !== null ? { '--lh-settle': `${settle.value}px` } : {}),
  '--lh-lift': `${lift.value}px`,
}))

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
// Los efectos de texto arrancan cuando la tarjeta ya llegó a su lugar.
const textOn = computed(() => phase.value === 'open')
const fx = computed(() => props.section.effects)

// Con la máquina de escribir, se escribe toda la portada, un texto tras otro (ms entre letras
// a velocidad 1). Sin ella, cada texto conserva su efecto o va quieto.
const TYPE_STEP = 28
const typed = computed(() => fx.value.includes('typewriter-title'))
const typing = computed(() => {
  const at: Record<string, number> = {}
  let t = 0
  let last = ''
  const add = (key: string, text?: string | null) => {
    if (!text) return
    at[key] = t
    last = key
    t += (Array.from(text).length + 4) * TYPE_STEP
  }
  add('title', props.section.title)
  parents.value.forEach((g, i) => {
    add(`role${i}`, g.role)
    g.names.forEach((n, j) => add(`parent${i}-${j}`, n))
  })
  if (names.value.length === 2) {
    add('name0', names.value[0])
    add('amp', '&')
    add('name1', names.value[1])
  } else {
    add('name0', names.value[0])
  }
  add('text', props.section.text)
  add('date', date.value)
  add('place', place.value)
  return { at, last }
})
// Props de FxText de cada texto: efectos propios (o ninguno) y, si se escribe todo, su turno.
const typeProps = (key: string, alone: readonly TextEffect[] = []) =>
  typed.value
    ? {
        effects: fx.value,
        allow: ['typewriter-title'] as TextEffect[],
        active: textOn.value,
        delay: typing.value.at[key] ?? 0,
        step: TYPE_STEP,
        endCaret: typing.value.last === key,
      }
    : { effects: alone.length ? fx.value : [], allow: alone, active: textOn.value }

const timers: ReturnType<typeof setTimeout>[] = []
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms * motionScale()))

async function finish() {
  if (phase.value === 'open') return
  const before = stage.value?.getBoundingClientRect().top ?? 0
  phase.value = 'open'
  await nextTick()
  const after = stage.value?.getBoundingClientRect().top ?? 0
  // La tarjeta ya subió `lift` mientras crecía; solo falta lo que reste (si algo) para su lugar.
  const rest = Math.round(before - after - lift.value)
  if (Math.abs(rest) > 2 && !reduced.value) {
    settle.value = rest
    later(1200, () => (settle.value = null))
  }
}

function open() {
  if (phase.value !== 'closed') return
  void music?.play() // dentro del toque: así iOS sí deja sonar
  if (reduced.value) {
    phase.value = 'open'
    return
  }
  // La portada ocupa la pantalla y la tarjeta está centrada; al terminar se acorta y la
  // tarjeta queda arriba. Se mide ahora para que suba mientras crece, en un solo movimiento.
  if (root.value && stage.value) {
    const pad = parseFloat(getComputedStyle(root.value).paddingTop) || 0
    const centered = stage.value.getBoundingClientRect().top - root.value.getBoundingClientRect().top - pad
    lift.value = Math.max(0, Math.round(centered))
  }
  phase.value = 'opening'
  later(2300, () => (phase.value = 'presenting'))
  // por si animationend no llega (todo dura ~3.6 s a velocidad 1)
  later(3800, () => void finish())
}
function onCardEnd(e: AnimationEvent) {
  if (e.animationName.includes('lh-present')) void finish()
}
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div ref="root" class="lh" :class="`lh--${phase}`">
    <div
      ref="stage"
      class="lh__stage"
      :class="{ 'is-settling': settle !== null }"
      :style="stageStyle"
      :data-open="phase === 'closed' ? '' : undefined"
      @click="open"
    >
      <!-- El sobre (apaisado): fondo con forro, solapa de adentro, tarjeta, bolsa y solapa de afuera. -->
      <div v-if="phase !== 'open'" class="lh__envelope" aria-hidden="true">
        <div class="lh__back"><span class="lh__damask" /></div>
        <div class="lh__flap-in"><span class="lh__damask" /></div>
      </div>

      <!-- La tarjeta: la portada. -->
      <div class="lh__card" @animationend="onCardEnd">
        <div
          class="lh__paper paper-notched"
          data-fillet="burgundy"
          :style="{ '--lh-chars': String(longest) }"
        >
          <p v-if="section.title" class="lh__kicker" data-text="title">
            <FxText :text="section.title" v-bind="typeProps('title', ['gold-leaf'])" />
          </p>
          <div v-if="parents.length" class="lh__parents" :class="{ 'lh__parents--one': parents.length === 1 }">
            <div v-for="(group, i) in parents" :key="i" class="lh__parent">
              <p class="lh__role" data-text="role">
                <FxText :text="group.role" v-bind="typeProps(`role${i}`)" />
              </p>
              <p class="lh__parent-names" data-text="names">
                <span v-for="(n, j) in group.names" :key="j"
                  ><FxText :text="n" v-bind="typeProps(`parent${i}-${j}`)"
                /></span>
              </p>
            </div>
          </div>
          <h1 class="lh__names" data-text="name">
            <template v-if="names.length === 2">
              <span class="lh__name"
                ><FxText
                  :text="names[0]!"
                  v-bind="typeProps('name0', ['stamp', 'ink-dry', 'letterpress'])"
              /></span>
              <span class="lh__amp" aria-label="y"
                ><FxText text="&" v-bind="typeProps('amp', ['calligraphy'])"
              /></span>
              <span class="lh__name"
                ><FxText
                  :text="names[1]!"
                  v-bind="typeProps('name1', ['stamp', 'ink-dry', 'letterpress'])"
              /></span>
            </template>
            <span v-else class="lh__name"
              ><FxText :text="names[0] ?? ''" v-bind="typeProps('name0', ['stamp', 'ink-dry', 'letterpress'])"
            /></span>
          </h1>
          <p v-if="section.text" class="lh__text" data-text="text">
            <FxText :text="section.text" v-bind="typeProps('text')" />
          </p>
          <p v-if="date" class="lh__date" data-text="date">
            <FxText :text="date" v-bind="typeProps('date')" />
          </p>
          <p v-if="place" class="lh__place" data-text="place">
            <FxText :text="place" v-bind="typeProps('place')" />
          </p>
        </div>
        <WaxSeal class="lh__card-seal" tone="gold" size="18%" seed="tarjeta" />
      </div>

      <div v-if="phase !== 'open'" class="lh__front" aria-hidden="true">
        <div class="lh__pocket">
          <svg class="lh__seams" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100L41 52M100 100L59 52M0 0L50 42L100 0" />
          </svg>
          <p v-if="family" class="lh__to" data-text="to">{{ family }}</p>
        </div>
        <div class="lh__flap-out" />
        <WaxSeal class="lh__seal" tone="gold" size="17%" seed="sobre-lacre" />
      </div>

      <button
        v-if="phase === 'closed'"
        type="button"
        class="lh__open"
        data-text="button"
        @click.stop="open"
      >
        {{ section.button ?? 'Toca para abrir' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * Medidas: el escenario es la tarjeta (ancho W = 100cqi del escenario, alto 1.4 W). El sobre
 * mide k·W de ancho y 0.66·k·W de alto, centrado en el escenario (k = 1 en el celular y 1.3
 * en pantallas anchas). Adentro del sobre, la tarjeta va a escala 0.39·k; al subir, su
 * centro llega a 0.45·k·W arriba del centro: su pie ya pasó la orilla en V de la bolsa.
 */
.lh {
  container-type: inline-size;
  display: grid;
  place-content: start center;
  justify-items: center;
  /* lugar para el lacre que corona la tarjeta */
  padding-top: 1.4rem;
}
.lh__stage {
  --lh-k: 1;
}
@container (min-width: 560px) {
  .lh__stage {
    --lh-k: 1.3;
  }
}
.lh--closed,
.lh--opening,
.lh--presenting {
  place-content: center;
  min-height: calc(100svh - 2 * var(--section-gap));
}
.lh__stage {
  --lh-ink: var(--color-text);
  --lh-olive: var(--color-olivo, var(--color-primary));
  --lh-paper: var(--color-paper, var(--color-surface));
  container-type: inline-size;
  position: relative;
  /* la tarjeta cabe a lo alto de la pantalla */
  width: min(100cqi, 27rem, calc((100svh - 7rem) / 1.4));
  aspect-ratio: 100 / 140;
}
.lh--closed .lh__stage {
  cursor: pointer;
}
.lh__stage.is-settling {
  animation: lh-settle calc(1s * var(--motion-scale)) cubic-bezier(0.25, 0.8, 0.25, 1) both;
}
@keyframes lh-settle {
  from {
    transform: translateY(var(--lh-settle, 0));
  }
  to {
    transform: none;
  }
}

/* ------------------------------------------------------------------ el sobre */
.lh__envelope,
.lh__front {
  position: absolute;
  left: calc(50% - var(--lh-k) * 50cqi);
  top: calc(50% - var(--lh-k) * 33cqi);
  width: calc(var(--lh-k) * 100cqi);
  height: calc(var(--lh-k) * 66cqi);
  pointer-events: none;
}
.lh__envelope {
  filter: drop-shadow(0 14px 18px rgb(40 30 20 / 0.28));
}
/* El fondo del sobre por dentro: olivo oscuro con el forro de damasco arriba. */
.lh__back {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--lh-olive) 80%, #000);
}
.lh__back .lh__damask {
  inset: 1.2% 1.2% 50%;
}
/* La solapa abierta (por dentro: el forro), parada sobre la orilla de arriba. */
.lh__flap-in {
  position: absolute;
  left: 0;
  bottom: 100%;
  width: 100%;
  height: 52%;
  transform-origin: 50% 100%;
  transform: perspective(900px) rotateX(-90deg);
  opacity: 0;
}
.lh__flap-in .lh__damask {
  inset: 0;
  clip-path: polygon(0 100%, 46% 5%, 50% 0, 54% 5%, 100% 100%);
}
/* La bolsa: el papel de color con su trama, las costuras y la abertura en V arriba. */
.lh__pocket {
  position: absolute;
  inset: 0;
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 180px,
    linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 40%, rgb(0 0 0 / 0.14)),
    var(--lh-olive);
  clip-path: polygon(0 0, 50% 42%, 100% 0, 100% 100%, 0 100%);
}
.lh__seams {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: rgb(0 0 0 / 0.24);
  stroke-width: 1;
}
.lh__seams path {
  vector-effect: non-scaling-stroke;
}
.lh__to {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 12%;
  margin: 0;
  text-align: center;
  font-family: var(--t-to-font, var(--font-script));
  font-size: calc(clamp(1.05rem, 6cqi, 1.9rem) * var(--t-to-size, 1));
  line-height: 1.1;
  color: var(--t-to-color, var(--lh-paper));
  opacity: 0.92;
}
/* La solapa cerrada: el triángulo de afuera, con la bisagra en la orilla de arriba. */
.lh__flap-out {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 54%;
  transform-origin: 50% 0;
  transform: perspective(900px) rotateX(0deg);
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 180px,
    linear-gradient(180deg, rgb(255 255 255 / 0.05), rgb(0 0 0 / 0.12)),
    color-mix(in srgb, var(--lh-olive) 92%, #fff);
  clip-path: polygon(0 0, 100% 0, 53.5% 94%, 50% 100%, 46.5% 94%);
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.25));
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
/* El lacre que cierra: en la punta de la solapa (su sombra la pinta WaxSeal). Quieto. */
.lh__seal {
  position: absolute;
  left: 41.5%;
  top: 41%;
  width: 17%;
}

/* ------------------------------------------------------------------ la tarjeta */
.lh__card {
  /* todo lo de la tarjeta se mide contra su ancho (cqi) */
  container-type: inline-size;
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 1px 1px rgb(59 52 46 / 0.18)) drop-shadow(0 12px 16px rgb(59 52 46 / 0.24));
}
.lh__card-seal {
  position: absolute;
  left: 41%;
  top: -6%;
}
.lh__paper {
  /* paper-notched la deja en position: relative: llena la tarjeta con su alto */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3.2cqi;
  padding: 11cqi 9cqi 14cqi;
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
/* Adentro del sobre: chica, un poco abajo del centro (asoma por la V cuando abre). */
.lh--closed .lh__card,
.lh--opening .lh__card {
  transform: translateY(calc(var(--lh-k) * 3cqi)) scale(calc(0.39 * var(--lh-k)));
}
.lh--closed .lh__card-seal,
.lh--opening .lh__card-seal {
  opacity: 0;
}

/* ------------------------------------------------------------------ abriendo */
.lh--opening .lh__seal {
  animation: lh-seal-fade calc(0.35s * var(--motion-scale)) ease-out forwards;
}
.lh--opening .lh__flap-out {
  animation: lh-flap-out calc(0.55s * var(--motion-scale)) cubic-bezier(0.5, 0, 0.9, 0.6)
    calc(0.35s * var(--motion-scale)) forwards;
}
.lh--opening .lh__flap-in {
  animation: lh-flap-in calc(0.5s * var(--motion-scale)) cubic-bezier(0.1, 0.4, 0.4, 1)
    calc(0.9s * var(--motion-scale)) forwards;
}
.lh--opening .lh__card {
  animation: lh-rise calc(1s * var(--motion-scale)) cubic-bezier(0.4, 0, 0.2, 1)
    calc(1.3s * var(--motion-scale)) both;
}
/* Cada pieza que se mueve va en su propia capa: así el navegador solo la traslada y no repinta. */
.lh--opening .lh__card,
.lh--opening .lh__flap-out,
.lh--opening .lh__flap-in,
.lh--presenting .lh__card,
.lh--presenting .lh__envelope,
.lh--presenting .lh__front {
  will-change: transform, opacity;
}
/* El lacre de la solapa no se mueve: se desvanece en su lugar antes de que la solapa gire. */
@keyframes lh-seal-fade {
  to {
    opacity: 0;
  }
}
@keyframes lh-flap-out {
  from {
    transform: perspective(900px) rotateX(0deg);
  }
  to {
    transform: perspective(900px) rotateX(90deg);
  }
}
@keyframes lh-flap-in {
  0% {
    transform: perspective(900px) rotateX(-90deg);
    opacity: 1;
  }
  100% {
    transform: perspective(900px) rotateX(0deg);
    opacity: 1;
  }
}
@keyframes lh-rise {
  from {
    transform: translateY(calc(var(--lh-k) * 3cqi)) scale(calc(0.39 * var(--lh-k)));
  }
  to {
    transform: translateY(calc(var(--lh-k) * -45cqi)) scale(calc(0.39 * var(--lh-k)));
  }
}

/* ------------------------------------------------------------------ la tarjeta al frente */
/* La solapa quedó abierta (parada) y la de afuera de canto: así siguen hasta irse. */
.lh--presenting .lh__seal,
.lh--presenting .lh__flap-out {
  opacity: 0;
}
.lh--presenting .lh__flap-in {
  transform: perspective(900px) rotateX(0deg);
  opacity: 1;
}
/* La tarjeta pasa adelante de la bolsa (va después en el orden) y crece a su lugar. */
.lh--presenting .lh__card {
  z-index: 2;
  animation: lh-present calc(1.25s * var(--motion-scale)) cubic-bezier(0.3, 0.1, 0.2, 1) both;
}
/* El sobre entero baja y se desvanece: no queda nada de él. */
.lh--presenting .lh__envelope,
.lh--presenting .lh__front {
  animation: lh-leave calc(0.85s * var(--motion-scale)) cubic-bezier(0.5, 0, 0.75, 0.2) forwards;
}
.lh--presenting .lh__card-seal {
  animation: lh-appear calc(0.6s * var(--motion-scale)) ease-out
    calc(0.75s * var(--motion-scale)) both;
}
@keyframes lh-present {
  from {
    transform: translateY(calc(var(--lh-k) * -45cqi)) scale(calc(0.39 * var(--lh-k)));
  }
  to {
    transform: translateY(calc(var(--lh-lift, 0px) * -1));
  }
}
@keyframes lh-leave {
  from {
    transform: none;
    opacity: 1;
  }
  to {
    transform: translateY(45%) scale(0.96);
    opacity: 0;
  }
}
/* El lacre de la tarjeta aparece en su lugar, sin rebote ni movimiento. */
@keyframes lh-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ------------------------------------------------------------------ el botón */
.lh__open {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--lh-k) * 33cqi + 1.1rem);
  translate: -50% 0;
  padding: 0.5rem 1.2rem;
  border: 0;
  background: none;
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: 0.3em;
  white-space: nowrap;
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
