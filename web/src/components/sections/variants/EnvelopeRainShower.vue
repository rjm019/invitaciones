<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Lluvia de sobres de Nueva York ("sobre"): un sobre art déco con la solapa abierta y la
 * tarjeta de los datos asomando (con botón para copiar la cuenta). Por el enlace general
 * los datos bancarios no llegan: se avisa dónde están.
 */
defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()
const envelope = computed(() => event.value.envelope ?? null)
</script>

<template>
  <div class="ny-rain">
    <section v-if="envelope" class="ny-shower" aria-labelledby="ny-shower-title">
      <div class="ny-shower__envelope" aria-hidden="true">
        <span class="ny-shower__flap" />
      </div>
      <div class="ny-shower__card">
        <h2 id="ny-shower-title" class="ny-shower__title" data-text="title">
          {{ envelope.title || 'Lluvia de sobres' }}
        </h2>
        <p v-if="envelope.text" class="ny-shower__text" data-text="text">{{ envelope.text }}</p>
        <div v-if="envelope.account" class="ny-shower__bank" data-text="account">
          <span v-if="envelope.bank" class="ny-shower__bank-name">{{ envelope.bank }}</span>
          <span class="ny-shower__account">{{ groupDigits(envelope.account) }}</span>
          <span v-if="envelope.holder" class="ny-shower__holder">{{ envelope.holder }}</span>
          <button
            type="button"
            class="ny-shower__copy"
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
.ny-rain {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.ny-shower {
  position: relative;
  display: grid;
  justify-items: center;
  width: min(100%, 22rem);
  margin-top: 0;
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
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 9cqi, 2.3rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
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
.ny-shower__copy {
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
.ny-shower__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.ny-shower__copy:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
