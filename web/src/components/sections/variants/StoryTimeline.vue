<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useEvent } from '@/composables/useEvent'
import { swipeStep, tabTarget } from '@/services/tabsService'
import type { ResolvedSection } from '@/types/event'

/**
 * Historia en línea de tiempo ("cronologia"): compacta e interactiva. Arriba el título y el
 * mensaje (con su capitular); luego un hilo con los años como pestañas y un lacre pequeño
 * que viaja al año elegido. Debajo, un montón de tarjetas de papel: la de enfrente trae la
 * foto con marco fino, el año, el título y el texto del momento; al cambiar de año la
 * tarjeta sale hacia un lado y entra la otra, y las de atrás se reacomodan. Se cambia con
 * los años, con las flechas del teclado (patrón de pestañas: flechas, Inicio y Fin) o
 * deslizando el dedo. En pantallas anchas el mensaje va a la izquierda y la línea de tiempo
 * a la derecha. Con menos movimiento solo hay fundido. Solo tokens del tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Nuestra historia')
const moments = computed(() =>
  (props.section.moments ?? []).map((m, i) => ({
    ...m,
    year: m.year || String(i + 1).padStart(2, '0'),
    photo: m.photo ? resolveAsset.value(m.photo) : null,
  })),
)
const count = computed(() => moments.value.length)
const active = ref(0)
const uid = `st-${props.section.id}`
const tabs = ref<HTMLButtonElement[]>([])

const select = (i: number, focus = false) => {
  if (i < 0 || i >= count.value) return
  active.value = i
  if (focus) void nextTick(() => tabs.value[i]?.focus())
}
const onKey = (e: KeyboardEvent) => {
  const target = tabTarget(e.key, active.value, count.value)
  if (target === null) return
  e.preventDefault()
  select(target, true)
}

// Deslizar el dedo sobre las tarjetas: a la izquierda, el siguiente momento.
let start: { x: number; y: number } | null = null
const onDown = (e: PointerEvent) => {
  start = { x: e.clientX, y: e.clientY }
}
const onUp = (e: PointerEvent) => {
  if (!start) return
  const step = swipeStep(e.clientX - start.x, e.clientY - start.y)
  start = null
  if (step) select((active.value + step + count.value) % count.value)
}

// El lacre del hilo: el centro de la pestaña activa, en % del ancho del hilo.
const markerStyle = computed(() => ({
  transform: `translateX(${((active.value + 0.5) / Math.max(1, count.value)) * 100}%)`,
}))
</script>

<template>
  <div class="st" :class="{ 'st--timeline': count }">
    <div class="st__lead">
      <header class="st__head">
        <p v-if="section.subtitle" class="st__subtitle" data-text="subtitle">
          {{ section.subtitle }}
        </p>
        <h2 class="st__title" data-text="title">{{ title }}</h2>
        <span class="st__rule" aria-hidden="true" />
      </header>
      <p v-if="section.text" class="st__intro" data-text="text">{{ section.text }}</p>
    </div>

    <div v-if="count" class="st__timeline">
      <div class="st__tabs" role="tablist" :aria-label="title" @keydown="onKey">
        <span class="st__thread" aria-hidden="true">
          <span class="st__marker-track" :style="markerStyle">
            <span class="st__marker">
              <WaxSeal size="1.7rem" tone="gold" :seed="`${uid}-dot`" />
            </span>
          </span>
        </span>
        <button
          v-for="(moment, i) in moments"
          :id="`${uid}-tab-${i}`"
          :key="i"
          ref="tabs"
          type="button"
          role="tab"
          class="st__tab"
          :class="{ 'is-active': i === active }"
          :aria-selected="i === active"
          :aria-controls="`${uid}-panel-${i}`"
          :tabindex="i === active ? 0 : -1"
          @click="select(i)"
        >
          <span class="st__tab-year" data-text="year">{{ moment.year }}</span>
        </button>
      </div>

      <div class="st__stage" @pointerdown="onDown" @pointerup="onUp" @pointercancel="start = null">
        <span
          class="st__sheet st__sheet--back"
          :style="{ '--k': active % 2 ? 1 : -1 }"
          aria-hidden="true"
        />
        <span
          class="st__sheet st__sheet--mid"
          :style="{ '--k': active % 2 ? -1 : 1 }"
          aria-hidden="true"
        />
        <article
          v-for="(moment, i) in moments"
          :id="`${uid}-panel-${i}`"
          :key="i"
          role="tabpanel"
          class="st__card"
          :class="{ 'is-active': i === active }"
          :style="{ '--side': i < active ? -1 : 1 }"
          :aria-labelledby="`${uid}-tab-${i}`"
          :aria-hidden="i === active ? undefined : 'true'"
          :inert="i !== active || undefined"
          :tabindex="i === active ? 0 : -1"
        >
          <figure class="st__figure">
            <img
              v-if="moment.photo"
              :src="moment.photo"
              :alt="moment.title"
              class="st__photo fx-photo"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
            <span v-else class="st__seal">
              <WaxSeal size="58%" shape="oval" tone="burgundy" :seed="`${uid}-${i}`" />
            </span>
          </figure>
          <div class="st__body">
            <p class="st__year" aria-hidden="true">{{ moment.year }}</p>
            <h3 class="st__moment" data-text="moment">{{ moment.title }}</h3>
            <p v-if="moment.text" class="st__detail" data-text="detail">{{ moment.text }}</p>
            <p class="st__count" aria-hidden="true">{{ i + 1 }} / {{ count }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  max-width: 64rem;
  margin: 0 auto;
}
.st__lead {
  display: grid;
  gap: var(--space-2);
  align-content: center;
}
.st__head {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  text-align: center;
}
.st__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-borgona, var(--color-accent)));
}
.st__title {
  margin: 0;
  margin-right: -0.14em;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.6rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.st__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}
.st__intro {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.06rem, 4.4cqi, 1.18rem) * var(--t-text-size, 1));
  line-height: 1.55;
  color: var(--t-text-color, var(--color-text));
  text-wrap: pretty;
}
/* La capitular, en la letra de los títulos y en borgoña. */
.st__intro::first-letter {
  float: left;
  margin: 0.06em 0.1em 0 0;
  font-family: var(--font-display);
  font-size: 3.3em;
  line-height: 0.82;
  color: var(--color-borgona, var(--color-accent));
}

