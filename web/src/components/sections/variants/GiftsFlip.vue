<script setup lang="ts">
import { computed, nextTick, reactive } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits, storeMonogram, storeNumberLabel } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos de tarjetas que se voltean ("volteo"): cada tienda (Liverpool, Amazon…) y
 * la transferencia son una tarjeta de lino olivo con un lacre dorado y su inicial. Los datos
 * no se ven de entrada: al tocarla, la tarjeta gira en 3D (rotateY con perspectiva) y el
 * dorso de papel marfil enseña el número de evento o de lista, la cuenta o CLABE (de 4 en 4)
 * con su botón "Copiar" y "Ver mesa". Accesible: el frente es un botón con aria-pressed
 * (Enter o Espacio), el dorso tiene "Ocultar" y la cara que no se ve queda inerte. Con menos
 * movimiento, las caras solo se funden. Por el enlace general los datos bancarios no llegan
 * (GiftPrivacy los quita en el servidor): esa tarjeta no se voltea y avisa dónde están.
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
    initial: storeMonogram(store),
    numberLabel: storeNumberLabel(store),
  })),
)
const envelope = computed(() => event.value.gifts?.envelope ?? event.value.envelope ?? null)
const uid = `gf-${props.section.id}`

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
  <div class="gf">
    <header class="gf__head">
      <h2 class="gf__title" data-text="title">{{ title }}</h2>
      <span class="gf__rule" aria-hidden="true" />
      <p v-if="section.text" class="gf__text" data-text="text">{{ section.text }}</p>
    </header>

    <ul class="gf__cards">
      <li v-for="store in stores" :key="store.id" class="gf__item">
        <div class="gf__card" :class="{ 'is-open': open[store.id] }">
          <div class="gf__inner">
            <div
              :ref="keep(`${store.id}-front`)"
              class="gf__face gf__face--front"
              :inert="open[store.id] || undefined"
            >
              <span class="gf__seal" aria-hidden="true">
                <WaxSeal :initials="store.initial" size="3rem" tone="gold" :seed="store.id" />
              </span>
              <h3 class="gf__name" data-text="store">{{ store.name }}</h3>
              <p v-if="store.note" class="gf__note" data-text="store">{{ store.note }}</p>
              <button
                type="button"
                class="gf__toggle"
                :aria-pressed="!!open[store.id]"
                :aria-controls="`${uid}-${store.id}`"
                :aria-label="`Ver los datos de ${store.name}`"
                @click="toggle(store.id)"
              >
                Toca para ver los datos
              </button>
            </div>
            <div
              :id="`${uid}-${store.id}`"
              :ref="keep(`${store.id}-back`)"
              class="gf__face gf__face--back"
              :inert="!open[store.id] || undefined"
              @click="onBack(store.id, $event)"
            >
              <p class="gf__label">{{ store.name }}</p>
              <template v-if="store.event_number">
                <p class="gf__kicker">{{ store.numberLabel }}</p>
                <p class="gf__number">{{ store.event_number }}</p>
                <button
                  type="button"
                  class="gf__copy"
                  :aria-label="`Copiar el ${store.numberLabel.toLowerCase()} ${store.event_number}`"
                  @click="copy(store.event_number, store.id)"
                >
                  <AppIcon name="copy" /> {{ copied === store.id ? 'Copiado' : 'Copiar' }}
                </button>
              </template>
              <a
                v-if="store.url"
                :href="store.url"
                class="gf__button inv-btn"
                data-text="button"
                target="_blank"
                rel="noopener"
                :aria-label="`${button}: ${store.name}`"
              >
                {{ button }}
              </a>
              <button
                type="button"
                class="gf__hide"
                :aria-pressed="!!open[store.id]"
                :aria-label="`Ocultar los datos de ${store.name}`"
                @click="toggle(store.id)"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
      </li>

      <li v-if="envelope" class="gf__item gf__item--wide">
        <div class="gf__card" :class="{ 'is-open': open.transfer, 'is-fixed': !envelope.account }">
          <div class="gf__inner">
            <div
              :ref="keep('transfer-front')"
              class="gf__face gf__face--front"
              :inert="open.transfer || undefined"
            >
              <span class="gf__seal" aria-hidden="true">
                <WaxSeal size="3rem" tone="burgundy" :seed="`${uid}-sobre`" />
              </span>
              <h3 class="gf__name" data-text="envelope">
                {{ envelope.title || 'Lluvia de sobres' }}
              </h3>
              <p v-if="envelope.text" class="gf__note" data-text="envelope">{{ envelope.text }}</p>
              <button
                v-if="envelope.account"
                type="button"
                class="gf__toggle"
                :aria-pressed="!!open.transfer"
                :aria-controls="`${uid}-transfer`"
                aria-label="Ver los datos para la transferencia"
                @click="toggle('transfer')"
              >
                Toca para ver los datos
              </button>
              <p v-else-if="envelope.hidden" class="gf__private">
                Los datos para tu sobre vienen en tu invitación personal.
              </p>
            </div>
            <div
              v-if="envelope.account"
              :id="`${uid}-transfer`"
              :ref="keep('transfer-back')"
              class="gf__face gf__face--back"
              :inert="!open.transfer || undefined"
              @click="onBack('transfer', $event)"
            >
              <p v-if="envelope.bank" class="gf__label">{{ envelope.bank }}</p>
              <p class="gf__kicker">Cuenta o CLABE</p>
              <p class="gf__number gf__number--account" data-text="account">
                {{ groupDigits(envelope.account) }}
              </p>
              <p v-if="envelope.holder" class="gf__holder">{{ envelope.holder }}</p>
              <button
                type="button"
                class="gf__copy"
                aria-label="Copiar el número de cuenta"
                @click="copy(envelope.account, 'account')"
              >
                <AppIcon name="copy" /> {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
              </button>
              <button
                type="button"
                class="gf__hide"
                :aria-pressed="!!open.transfer"
                aria-label="Ocultar los datos para la transferencia"
                @click="toggle('transfer')"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
        <p v-if="envelope.box" class="gf__box">También habrá caja para sobres en el salón.</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.gf {
  --gf-olive: var(--color-olivo, var(--color-primary));
  --gf-paper: var(--color-paper, var(--color-surface));
  --gf-ink: var(--root-text, #3b342e);
  container-type: inline-size;
  display: grid;
  gap: var(--space-3);
  max-width: 40rem;
  margin: 0 auto;
}
.gf__head {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  text-align: center;
}
.gf__title {
  margin: 0;
  margin-right: -0.16em;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 8cqi, 2.5rem) * var(--t-title-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.gf__rule {
  width: 3.5rem;
  height: 1px;
  background: var(--color-borgona, var(--color-accent));
}
.gf__text {
  max-width: 40ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.08rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
.gf__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gf__item {
  display: grid;
}
.gf__item--wide {
  grid-column: 1 / -1;
  gap: 0.6rem;
}

/* ---- La tarjeta que gira ---- */
.gf__card {
  display: grid;
  perspective: 900px;
}
.gf__inner {
  position: relative;
  display: grid;
  min-height: 11.5rem;
  transform-style: preserve-3d;
  transition: transform calc(0.85s * var(--motion-scale)) cubic-bezier(0.3, 0.7, 0.2, 1.08);
}
.gf__card.is-open .gf__inner {
  transform: rotateY(180deg);
}
.gf__face {
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
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.12),
    0 12px 20px -12px rgb(0 0 0 / 0.5);
}
/* El frente: lino olivo con filete dorado por dentro, como un sobre cerrado. */
.gf__face--front {
  color: var(--gf-paper);
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 200px,
    radial-gradient(120% 90% at 50% 0%, rgb(255 255 255 / 0.08), transparent 70%),
    var(--gf-olive);
  outline: 1px solid color-mix(in srgb, var(--color-oro, #b08d57) 70%, transparent);
  outline-offset: -0.4rem;
}
/* El dorso: papel marfil de algodón con la tinta de la página. */
.gf__face--back {
  color: var(--gf-ink);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--gf-paper);
  outline: 1px solid color-mix(in srgb, var(--color-borgona, var(--gf-ink)) 45%, transparent);
  outline-offset: -0.4rem;
  transform: rotateY(180deg);
  cursor: pointer;
}
.gf__seal {
  display: block;
  margin-bottom: 0.15rem;
}
.gf__seal :deep(.seal) {
  display: block;
}
.gf__name {
  margin: 0;
  font-family: var(--t-store-font, var(--font-display));
  font-weight: 400;
  font-size: calc(1.2rem * var(--t-store-size, 1));
  letter-spacing: 0.14em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--t-store-color, inherit);
}
.gf__note {
  margin: 0;
  max-width: 30ch;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  line-height: 1.35;
  opacity: 0.85;
}
/* El botón del frente cubre toda la tarjeta: se toca donde sea. */
.gf__toggle {
  margin-top: 0.35rem;
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.64rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-oro, #b08d57) 55%, var(--gf-paper));
  cursor: pointer;
}
.gf__toggle::after {
  content: '';
  position: absolute;
  inset: 0;
}
.gf__toggle:focus-visible {
  outline: none;
}
.gf__toggle:focus-visible::after {
  outline: 1px solid var(--gf-paper);
  outline-offset: -0.7rem;
}
.gf__private {
  margin: 0.3rem 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
}
.gf__label {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.gf__kicker {
  margin: 0.2rem 0 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-borgona, var(--gf-ink));
}
.gf__number {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(clamp(1.15rem, 5cqi, 1.45rem) * var(--t-account-size, 1));
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.gf__holder {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
}
.gf__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--gf-ink) 40%, transparent);
  border-radius: 2px;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gf-ink);
  cursor: pointer;
}
.gf__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.gf__button {
  display: inline-block;
  margin-top: 0.15rem;
  padding: 0.45rem 0.9rem;
  border: var(--btn-border, 1px solid currentColor);
  border-radius: var(--btn-radius, 2px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.64rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.22em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--gf-ink));
}
.gf__hide {
  margin-top: 0.1rem;
  padding: 0.1rem 0.3rem;
  border: 0;
  background: none;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--gf-ink) 40%, transparent);
  color: var(--gf-ink);
  cursor: pointer;
}
.gf__copy:focus-visible,
.gf__button:focus-visible,
.gf__hide:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
.gf__box {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--color-text);
}

/* Menos movimiento: sin giro; las caras se funden. */
@media (prefers-reduced-motion: reduce) {
  .gf__inner,
  .gf__card.is-open .gf__inner {
    transform: none;
    transition: none;
  }
  .gf__face {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    transition: opacity calc(0.3s * var(--motion-scale)) ease;
  }
  .gf__face--back {
    transform: none;
    opacity: 0;
  }
  .gf__card.is-open .gf__face--back {
    opacity: 1;
  }
  .gf__card.is-open .gf__face--front {
    opacity: 0;
  }
}
</style>
