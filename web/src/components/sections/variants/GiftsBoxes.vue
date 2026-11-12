<script setup lang="ts">
import { computed, nextTick, reactive } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import RibbonBow from '@/components/ui/RibbonBow.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits, storeNumberLabel } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos de cajas ("cajas"): cada tienda (Liverpool, Amazon…) y la transferencia son
 * una caja de regalo envuelta (papel con rayas, vichy o lunares, que se turnan por caja), con
 * el listón en cruz, un moño de listón (`RibbonBow`) arriba y el nombre en una etiqueta. En
 * reposo la tapa da un saltito de vez en cuando, a destiempo por caja. Los datos no se ven de
 * entrada: al tocarla, la caja gira en 3D (rotateY con perspectiva) y el dorso de papel enseña
 * el número de evento o de lista, la cuenta o CLABE (de 4 en 4) con su botón "Copiar" y
 * "Ver mesa". Es la misma lógica de "volteo": el frente es un botón con aria-pressed (Enter o
 * Espacio), el dorso tiene "Ocultar" y la cara que no se ve queda inerte. Las notas de cada
 * tienda (por ejemplo "lluvia de pañales") se leen debajo de su caja. Con menos movimiento no
 * hay saltito y las caras solo se funden. Por el enlace general los datos bancarios no llegan
 * (GiftPrivacy los quita en el servidor): esa caja no se voltea y avisa dónde están. Sirve en
 * cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()

const title = computed(() => props.section.title ?? 'Mesa de regalos')
const button = computed(() => props.section.button ?? 'Ver mesa')
const stores = computed(() =>
  (event.value.gifts?.stores ?? []).map((store, i) => ({
    ...store,
    id: `store-${i}`,
    numberLabel: storeNumberLabel(store),
  })),
)
// Solo la caja de transferencia de la propia mesa: la lluvia de sobres es otra sección y no se repite aquí.
const envelope = computed(() => event.value.gifts?.envelope ?? null)
const uid = `gb-${props.section.id}`
// El estampado se turna por caja, empezando por las tiendas y después la transferencia.
const WRAPS = ['stripes', 'gingham', 'dots'] as const
const wrapOf = (index: number) => WRAPS[index % WRAPS.length]
const delayOf = (index: number) => `${(index % 4) * -1.7}s`

const open = reactive<Record<string, boolean>>({})
const faces = new Map<string, HTMLElement>()
const keep = (id: string) => (el: unknown) => {
  if (el instanceof HTMLElement) faces.set(id, el)
  else faces.delete(id)
}
const toggle = (id: string) => {
  open[id] = !open[id]
  // El foco sigue a la cara que se ve: el primer control del dorso o el botón del frente.
  void nextTick(() =>
    faces
      .get(`${id}-${open[id] ? 'back' : 'front'}`)
      ?.querySelector<HTMLElement>('button, a')
      ?.focus({ preventScroll: true }),
  )
}
// Un toque en el papel del dorso (fuera de sus botones) la vuelve a girar.
const onBack = (id: string, e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('a, button')) toggle(id)
}
</script>

