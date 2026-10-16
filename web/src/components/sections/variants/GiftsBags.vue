<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits, storeMonogram } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos de Nueva York ("bolsas"): cada tienda es una bolsa de compras de la
 * Quinta Avenida con sus asas, su monograma y su nombre; de un asa cuelga la etiqueta con
 * el número de evento (para copiar). La lluvia de sobres es un sobre art déco con la
 * tarjeta de los datos asomando (con botón para copiar la cuenta). Por el enlace general
 * los datos bancarios no llegan: se avisa dónde están.
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
  <div class="ny-gifts">
    <h2 class="ny-gifts__title" data-text="title">{{ title }}</h2>
    <p v-if="section.text" class="ny-gifts__text" data-text="text">{{ section.text }}</p>

    <div v-if="stores.length" class="ny-gifts__bags">
      <article
        v-for="(store, i) in stores"
        :key="i"
        class="ny-bag"
        :class="`ny-bag--tone-${i % 3}`"
      >
        <span class="ny-bag__handles" aria-hidden="true" />
        <div class="ny-bag__body">
          <span class="ny-bag__monogram" aria-hidden="true">{{ storeMonogram(store) }}</span>
          <h3 class="ny-bag__name" data-text="store">{{ store.name }}</h3>
          <p v-if="store.note" class="ny-bag__note" data-text="store">{{ store.note }}</p>
        </div>
        <p v-if="store.event_number" class="ny-bag__tag" data-text="store">
          <span class="ny-bag__tag-number">Evento {{ store.event_number }}</span>
          <button
            type="button"
            class="ny-bag__copy"
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
          class="ny-bag__button btn-shine inv-btn"
          data-text="button"
          target="_blank"
          rel="noopener"
          :aria-label="`${button}: ${store.name}`"
        >
          {{ button }}
        </a>
      </article>
    </div>

    <section v-if="envelope" class="ny-shower" aria-labelledby="ny-shower-title">
      <div class="ny-shower__envelope" aria-hidden="true">
        <span class="ny-shower__flap" />
      </div>
      <div class="ny-shower__card">
        <h3 id="ny-shower-title" class="ny-shower__title" data-text="envelope">
          {{ envelope.title || 'Lluvia de sobres' }}
        </h3>
        <p v-if="envelope.text" class="ny-shower__text" data-text="envelope">{{ envelope.text }}</p>
        <div v-if="envelope.account" class="ny-shower__bank" data-text="account">
          <span v-if="envelope.bank" class="ny-shower__bank-name">{{ envelope.bank }}</span>
          <span class="ny-shower__account">{{ groupDigits(envelope.account) }}</span>
          <span v-if="envelope.holder" class="ny-shower__holder">{{ envelope.holder }}</span>
          <button
            type="button"
            class="ny-bag__copy"
            aria-label="Copiar el número de cuenta"
            @click="copy(envelope.account, 'account')"
          >
            <AppIcon name="copy" />
            {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <p v-else-if="envelope.hidden" class="ny-shower__private">
          Los datos para tu sobre vienen en tu invitación personal.
        </p>
        <p v-if="envelope.box" class="ny-shower__box">
          También habrá caja para sobres en el salón.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ny-gifts {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.ny-gifts__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-gifts__text {
  max-width: 24rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(1.02rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
.ny-gifts__bags {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
  gap: var(--space-3) var(--space-2);
  width: 100%;
  padding-top: 1.6rem;
}

/* La bolsa: cuerpo con su doblez arriba, dos asas de cordón y el monograma grande. */
.ny-bag {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.6rem;
}
/* La sombra va en la bolsa entera (en el cuerpo, el recorte se la comería). */
.ny-bag {
  filter: drop-shadow(0 0.9rem 1rem rgb(0 0 0 / 0.35));
}
.ny-bag__body {
  --bag: var(--color-primary-strong);
  --bag-ink: var(--color-bg);
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.3rem;
  width: min(100%, 11rem);
  aspect-ratio: 4 / 4.6;
  padding: 1.4rem 0.8rem 1rem;
  background:
    linear-gradient(180deg, rgb(0 0 0 / 0.16) 0 0.55rem, transparent 0.55rem),
    linear-gradient(100deg, rgb(255 255 255 / 0.12), transparent 40%), var(--bag);
  color: var(--bag-ink);
  clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%);
}
.ny-bag--tone-1 .ny-bag__body {
  --bag: var(--color-night);
  --bag-ink: var(--color-on-night);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}
.ny-bag--tone-2 .ny-bag__body {
  --bag: color-mix(in srgb, var(--color-primary-soft) 70%, var(--color-primary));
  --bag-ink: var(--color-night);
}
/* Las asas salen por arriba de la bolsa: van en el contenedor, fuera del recorte. */
.ny-bag {
  position: relative;
}
.ny-bag__handles {
  position: absolute;
  z-index: 1;
  top: -1.45rem;
  left: 50%;
  width: 46%;
  height: 2.1rem;
  translate: -50% 0;
  border: 2px solid var(--color-primary);
  border-bottom: 0;
  border-radius: 999px 999px 0 0;
  clip-path: inset(0 0 0.65rem 0);
}
.ny-bag__monogram {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 16cqi, 3.2rem);
  line-height: 1;
}
.ny-bag__name {
  margin: 0;
  font-family: var(--t-store-font, var(--font-caps));
  font-weight: 500;
  font-size: calc(0.78rem * var(--t-store-size, 1));
  line-height: 1.3;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--t-store-color, inherit);
}
.ny-bag__note {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 0.82rem;
  opacity: 0.85;
}
/* La etiqueta del número de evento, como la de una prenda. */
.ny-bag__tag {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  margin: 0;
  padding: 0.45rem 0.7rem;
  border: 1px dashed color-mix(in srgb, var(--color-primary) 70%, transparent);
  border-radius: 0.3rem;
  font-family: var(--t-store-font, var(--font-caps));
  font-size: calc(0.72rem * var(--t-store-size, 1));
  letter-spacing: 0.12em;
  color: var(--t-store-color, var(--color-text));
}
.ny-bag__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 60%, transparent);
  border-radius: 999px;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.ny-bag__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.ny-bag__button {
  padding: 0.5rem 1.2rem;
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-on-button, var(--color-text))));
  font-family: var(--t-button-font, var(--font-button));
  font-weight: 600;
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-decoration: var(--btn-decoration, none);
  text-transform: var(--btn-case, uppercase);
  box-shadow: var(--btn-shadow, var(--shadow-button));
  border: var(--btn-border, 0);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
