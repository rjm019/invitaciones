<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Lluvia de sobres: el texto, los datos bancarios con su botón para copiar la cuenta y el
 * aviso de la caja en el salón. Por el enlace general los datos bancarios no llegan (el
 * servidor los quita): se avisa dónde están.
 */
defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()
const envelope = computed(() => event.value.envelope ?? null)
</script>

<template>
  <div class="rain">
    <section v-if="envelope" class="rain__box" aria-labelledby="rain-title">
      <AppIcon name="envelope" class="rain__icon" />
      <h2 id="rain-title" class="rain__title" data-text="title">
        {{ envelope.title || 'Lluvia de sobres' }}
      </h2>
      <p v-if="envelope.text" class="rain__text" data-text="text">{{ envelope.text }}</p>
      <div v-if="envelope.account" class="rain__bank" data-text="account">
        <span v-if="envelope.bank" class="rain__bank-name">{{ envelope.bank }}</span>
        <span class="rain__account">{{ groupDigits(envelope.account) }}</span>
        <span v-if="envelope.holder" class="rain__holder">{{ envelope.holder }}</span>
        <button
          type="button"
          class="rain__copy"
          aria-label="Copiar el número de cuenta"
          @click="copy(envelope.account, 'account')"
        >
          <AppIcon name="copy" />
          {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      <p v-else-if="envelope.hidden" class="rain__note">
        Los datos para tu sobre vienen en tu invitación personal.
      </p>
      <p v-if="envelope.box" class="rain__note">También habrá caja para sobres en el salón.</p>
    </section>
  </div>
</template>

<style scoped>
.rain {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.rain__box {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: min(100%, 24rem);
}
.rain__icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary);
}
.rain__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 2.8rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.rain__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  color: var(--t-text-color, var(--color-text));
}
.rain__bank {
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
.rain__bank-name {
  font-family: var(--font-caps);
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.rain__account {
  font-size: calc(1.15rem * var(--t-account-size, 1));
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.rain__holder {
  font-size: 0.9rem;
  opacity: 0.85;
}
.rain__copy {
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
.rain__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.rain__copy:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.rain__note {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
</style>