/* ---- El hilo con los años ---- */
.st__timeline {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}
.st__tabs {
  position: relative;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  padding-top: 2.2rem;
}
.st__thread {
  position: absolute;
  top: 0.85rem;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in srgb, var(--color-text) 30%, transparent);
}
/* Los puntos de cada año sobre el hilo (el hilo va 1.35rem arriba de la pestaña). */
.st__tab::before {
  content: '';
  position: absolute;
  top: -1.35rem;
  left: 50%;
  width: 0.45rem;
  aspect-ratio: 1;
  translate: -50% -50%;
  rotate: 45deg;
  background: var(--color-bg);
  border: 1px solid color-mix(in srgb, var(--color-text) 55%, transparent);
}
.st__marker-track {
  position: absolute;
  inset: 0 0 auto;
  height: 0;
  transition: transform calc(0.7s * var(--motion-scale)) var(--ease-out, ease-out);
}
.st__marker {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  display: block;
  width: 1.7rem;
  translate: -50% -50%;
}
.st__marker :deep(.seal) {
  display: block;
}
.st__tab {
  position: relative;
  display: grid;
  justify-items: center;
  padding: 0.25rem 0.2rem 0.35rem;
  border: 0;
  background: none;
  cursor: pointer;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}
.st__tab-year {
  font-family: var(--t-year-font, var(--font-display));
  font-size: calc(clamp(1.15rem, 5cqi, 1.45rem) * var(--t-year-size, 1));
  letter-spacing: 0.08em;
  line-height: 1;
  color: var(--t-year-color, color-mix(in srgb, var(--color-text) 50%, transparent));
  transition: color calc(0.4s * var(--motion-scale)) ease;
}
.st__tab::after {
  content: '';
  width: 1.4rem;
  height: 1px;
  margin-top: 0.4rem;
  background: var(--color-borgona, var(--color-accent));
  transform: scaleX(0);
  transition: transform calc(0.5s * var(--motion-scale)) var(--ease-out, ease-out);
}
.st__tab.is-active .st__tab-year {
  color: var(--t-year-color, var(--color-text));
}
.st__tab.is-active::after {
  transform: none;
}
.st__tab:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}

