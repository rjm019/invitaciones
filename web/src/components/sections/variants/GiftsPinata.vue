<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { motionScale } from '@/composables/useMotionScale'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { decorOr } from '@/services/decorService'
import { confetti } from '@/services/effectsService'
import { groupDigits, storeNumberLabel } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos con piñata ("pinata"): arriba, la piñata (ranura "pinata") cuelga de un
 * hilo y se mece desde arriba; al tocarla recibe un golpe y caen unos dieciocho pedacitos de
 * confeti y dulces (es solo un adorno: las tarjetas se ven siempre). Debajo, cada tienda y la
 * transferencia son una tarjeta de papel crema con filo de color y una florecita que se
 * voltea igual que en "volteo" (rotateY con perspectiva): el frente es un botón con
 * aria-pressed, el dorso enseña el número de evento o la cuenta (de 4 en 4) con "Copiar" y
 * "Ver mesa", y la cara que no se ve queda inerte. Con menos movimiento no hay mecido ni
 * caída y las caras solo se funden. Por el enlace general los datos bancarios no llegan
 * (GiftPrivacy los quita en el servidor): esa tarjeta no se voltea y avisa dónde están.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const { copied, copy } = useClipboard()
const reduced = useReducedMotion()

const title = computed(() => props.section.title ?? 'Mesa de regalos')
const button = computed(() => props.section.button ?? 'Ver mesa')
const stores = computed(() =>
  (event.value.gifts?.stores ?? []).map((store, i) => ({
    ...store,
    id: `store-${i}`,
    numberLabel: storeNumberLabel(store),
  })),
)
// Solo la tarjeta de transferencia de la propia mesa: la lluvia de sobres es otra sección y no se repite aquí.
const envelope = computed(() => event.value.gifts?.envelope ?? null)
const uid = `gp-${props.section.id}`
const pinata = computed(() => decorOr(props.section.decor, 'pinata', resolveAsset.value('pinata.svg')))
const flower = computed(() => decorOr(props.section.decor, 'flowers', resolveAsset.value('gerbera.svg')))

// La piñata: golpe y confeti en cada toque.
const bits = computed(() => confetti(`${props.section.id}:pinata`, 18, 5))
const hitting = ref(false)
const burst = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
function hit(): void {
  if (reduced.value) return
  clearTimeout(timer)
  burst.value += 1
  hitting.value = false
  void nextTick(() => {
    hitting.value = true
    timer = setTimeout(() => (hitting.value = false), 450 * motionScale())
  })
}
onBeforeUnmount(() => clearTimeout(timer))

