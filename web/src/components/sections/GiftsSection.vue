<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits, storeMonogram } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos: cada tienda en su tarjeta (monograma, nombre, nota, número de evento con
 * botón para copiar y el botón a la mesa) y la lluvia de sobres (texto, datos bancarios
 * con su botón para copiar la cuenta y el aviso de la caja en el salón). Por el enlace
 * general los datos bancarios no llegan (el servidor los quita): se avisa dónde están.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()

const title = computed(() => props.section.title ?? 'Mesa de regalos')
const button = computed(() => props.section.button ?? 'Ver mesa')
const stores = computed(() => event.value.gifts?.stores ?? [])
const envelope = computed(() => event.value.gifts?.envelope ?? null)
</script>

<template>
  <div class="gifts">
    <h2 class="gifts__title" data-text="title">{{ title }}</h2>
    <p v-if="section.text" class="gifts__text" data-text="text">{{ section.text }}</p>

    <div v-if="stores.length" class="gifts__stores">
      <article v-for="(store, i) in stores" :key="i" class="gifts__store">
        <span class="gifts__monogram" aria-hidden="true">{{ storeMonogram(store) }}</span>
        <h3 class="gifts__name" data-text="store">{{ store.name }}</h3>
        <p v-if="store.note" class="gifts__note" data-text="store">{{ store.note }}</p>
        <p v-if="store.event_number" class="gifts__number" data-text="store">
          <span
            >Evento <strong>{{ store.event_number }}</strong></span
          >
          <button
            type="button"
            class="gifts__copy"
            :aria-label="`Copiar el número de evento ${store.event_number}`"
            @click="copy(store.event_number, `store-${i}`)"
          >
            <AppIcon name="copy" />
            {{ copied === `store-${i}` ? 'Copiado' : 'Copiar' }}
          </button>
        </p>
        <a
          v-if="store.url"
          :href="store.url"
          class="gifts__button btn-shine inv-btn"
          data-text="button"
          target="_blank"
          rel="noopener"
          :aria-label="`${button}: ${store.name}`"
        >
          {{ button }}
        </a>
      </article>
    </div>

    <section v-if="envelope" class="gifts__envelope" aria-labelledby="gifts-envelope">
      <AppIcon name="envelope" class="gifts__envelope-icon" />
      <h3 id="gifts-envelope" class="gifts__envelope-title" data-text="envelope">
        {{ envelope.title || 'Lluvia de sobres' }}
      </h3>
      <p v-if="envelope.text" class="gifts__envelope-text" data-text="envelope">
        {{ envelope.text }}
      </p>
      <div v-if="envelope.account" class="gifts__bank" data-text="account">
        <span v-if="envelope.bank" class="gifts__bank-name">{{ envelope.bank }}</span>
        <span class="gifts__account">{{ groupDigits(envelope.account) }}</span>
        <span v-if="envelope.holder" class="gifts__holder">{{ envelope.holder }}</span>
        <button
          type="button"
          class="gifts__copy"
          aria-label="Copiar el número de cuenta"
          @click="copy(envelope.account, 'account')"
        >
          <AppIcon name="copy" />
          {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      <p v-else-if="envelope.hidden" class="gifts__private">
        Los datos para tu sobre vienen en tu invitación personal.
      </p>
      <p v-if="envelope.box" class="gifts__box">También habrá caja para sobres en el salón.</p>
    </section>
  </div>
</template>

<style scoped>
.gifts {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.gifts__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.gifts__text {
  max-width: 24rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
.gifts__stores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: var(--space-2);
  width: 100%;
}
.gifts__store {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.45rem;
  padding: var(--space-3) var(--space-2);
  border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}
.gifts__monogram {
  display: grid;
  place-items: center;
  width: 3.2rem;
  aspect-ratio: 1;
  border: 1px solid var(--color-primary);
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 1.6rem;
  color: var(--color-primary);
}
.gifts__name {
  margin: 0;
  font-family: var(--t-store-font, var(--font-caps));
  font-size: calc(1rem * var(--t-store-size, 1));
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-store-color, var(--color-text));
}
.gifts__note {
  margin: 0;
  font-family: var(--t-store-font, var(--font-serif));
  font-style: italic;
  font-size: calc(0.95rem * var(--t-store-size, 1));
  color: var(--t-store-color, var(--color-primary));
}
.gifts__number {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--t-store-font, var(--font-serif));
  font-size: calc(0.9rem * var(--t-store-size, 1));
  color: var(--t-store-color, var(--color-text));
}
.gifts__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  border-radius: 999px;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.gifts__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.gifts__button {
  margin-top: 0.3rem;
  padding: 0.5rem 1.3rem;
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-on-button, var(--color-text))));
  font-family: var(--t-button-font, var(--font-button));
  font-weight: 600;
  font-size: calc(0.85rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.14em);
  text-decoration: var(--btn-decoration, none);
  text-transform: var(--btn-case, uppercase);
  box-shadow: var(--btn-shadow, var(--shadow-button));
  border: var(--btn-border, 0);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
:is(.gifts__copy, .gifts__button):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.gifts__envelope {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: min(100%, 24rem);
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-2);
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
}
.gifts__envelope-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary);
}
.gifts__envelope-title {
  margin: 0;
  font-family: var(--t-envelope-font, var(--font-caps));
  font-size: calc(1.05rem * var(--t-envelope-size, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-envelope-color, var(--color-text));
}
.gifts__envelope-text {
  margin: 0;
  font-family: var(--t-envelope-font, var(--font-serif));
  font-style: italic;
  color: var(--t-envelope-color, var(--color-text));
}
.gifts__bank {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  font-family: var(--t-account-font, var(--font-serif));
  color: var(--t-account-color, var(--color-text));
  box-shadow: var(--shadow-card);
}
.gifts__bank-name {
  font-family: var(--font-caps);
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.gifts__account {
  font-size: calc(1.15rem * var(--t-account-size, 1));
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.gifts__holder {
  font-size: 0.9rem;
  opacity: 0.85;
}
.gifts__private,
.gifts__box {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
</style>