:is(.ny-bag__copy, .ny-bag__button):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

/* La lluvia de sobres: un sobre déco abierto con la tarjeta de los datos asomando. */
.ny-shower {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100%, 22rem);
  margin-top: var(--space-3);
  padding-top: 3.2rem;
}
.ny-shower__envelope {
  position: absolute;
  inset: 3.2rem 0 0;
  background: linear-gradient(170deg, var(--color-primary-strong), var(--color-primary) 80%);
  box-shadow: 0 1rem 1.8rem rgb(0 0 0 / 0.35);
}
/* La solapa abierta, hacia arriba, con un filo déco. */
.ny-shower__flap {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 3.2rem;
  background: linear-gradient(0deg, var(--color-primary-strong), var(--color-primary-soft));
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
}
.ny-shower__card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  width: calc(100% - 2.2rem);
  margin-top: -2.2rem;
  padding: 1.3rem 1rem 1.2rem;
  background: var(--color-surface);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 45%, transparent),
    0 0.4rem 0.9rem rgb(0 0 0 / 0.25);
}
.ny-shower__title {
  margin: 0;
  font-family: var(--t-envelope-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 9cqi, 2.3rem) * var(--t-envelope-size, 1));
  line-height: 1.1;
  color: var(--t-envelope-color, var(--color-primary));
}
.ny-shower__text {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  color: var(--color-text);
}
.ny-shower__bank {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  width: 100%;
  padding: 0.7rem 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  font-family: var(--t-account-font, var(--font-serif));
  color: var(--t-account-color, var(--color-text));
}
.ny-shower__bank-name {
  font-family: var(--font-caps);
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.ny-shower__account {
  font-family: var(--font-caps);
  font-size: calc(1.1rem * var(--t-account-size, 1));
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
}
.ny-shower__holder {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 0.9rem;
}
.ny-shower__private,
.ny-shower__box {
  margin: 0;
  font-size: 0.86rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
</style>
