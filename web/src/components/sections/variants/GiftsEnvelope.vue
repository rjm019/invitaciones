<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos en un sobre ("sobre"): un sobre pequeño entreabierto (el color de papel
 * `--color-olivo`, con la solapa abierta y el forro de damasco) del que asoma una tarjeta
 * de papel con las tiendas (nombre, nota, número de evento con botón para copiar y el botón
 * a la mesa) y, separado por un filete, los datos para una transferencia. Por el enlace
 * general los datos bancarios no llegan (el servidor los quita): se avisa dónde están.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const { copied, copy } = useClipboard()

const title = computed(() => props.section.title ?? 'Mesa de regalos')
const button = computed(() => props.section.button ?? 'Ver mesa')
const stores = computed(() => event.value.gifts?.stores ?? [])
const envelope = computed(() => event.value.gifts?.envelope ?? event.value.envelope ?? null)
const lining = computed(() => resolveAsset.value('damasco.svg'))
const liningStyle = computed(() =>
  lining.value ? { '--ge-lining': `url("${lining.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="gs" :style="liningStyle">
    <div class="gs__envelope" aria-hidden="true">
      <span class="gs__flap" />
      <span class="gs__back" />
    </div>

    <div class="gs__card">
      <h2 class="gs__title" data-text="title">{{ title }}</h2>
      <p v-if="section.text" class="gs__text" data-text="text">{{ section.text }}</p>

      <ul v-if="stores.length" class="gs__stores">
        <li v-for="(store, i) in stores" :key="i" class="gs__store">
          <h3 class="gs__name" data-text="store">{{ store.name }}</h3>
          <p v-if="store.note" class="gs__note" data-text="store">{{ store.note }}</p>
          <p v-if="store.event_number" class="gs__number">
            <span>Evento <strong>{{ store.event_number }}</strong></span>
            <button
              type="button"
              class="gs__copy"
              :aria-label="`Copiar el número de evento ${store.event_number}`"
              @click="copy(store.event_number, `store-${i}`)"
            >
              <AppIcon name="copy" /> {{ copied === `store-${i}` ? 'Copiado' : 'Copiar' }}
            </button>
          </p>
          <a
            v-if="store.url"
            :href="store.url"
            class="gs__button inv-btn"
            data-text="button"
            target="_blank"
            rel="noopener"
            :aria-label="`${button}: ${store.name}`"
          >
            {{ button }}
          </a>
        </li>
      </ul>

      <section v-if="envelope" class="gs__transfer" aria-labelledby="gs-transfer">
        <h3 id="gs-transfer" class="gs__subtitle" data-text="envelope">
          {{ envelope.title || 'Lluvia de sobres' }}
        </h3>
        <p v-if="envelope.text" class="gs__note" data-text="envelope">{{ envelope.text }}</p>
        <div v-if="envelope.account" class="gs__bank" data-text="account">
          <span v-if="envelope.bank" class="gs__bank-name">{{ envelope.bank }}</span>
          <span class="gs__account">{{ groupDigits(envelope.account) }}</span>
          <span v-if="envelope.holder" class="gs__holder">{{ envelope.holder }}</span>
          <button
            type="button"
            class="gs__copy"
            aria-label="Copiar el número de cuenta"
            @click="copy(envelope.account, 'account')"
          >
            <AppIcon name="copy" /> {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <p v-else-if="envelope.hidden" class="gs__private">
          Los datos para tu sobre vienen en tu invitación personal.
        </p>
        <p v-if="envelope.box" class="gs__box">También habrá caja para sobres en el salón.</p>
      </section>
    </div>

    <span class="gs__pocket" aria-hidden="true" />
  </div>
</template>

<style scoped>
/*
 * La tarjeta asoma del sobre: detrás, el fondo del sobre y su solapa abierta hacia arriba
 * (con el forro); adelante, la bolsa del sobre tapa el pie de la tarjeta (que lleva
 * espacio de más para que nada quede debajo).
 */
.gs {
  --gs-olive: var(--color-olivo, var(--color-primary));
  --gs-paper: var(--color-paper, var(--color-surface));
  container-type: inline-size;
  position: relative;
  max-width: 26rem;
  margin: 0 auto;
  padding: 0;
  isolation: isolate;
}
.gs__envelope {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: min(16rem, 55%);
  z-index: -1;
}
.gs__back {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--gs-olive) 85%, #000);
}
.gs__flap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 6.5rem;
  background: var(--gs-paper);
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
  filter: brightness(0.97);
}
.gs__flap::before,
.gs__flap::after {
  content: '';
  position: absolute;
  inset: 0;
  -webkit-mask: var(--ge-lining) 0 0 / 2.6rem 3.25rem repeat;
  mask: var(--ge-lining) 0 0 / 2.6rem 3.25rem repeat;
}
.gs__flap::before {
  background: rgb(59 52 46 / 0.2);
  translate: 0.6px 0.8px;
}
.gs__flap::after {
  background: rgb(255 255 255 / 0.85);
  translate: -0.5px -0.6px;
}
.gs__card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  margin: 0 1.1rem;
  padding: 1.8rem 1.4rem 5.6rem;
  text-align: center;
  color: var(--color-text);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--gs-paper);
  box-shadow: 0 -2px 10px -4px rgb(59 52 46 / 0.25);
}
.gs__pocket {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5rem;
  background:
    url('../../../effects/assets/textura-lino.svg') 0 0 / 180px,
    linear-gradient(180deg, rgb(255 255 255 / 0.05), rgb(0 0 0 / 0.14)),
    var(--gs-olive);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.12),
    0 -3px 8px -4px rgb(0 0 0 / 0.35);
}
.gs__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.6rem, 7.5cqi, 2.1rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
  margin-right: -0.14em;
}
.gs__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.08rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
.gs__stores {
  display: grid;
  gap: 1rem;
  width: 100%;
  margin: 0.3rem 0 0;
  padding: 0;
  list-style: none;
}
.gs__store {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
}
.gs__store + .gs__store {
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
}
.gs__name,
.gs__subtitle {
  margin: 0;
  font-family: var(--t-store-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.84rem * var(--t-store-size, 1));
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--t-store-color, var(--color-text));
}
.gs__subtitle {
  font-family: var(--t-envelope-font, var(--font-caps));
  color: var(--t-envelope-color, var(--color-borgona, var(--color-accent)));
}
.gs__note {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
.gs__number {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1rem;
}
.gs__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-text) 35%, transparent);
  border-radius: 2px;
  background: none;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text);
  cursor: pointer;
}
.gs__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.gs__copy:focus-visible,
.gs__button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
.gs__button {
  display: inline-block;
  margin-top: 0.2rem;
  padding: 0.5rem 1rem;
  border: var(--btn-border, 1px solid currentColor);
  border-radius: var(--btn-radius, 2px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-weight: 700;
  font-size: calc(0.68rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.22em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-text)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.gs__transfer {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  width: 100%;
  margin-top: 0.4rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--color-borgona, var(--color-accent));
}
.gs__bank {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  font-family: var(--t-account-font, var(--font-serif));
  color: var(--t-account-color, var(--color-text));
}
.gs__bank-name,
.gs__holder {
  font-size: 0.98rem;
}
.gs__account {
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: calc(clamp(0.98rem, 4.6cqi, 1.15rem) * var(--t-account-size, 1));
  letter-spacing: 0.14em;
  font-variant-numeric: tabular-nums;
}
.gs__private,
.gs__box {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: color-mix(in srgb, var(--color-text) 78%, transparent);
}
</style>
