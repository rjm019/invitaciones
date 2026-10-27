<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Mesa de regalos en etiquetas ("etiqueta"): cada tienda es una etiqueta de papel con el
 * borde de abajo rasgado, una hilera de perforaciones y una perla colgada de su hilo en el
 * ojal (o el moño de la ranura "lazo"). La lluvia de sobres es una etiqueta más ancha con
 * los datos para copiar. Por el enlace general los datos bancarios no llegan: se avisa
 * dónde están. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const { copied, copy } = useClipboard()

const title = computed(() => props.section.title ?? 'Mesa de regalos')
const button = computed(() => props.section.button ?? 'Ver mesa')
const stores = computed(() => event.value.gifts?.stores ?? [])
const envelope = computed(() => event.value.gifts?.envelope ?? null)
const bow = computed(() => decorOr(props.section.decor, 'bow', null))
const divider = computed(() =>
  decorOr(props.section.decor, 'divider', resolveAsset.value('perlas.svg')),
)
</script>

<template>
  <div class="tags">
    <h2 class="tags__title" data-text="title">{{ title }}</h2>
    <img v-if="divider" :src="divider" alt="" class="tags__divider" />
    <p v-if="section.text" class="tags__text" data-text="text">{{ section.text }}</p>

    <div v-if="stores.length" class="tags__list">
      <article v-for="(store, i) in stores" :key="i" class="tag" :style="{ '--turn': `${[-2, 1.5, -1, 2][i % 4]}deg` }">
        <span class="tag__hole" aria-hidden="true">
          <img v-if="bow" :src="bow" alt="" class="tag__bow" />
          <span v-else class="tag__pearl" />
        </span>
        <h3 class="tag__name" data-text="store">{{ store.name }}</h3>
        <p v-if="store.note" class="tag__note" data-text="store">{{ store.note }}</p>
        <p v-if="store.event_number" class="tag__number" data-text="store">
          <span>Evento {{ store.event_number }}</span>
          <button
            type="button"
            class="tag__copy"
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
          class="tag__button btn-shine inv-btn"
          data-text="button"
          target="_blank"
          rel="noopener"
          :aria-label="`${button}: ${store.name}`"
        >
          {{ button }}
        </a>
        <span class="tag__perforation" aria-hidden="true" />
      </article>
    </div>

    <section v-if="envelope" class="tag tag--wide" aria-labelledby="tags-shower-title">
      <span class="tag__hole" aria-hidden="true"><span class="tag__pearl" /></span>
      <h3 id="tags-shower-title" class="tag__name" data-text="envelope">
        {{ envelope.title || 'Lluvia de sobres' }}
      </h3>
      <p v-if="envelope.text" class="tag__note" data-text="envelope">{{ envelope.text }}</p>
      <div v-if="envelope.account" class="tag__bank" data-text="account">
        <span v-if="envelope.bank">{{ envelope.bank }}</span>
        <strong>{{ groupDigits(envelope.account) }}</strong>
        <span v-if="envelope.holder">{{ envelope.holder }}</span>
        <button
          type="button"
          class="tag__copy"
          aria-label="Copiar el número de cuenta"
          @click="copy(envelope.account, 'account')"
        >
          <AppIcon name="copy" />
          {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      <p v-else-if="envelope.hidden" class="tag__note">
        Los datos para tu sobre vienen en tu invitación personal.
      </p>
      <p v-if="envelope.box" class="tag__note">También habrá caja para sobres en el salón.</p>
      <span class="tag__perforation" aria-hidden="true" />
    </section>
  </div>
</template>

<style scoped>
.tags {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  text-align: center;
}
.tags__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.tags__divider {
  width: min(70%, 14rem);
}
.tags__text {
  max-width: 28rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
.tags__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
  gap: 1.6rem 1rem;
  width: 100%;
}

/* La etiqueta: papel con el filo de abajo rasgado y sus perforaciones. */
.tag {
  --paper: var(--color-paper, var(--color-primary-soft));
  --ink: var(--color-accent-strong, #3f4535);
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 2.6rem 1rem 2.4rem;
  rotate: var(--turn, 0deg);
  background:
    url('../../../themes/_shared/assets/grano.svg') 0 0 / 240px,
    linear-gradient(180deg, color-mix(in srgb, var(--paper) 92%, #000), var(--paper) 30%);
  color: var(--ink);
  clip-path: polygon(
    0 0,
    100% 0,
    100% 96%,
    94% 98.5%,
    86% 96.5%,
    78% 99%,
    70% 97%,
    61% 99.5%,
    52% 97%,
    43% 99%,
    34% 96.5%,
    25% 99%,
    16% 97%,
    8% 99%,
    0 96.5%
  );
}
.tag--wide {
  width: 100%;
  max-width: 24rem;
}
.tag__hole {
  position: absolute;
  top: 0.6rem;
  left: 50%;
  display: grid;
  place-items: center;
  width: 1.1rem;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: var(--color-bg);
  box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.5);
}
.tag__pearl {
  width: 0.8rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, #f1ebdb 45%, #b7ad95 100%);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.4);
}
.tag__bow {
  width: 2rem;
  margin-top: 1.6rem;
}
/* Perforaciones: una hilera de círculos por donde se rasga. */
.tag__perforation {
  position: absolute;
  left: 0.9rem;
  right: 0.9rem;
  bottom: 1.15rem;
  height: 4px;
  background: radial-gradient(circle, color-mix(in srgb, var(--ink) 55%, transparent) 1.2px, transparent 1.8px)
    0 0 / 10px 4px repeat-x;
}
.tag__name {
  margin: 0;
  font-family: var(--t-store-font, var(--font-caps));
  font-size: calc(1.15rem * var(--t-store-size, 1));
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t-store-color, var(--ink));
}
.tag__note,
.tag__number,
.tag__bank {
  display: grid;
  justify-items: center;
  gap: 0.2rem;
  margin: 0;
  font-family: var(--t-store-font, var(--font-serif));
  font-size: calc(0.98rem * var(--t-store-size, 1));
  color: var(--t-store-color, var(--ink));
}
.tag__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--ink) 45%, transparent);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
}
.tag__button {
  display: inline-flex;
  align-items: center;
  margin-top: 0.3rem;
  padding: 0.35rem 1.2rem;
  border: 0;
  border-radius: var(--btn-radius, 6px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--ink) 78%, #fff) 0%, var(--ink) 100%);
  color: var(--paper);
  font-family: var(--t-button-font, var(--font-button));
  font-size: calc(0.95rem * var(--t-button-size, 1));
  font-weight: 600;
  letter-spacing: var(--btn-tracking, 0.06em);
  text-decoration: none;
  text-transform: var(--btn-case, none);
  clip-path: var(--btn-clip, none);
}
</style>