// Las tarjetas: la misma lógica que "volteo".
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
  <div class="gp" :class="{ 'is-hit': hitting }">
    <header class="gp__head">
      <h2 class="gp__title" data-text="title">{{ title }}</h2>
      <p v-if="section.text" class="gp__text" data-text="text">{{ section.text }}</p>
    </header>

    <div class="gp__stage">
      <span class="gp__thread" aria-hidden="true" />
      <button
        type="button"
        class="gp__pinata"
        aria-label="Romper la piñata"
        @click="hit"
      >
        <img v-if="pinata" :src="pinata" alt="" class="gp__art" />
        <span v-else class="gp__art gp__art--none" aria-hidden="true">★</span>
      </button>
      <span v-if="burst" :key="burst" class="gp__bits" aria-hidden="true">
        <span
          v-for="(b, i) in bits"
          :key="i"
          class="gp__bit"
          :class="`gp__bit--${b.shape}`"
          :style="{
            '--x': `${b.x}%`,
            '--dx': `${b.dx / 3}px`,
            '--fall': `${Math.min(b.fall, 520) / 2.6}px`,
            '--rot': `${b.rotate}deg`,
            '--delay': `${b.delay}s`,
            '--dur': `${b.duration / 1.6}s`,
            '--size': `${b.size}rem`,
            '--c': `var(--gp-c${b.color})`,
          }"
        />
      </span>
    </div>
    <p class="gp__hint" aria-hidden="true">Toca la piñata</p>

    <ul class="gp__cards">
      <li v-for="store in stores" :key="store.id" class="gp__item">
        <div class="gp__card" :class="{ 'is-open': open[store.id] }">
          <div class="gp__inner">
            <div
              :ref="keep(`${store.id}-front`)"
              class="gp__face gp__face--front"
              :inert="open[store.id] || undefined"
            >
              <img v-if="flower" :src="flower" alt="" class="gp__flower" aria-hidden="true" />
              <h3 class="gp__name" data-text="store">{{ store.name }}</h3>
              <p v-if="store.note" class="gp__note" data-text="store">{{ store.note }}</p>
              <button
                type="button"
                class="gp__toggle"
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
              class="gp__face gp__face--back"
              :inert="!open[store.id] || undefined"
              @click="onBack(store.id, $event)"
            >
              <p class="gp__label">{{ store.name }}</p>
              <template v-if="store.event_number">
                <p class="gp__kicker">{{ store.numberLabel }}</p>
                <p class="gp__number">{{ store.event_number }}</p>
                <button
                  type="button"
                  class="gp__copy"
                  :aria-label="`Copiar el ${store.numberLabel.toLowerCase()} ${store.event_number}`"
                  @click="copy(store.event_number, store.id)"
                >
                  <AppIcon name="copy" /> {{ copied === store.id ? 'Copiado' : 'Copiar' }}
                </button>
              </template>
              <a
                v-if="store.url"
                :href="store.url"
                class="gp__button inv-btn"
                data-text="button"
                target="_blank"
                rel="noopener"
                :aria-label="`${button}: ${store.name}`"
              >
                {{ button }}
              </a>
              <button
                type="button"
                class="gp__hide"
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

      <li v-if="envelope" class="gp__item gp__item--wide">
        <div class="gp__card" :class="{ 'is-open': open.transfer, 'is-fixed': !envelope.account }">
          <div class="gp__inner">
            <div
              :ref="keep('transfer-front')"
              class="gp__face gp__face--front"
              :inert="open.transfer || undefined"
            >
              <img v-if="flower" :src="flower" alt="" class="gp__flower" aria-hidden="true" />
              <h3 class="gp__name" data-text="envelope">
                {{ envelope.title || 'Lluvia de sobres' }}
              </h3>
              <p v-if="envelope.text" class="gp__note" data-text="envelope">{{ envelope.text }}</p>
              <button
                v-if="envelope.account"
                type="button"
                class="gp__toggle"
                :aria-pressed="!!open.transfer"
                :aria-controls="`${uid}-transfer`"
                aria-label="Ver los datos para la transferencia"
                @click="toggle('transfer')"
              >
                Toca para ver los datos
              </button>
              <p v-else-if="envelope.hidden" class="gp__private">
                Los datos para tu sobre vienen en tu invitación personal.
              </p>
            </div>
            <div
              v-if="envelope.account"
              :id="`${uid}-transfer`"
              :ref="keep('transfer-back')"
              class="gp__face gp__face--back"
              :inert="!open.transfer || undefined"
              @click="onBack('transfer', $event)"
            >
              <p v-if="envelope.bank" class="gp__label">{{ envelope.bank }}</p>
              <p class="gp__kicker">Cuenta o CLABE</p>
              <p class="gp__number gp__number--account" data-text="account">
                {{ groupDigits(envelope.account) }}
              </p>
              <p v-if="envelope.holder" class="gp__holder">{{ envelope.holder }}</p>
              <button
                type="button"
                class="gp__copy"
                aria-label="Copiar el número de cuenta"
                @click="copy(envelope.account, 'account')"
              >
                <AppIcon name="copy" /> {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
              </button>
              <button
                type="button"
                class="gp__hide"
                :aria-pressed="!!open.transfer"
                aria-label="Ocultar los datos para la transferencia"
                @click="toggle('transfer')"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
        <p v-if="envelope.box" class="gp__box">También habrá caja para sobres en el salón.</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.gp {
  --gp-paper: var(--color-paper, #fbf3e2);
  --gp-ink: var(--color-tinta, #3a2420);
  --gp-c0: var(--color-rosa, #d6336c);
  --gp-c1: var(--color-cempasuchil, #f08a24);
  --gp-c2: var(--color-turquesa, #1fa6a0);
  --gp-c3: var(--color-amarillo, #f2c230);
  --gp-c4: var(--color-nopal, #4d7a3a);
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 40rem;
  margin: 0 auto;
  text-align: center;
}
.gp__head {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
}
.gp__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-text));
}
.gp__text {
  max-width: 36ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}

/* El hilo y la piñata: se mece desde el punto donde cuelga. */
.gp__stage {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(60%, 9.5rem);
}
.gp__thread {
  width: 2px;
  height: 1.8rem;
  background: var(--gp-ink);
  opacity: 0.6;
}
.gp__pinata {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform-origin: 50% 0;
  animation: gp-sway calc(4s * var(--motion-scale)) ease-in-out infinite alternate;
}
.gp__pinata:focus-visible {
  outline: 2px solid var(--color-talavera, currentColor);
  outline-offset: 4px;
}
.gp__art {
  display: block;
  width: 100%;
  height: auto;
}
.gp__art--none {
  font-size: 5rem;
  line-height: 1;
  color: var(--gp-c0);
}
.is-hit .gp__pinata {
  animation: gp-hit calc(0.4s * var(--motion-scale)) ease-out 1;
}
.gp__hint {
  margin: -0.2rem 0 0.4rem;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: 1.05rem;
  color: var(--t-text-color, var(--color-text));
}

/* Los pedacitos salen de la piñata y caen girando. */
.gp__bits {
  position: absolute;
  inset: 1.8rem 0 0;
  pointer-events: none;
}
.gp__bit {
  position: absolute;
  top: 40%;
  left: var(--x);
  width: var(--size);
  height: var(--size);
  background: var(--c);
  opacity: 0;
  animation: gp-fall calc(var(--dur) * var(--motion-scale)) ease-in calc(var(--delay) * var(--motion-scale)) 1
    forwards;
}
.gp__bit--dot {
  border-radius: 50%;
}
.gp__bit--strip {
  width: calc(var(--size) * 1.6);
  height: calc(var(--size) * 0.4);
}
.gp__bit--petal {
  border-radius: 80% 0 80% 0;
}

/* ---- Las tarjetas que giran (como "volteo") ---- */
.gp__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
  gap: 0.9rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gp__item {
  display: grid;
}
.gp__item--wide {
  grid-column: 1 / -1;
  gap: 0.6rem;
}
.gp__card {
  display: grid;
  perspective: 900px;
}
.gp__inner {
  position: relative;
  display: grid;
  min-height: 11.5rem;
  transform-style: preserve-3d;
  transition: transform calc(0.85s * var(--motion-scale)) cubic-bezier(0.3, 0.7, 0.2, 1.08);
}
.gp__card.is-open .gp__inner {
  transform: rotateY(180deg);
}
.gp__face {
  grid-area: 1 / 1;
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
  padding: 1.3rem 0.9rem;
  text-align: center;
  color: var(--gp-ink);
  background: var(--gp-paper);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.12),
    0 12px 20px -12px rgb(0 0 0 / 0.5);
}
/* El frente: papel crema con filo rosa y un filete punteado de cempasúchil por dentro. */
.gp__face--front {
  border: 2px solid var(--color-rosa, var(--color-accent));
  outline: 2px dashed var(--color-cempasuchil, var(--color-primary));
  outline-offset: -0.45rem;
}
/* El dorso: el mismo papel con filo de talavera. */
.gp__face--back {
  border: 2px solid var(--color-talavera, var(--color-primary));
  outline: 1px solid color-mix(in srgb, var(--color-talavera, var(--gp-ink)) 45%, transparent);
  outline-offset: -0.45rem;
  transform: rotateY(180deg);
  cursor: pointer;
}
.gp__flower {
  display: block;
  width: 2.6rem;
  height: 2.6rem;
  object-fit: contain;
}
.gp__name {
  margin: 0;
  font-family: var(--t-store-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.95rem * var(--t-store-size, 1));
  letter-spacing: 0.18em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--t-store-color, var(--color-talavera, var(--gp-ink)));
}
.gp__note {
  margin: 0;
  max-width: 30ch;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--gp-ink) 85%, transparent);
}
/* El botón del frente cubre toda la tarjeta: se toca donde sea. */
.gp__toggle {
  margin-top: 0.35rem;
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.64rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-rosa, var(--gp-ink));
  cursor: pointer;
}
.gp__toggle::after {
  content: '';
  position: absolute;
  inset: 0;
}
.gp__toggle:focus-visible {
  outline: none;
}
.gp__toggle:focus-visible::after {
  outline: 2px solid var(--color-talavera, currentColor);
  outline-offset: -0.7rem;
}
.gp__private {
  margin: 0.3rem 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
}
.gp__label {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-talavera, var(--gp-ink));
}
.gp__kicker {
  margin: 0.2rem 0 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-rosa, var(--gp-ink));
}
.gp__number {
  margin: 0;
  font-family: var(--t-account-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(1.1rem, 5cqi, 1.35rem) * var(--t-account-size, 1));
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  color: var(--t-account-color, var(--gp-ink));
  overflow-wrap: anywhere;
}
.gp__holder {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
}
.gp__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--gp-ink) 40%, transparent);
  border-radius: 999px;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gp-ink);
  cursor: pointer;
}
.gp__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.gp__button {
  display: inline-block;
  margin-top: 0.15rem;
  padding: 0.45rem 0.9rem;
  border: var(--btn-border, 1px solid var(--color-talavera, currentColor));
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.64rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.2em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-talavera, var(--gp-ink))));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.gp__hide {
  margin-top: 0.1rem;
  padding: 0.1rem 0.3rem;
  border: 0;
  background: none;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  color: var(--gp-ink);
  cursor: pointer;
}
.gp__copy:focus-visible,
.gp__button:focus-visible,
.gp__hide:focus-visible {
  outline: 2px solid var(--color-talavera, currentColor);
  outline-offset: 3px;
}
.gp__box {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--color-text);
}

@keyframes gp-sway {
  from {
    transform: rotate(-5deg);
  }
  to {
    transform: rotate(5deg);
  }
}
@keyframes gp-hit {
  0% {
    transform: rotate(0);
  }
  30% {
    transform: rotate(-22deg);
  }
  60% {
    transform: rotate(16deg);
  }
  100% {
    transform: rotate(0);
  }
}
@keyframes gp-fall {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--fall)) rotate(var(--rot));
  }
}

/* Menos movimiento: sin mecido ni caída; las caras se funden. */
@media (prefers-reduced-motion: reduce) {
  .gp__pinata,
  .is-hit .gp__pinata {
    animation: none;
  }
  .gp__bits {
    display: none;
  }
  .gp__inner,
  .gp__card.is-open .gp__inner {
    transform: none;
    transition: none;
  }
  .gp__face {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    transition: opacity calc(0.3s * var(--motion-scale)) ease;
  }
  .gp__face--back {
    transform: none;
    opacity: 0;
  }
  .gp__card.is-open .gp__face--back {
    opacity: 1;
  }
  .gp__card.is-open .gp__face--front {
    opacity: 0;
  }
}
</style>