<template>
  <div class="gb">
    <header class="gb__head">
      <h2 class="gb__title" data-text="title">{{ title }}</h2>
      <p v-if="section.text" class="gb__text" data-text="text">{{ section.text }}</p>
    </header>

    <ul class="gb__cards">
      <li v-for="(store, i) in stores" :key="store.id" class="gb__item">
        <div
          class="gb__card"
          :class="[`is-${wrapOf(i)}`, { 'is-open': open[store.id] }]"
          :style="{ '--gb-delay': delayOf(i) }"
        >
          <div class="gb__inner">
            <div
              :ref="keep(`${store.id}-front`)"
              class="gb__face gb__face--front"
              :inert="open[store.id] || undefined"
            >
              <span class="gb__art" aria-hidden="true">
                <span class="gb__body" />
                <span class="gb__top"><RibbonBow class="gb__bow" /></span>
              </span>
              <span class="gb__tag">
                <h3 class="gb__name" data-text="store">{{ store.name }}</h3>
                <span class="gb__hint" aria-hidden="true">Toca para abrir</span>
              </span>
              <button
                type="button"
                class="gb__toggle"
                :aria-pressed="!!open[store.id]"
                :aria-controls="`${uid}-${store.id}`"
                :aria-label="`Ver los datos de ${store.name}`"
                @click="toggle(store.id)"
              />
            </div>
            <div
              :id="`${uid}-${store.id}`"
              :ref="keep(`${store.id}-back`)"
              class="gb__face gb__face--back"
              :inert="!open[store.id] || undefined"
              @click="onBack(store.id, $event)"
            >
              <p class="gb__label">{{ store.name }}</p>
              <template v-if="store.event_number">
                <p class="gb__kicker">{{ store.numberLabel }}</p>
                <p class="gb__number">{{ store.event_number }}</p>
                <button
                  type="button"
                  class="gb__copy"
                  :aria-label="`Copiar el ${store.numberLabel.toLowerCase()} ${store.event_number}`"
                  @click="copy(store.event_number, store.id)"
                >
                  <AppIcon name="copy" /> {{ copied === store.id ? 'Copiado' : 'Copiar' }}
                </button>
              </template>
              <a
                v-if="store.url"
                :href="store.url"
                class="gb__button inv-btn"
                data-text="button"
                target="_blank"
                rel="noopener"
                :aria-label="`${button}: ${store.name}`"
              >
                {{ button }}
              </a>
              <button
                type="button"
                class="gb__hide"
                :aria-pressed="!!open[store.id]"
                :aria-label="`Ocultar los datos de ${store.name}`"
                @click="toggle(store.id)"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
        <p v-if="store.note" class="gb__note" data-text="store">{{ store.note }}</p>
      </li>

      <li v-if="envelope" class="gb__item gb__item--wide">
        <div
          class="gb__card"
          :class="[`is-${wrapOf(stores.length)}`, { 'is-open': open.transfer, 'is-fixed': !envelope.account }]"
          :style="{ '--gb-delay': delayOf(stores.length) }"
        >
          <div class="gb__inner">
            <div
              :ref="keep('transfer-front')"
              class="gb__face gb__face--front"
              :inert="open.transfer || undefined"
            >
              <span class="gb__art" aria-hidden="true">
                <span class="gb__body" />
                <span class="gb__top"><RibbonBow class="gb__bow" /></span>
              </span>
              <span class="gb__tag">
                <h3 class="gb__name" data-text="envelope">
                  {{ envelope.title || 'Lluvia de sobres' }}
                </h3>
                <span v-if="envelope.account" class="gb__hint" aria-hidden="true">Toca para abrir</span>
                <span v-else-if="envelope.hidden" class="gb__private">
                  Los datos para tu sobre vienen en tu invitación personal.
                </span>
              </span>
              <button
                v-if="envelope.account"
                type="button"
                class="gb__toggle"
                :aria-pressed="!!open.transfer"
                :aria-controls="`${uid}-transfer`"
                aria-label="Ver los datos para la transferencia"
                @click="toggle('transfer')"
              />
            </div>
            <div
              v-if="envelope.account"
              :id="`${uid}-transfer`"
              :ref="keep('transfer-back')"
              class="gb__face gb__face--back"
              :inert="!open.transfer || undefined"
              @click="onBack('transfer', $event)"
            >
              <p v-if="envelope.bank" class="gb__label">{{ envelope.bank }}</p>
              <p class="gb__kicker">Cuenta o CLABE</p>
              <p class="gb__number gb__number--account" data-text="account">
                {{ groupDigits(envelope.account) }}
              </p>
              <p v-if="envelope.holder" class="gb__holder">{{ envelope.holder }}</p>
              <button
                type="button"
                class="gb__copy"
                aria-label="Copiar el número de cuenta"
                @click="copy(envelope.account, 'account')"
              >
                <AppIcon name="copy" /> {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
              </button>
              <button
                type="button"
                class="gb__hide"
                :aria-pressed="!!open.transfer"
                aria-label="Ocultar los datos para la transferencia"
                @click="toggle('transfer')"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
        <p v-if="envelope.text" class="gb__note" data-text="envelope">{{ envelope.text }}</p>
        <p v-if="envelope.box" class="gb__note">También habrá caja para sobres en el salón.</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.gb {
  --gb-paper: var(--color-paper, var(--color-surface));
  --gb-ink: var(--color-text);
  --gb-ribbon: var(--color-primary-strong, var(--color-primary));
  container-type: inline-size;
  display: grid;
  gap: var(--space-3);
  max-width: 40rem;
  margin: 0 auto;
}
.gb__head {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  text-align: center;
}
.gb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.4rem, 11cqi, 3.4rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
.gb__text {
  max-width: 36ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.gb__cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.1rem 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gb__item {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  flex: 1 1 min(100%, 11rem);
  max-width: 15rem;
}
.gb__item--wide {
  flex-basis: 100%;
  max-width: none;
}
.gb__item--wide .gb__card {
  width: min(100%, 15rem);
  justify-self: center;
}

/* ---- La caja que gira ---- */
.gb__card {
  display: grid;
  perspective: 900px;
}
.gb__inner {
  position: relative;
  display: grid;
  min-height: 13rem;
  transform-style: preserve-3d;
  transition: transform calc(0.85s * var(--motion-scale)) cubic-bezier(0.3, 0.7, 0.2, 1.08);
}
.gb__card.is-open .gb__inner {
  transform: rotateY(180deg);
}
.gb__face {
  grid-area: 1 / 1;
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
  padding: 1.1rem 0.9rem;
  text-align: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* El frente: la caja envuelta (el estampado y el color se turnan por caja). */
.gb__card {
  --gb-wrap: color-mix(in srgb, var(--color-primary) 34%, #fff);
}
.gb__card.is-gingham {
  --gb-wrap: color-mix(in srgb, var(--color-accent) 42%, #fff);
}
.gb__card.is-dots {
  --gb-wrap: var(--color-cielo, color-mix(in srgb, var(--color-oro, var(--color-primary)) 40%, #fff));
}
.gb__card.is-stripes {
  --gb-pattern: repeating-linear-gradient(90deg, rgb(255 255 255 / 0.6) 0 0.42rem, transparent 0.42rem 0.84rem);
}
.gb__card.is-gingham {
  --gb-pattern:
    repeating-linear-gradient(0deg, rgb(255 255 255 / 0.5) 0 0.5rem, transparent 0.5rem 1rem),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.5) 0 0.5rem, transparent 0.5rem 1rem);
}
.gb__card.is-dots {
  --gb-pattern: radial-gradient(circle, rgb(255 255 255 / 0.85) 0.17rem, transparent 0.19rem) 0 0 / 0.95rem 0.95rem;
}
.gb__art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.gb__body,
.gb__top {
  position: absolute;
  background: var(--gb-pattern), var(--gb-wrap);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--gb-ribbon) 18%, transparent),
    0 0.5rem 0.8rem -0.5rem rgb(0 0 0 / 0.45);
}
.gb__body {
  inset: 4.7rem 9% 0.6rem;
  border-radius: 0.2rem 0.2rem 0.5rem 0.5rem;
}
.gb__top {
  inset: 3rem 4% auto;
  height: 2rem;
  border-radius: 0.4rem;
  transform-origin: 50% 100%;
}
/* El listón en cruz: una tira vertical por la caja y por la tapa. */
.gb__body::before,
.gb__top::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 50%;
  width: 1.5rem;
  translate: -50% 0;
  background: linear-gradient(90deg, var(--gb-ribbon), color-mix(in srgb, var(--gb-ribbon) 70%, #fff) 45%, var(--gb-ribbon));
}
.gb__bow {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 0.9rem);
  width: 4.8rem;
  translate: -50% 0;
}
.gb__card:not(.is-open) .gb__top {
  animation: gb-hop calc(5.6s * var(--motion-scale)) ease-in-out infinite;
  animation-delay: calc(var(--gb-delay, 0s) * var(--motion-scale));
}
/* La etiqueta colgante con el nombre; su botón cubre toda la cara. */
.gb__tag {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  width: 74%;
  margin-top: 4.6rem;
  padding: 0.55rem 0.5rem 0.45rem;
  border: 1px dashed color-mix(in srgb, var(--gb-ribbon) 55%, transparent);
  border-radius: 0.55rem;
  background: var(--gb-paper);
  box-shadow: 0 0.3rem 0.5rem -0.3rem rgb(0 0 0 / 0.5);
  rotate: -3deg;
}
.gb__tag::before {
  content: '';
  position: absolute;
  top: 0.3rem;
  left: 50%;
  width: 0.4rem;
  height: 0.4rem;
  translate: -50% 0;
  border-radius: 50%;
  background: var(--gb-wrap);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gb-ribbon) 55%, transparent);
}
.gb__name {
  margin: 0.45rem 0 0;
  font-family: var(--t-store-font, var(--font-script));
  font-weight: 400;
  font-size: calc(1.55rem * var(--t-store-size, 1));
  line-height: 1.05;
  color: var(--t-store-color, var(--gb-ribbon));
  overflow-wrap: anywhere;
}
.gb__hint {
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--gb-ink) 70%, transparent);
}
/* El botón cubre toda la cara del frente: la caja se toca donde sea. */
.gb__toggle {
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 0;
  border: 0;
  border-radius: 1rem;
  background: none;
  cursor: pointer;
}
.gb__toggle:focus-visible {
  outline: 2px solid var(--gb-ribbon);
  outline-offset: -0.3rem;
}
.gb__private {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.3;
}