/* ---- Las tarjetas apiladas ---- */
.st__stage {
  position: relative;
  display: grid;
  touch-action: pan-y;
  user-select: none;
}
/* Dos hojas de atrás asoman ladeadas; se reacomodan al cambiar de momento. */
.st__sheet {
  grid-area: 1 / 1;
  background: var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.08),
    0 8px 16px -10px rgb(0 0 0 / 0.35);
  transition: transform calc(0.7s * var(--motion-scale)) var(--ease-out, ease-out);
}
.st__sheet--back {
  transform: rotate(calc(var(--k) * 2.6deg)) translateY(0.3rem);
  filter: brightness(0.94);
}
.st__sheet--mid {
  transform: rotate(calc(var(--k) * 1.3deg)) translateY(0.15rem);
  filter: brightness(0.97);
}
.st__card {
  /* La tinta de la página: la tarjeta es clara aunque el fondo cambie. */
  --ink: var(--root-text, var(--color-text));
  grid-area: 1 / 1;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  padding: 0.85rem;
  color: var(--ink);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--color-paper, var(--color-surface));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.1),
    0 12px 22px -14px rgb(0 0 0 / 0.45);
  outline: 1px solid color-mix(in srgb, var(--color-borgona, var(--ink)) 35%, transparent);
  outline-offset: -0.4rem;
  opacity: 0;
  visibility: hidden;
  transform: translateX(calc(var(--side) * 2.4rem)) rotate(calc(var(--side) * 2.5deg));
  transition:
    opacity calc(0.45s * var(--motion-scale)) ease,
    transform calc(0.6s * var(--motion-scale)) var(--ease-out, ease-out),
    visibility 0s linear calc(0.6s * var(--motion-scale));
}
.st__card.is-active {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: calc(0.08s * var(--motion-scale)), calc(0.08s * var(--motion-scale)), 0s;
}
.st__card:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
.st__figure {
  margin: 0;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: color-mix(in srgb, var(--ink) 6%, var(--color-paper, #fff));
}
.st__photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.st__seal {
  display: grid;
  place-items: center;
  height: 100%;
}
.st__body {
  display: grid;
  align-content: center;
  gap: 0.3rem;
  min-width: 0;
  padding-right: 0.35rem;
}
.st__year {
  margin: 0;
  font-family: var(--t-year-font, var(--font-display));
  font-size: calc(clamp(1.9rem, 9cqi, 2.6rem) * var(--t-year-size, 1));
  line-height: 1;
  letter-spacing: 0.05em;
  color: var(--color-borgona, var(--color-accent));
}
.st__moment {
  margin: 0;
  font-family: var(--t-moment-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-moment-size, 1));
  letter-spacing: 0.2em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--t-moment-color, var(--ink));
}
.st__detail {
  margin: 0;
  font-family: var(--t-detail-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1rem * var(--t-detail-size, 1));
  line-height: 1.4;
  color: var(--t-detail-color, color-mix(in srgb, var(--ink) 82%, transparent));
}
.st__count {
  margin: 0.2rem 0 0;
  font-family: var(--font-caps);
  font-size: 0.66rem;
  letter-spacing: 0.24em;
  color: color-mix(in srgb, var(--ink) 55%, transparent);
}

/* Ancho: el mensaje a la izquierda y la línea de tiempo a la derecha. */
@container (min-width: 46rem) {
  .st--timeline {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    column-gap: var(--space-5);
    align-items: center;
  }
  .st--timeline .st__head {
    justify-items: start;
    text-align: start;
  }
  .st__intro {
    text-align: justify;
    hyphens: auto;
  }
  .st__card {
    padding: 1rem;
    gap: 1.3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .st__marker-track,
  .st__sheet {
    transition: none;
  }
  .st__card,
  .st__card.is-active {
    transform: none;
    transition:
      opacity calc(0.3s * var(--motion-scale)) ease,
      visibility 0s linear calc(0.3s * var(--motion-scale));
  }
  .st__card.is-active {
    transition-delay: 0s;
  }
}
</style>