/* El dorso: papel con doble filete del color del listón. */
.gb__face--back {
  color: var(--gb-ink);
  background: var(--gb-paper);
  border: 1px solid color-mix(in srgb, var(--gb-ribbon) 65%, transparent);
  border-radius: 1rem;
  box-shadow:
    inset 0 0 0 0.35rem var(--gb-paper),
    inset 0 0 0 calc(0.35rem + 1px) color-mix(in srgb, var(--gb-ribbon) 35%, transparent),
    0 0.6rem 1rem -0.7rem rgb(0 0 0 / 0.5);
  transform: rotateY(180deg);
  cursor: pointer;
}
.gb__label {
  margin: 0;
  font-family: var(--font-script);
  font-size: 1.5rem;
  line-height: 1.1;
  color: var(--gb-ribbon);
}
.gb__kicker {
  margin: 0.1rem 0 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--gb-ink) 75%, transparent);
}
.gb__number {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: calc(clamp(1.15rem, 5cqi, 1.45rem) * var(--t-account-size, 1));
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.gb__holder {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
}
.gb__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gb-ribbon) 55%, transparent);
  border-radius: 999px;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gb-ribbon);
  cursor: pointer;
}
.gb__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.gb__button {
  display: inline-block;
  margin-top: 0.15rem;
  padding: 0.45rem 0.9rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--gb-ribbon));
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.64rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.2em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-surface, #fff)));
}
.gb__hide {
  margin-top: 0.1rem;
  padding: 0.1rem 0.3rem;
  border: 0;
  background: none;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--gb-ink) 40%, transparent);
  color: var(--gb-ink);
  cursor: pointer;
}
.gb__copy:focus-visible,
.gb__button:focus-visible,
.gb__hide:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
.gb__note {
  margin: 0;
  text-align: center;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: 1rem;
  line-height: 1.35;
  color: var(--color-text);
  text-wrap: balance;
}

/* La tapa da un saltito de vez en cuando (casi todo el ciclo está quieta). */
@keyframes gb-hop {
  0%,
  16%,
  100% {
    transform: translateY(0) rotate(0);
  }
  5% {
    transform: translateY(-0.7rem) rotate(-2.5deg);
  }
  9% {
    transform: translateY(-0.1rem) rotate(1.5deg);
  }
  12% {
    transform: translateY(-0.25rem) rotate(-1deg);
  }
}

/* Menos movimiento: sin giro ni saltito; las caras se funden. */
@media (prefers-reduced-motion: reduce) {
  .gb__card:not(.is-open) .gb__top {
    animation: none;
  }
  .gb__inner,
  .gb__card.is-open .gb__inner {
    transform: none;
    transition: none;
  }
  .gb__face {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    transition: opacity calc(0.3s * var(--motion-scale)) ease;
  }
  .gb__face--back {
    transform: none;
    opacity: 0;
  }
  .gb__card.is-open .gb__face--back {
    opacity: 1;
  }
  .gb__card.is-open .gb__face--front {
    opacity: 0;
  }
}
</style>
