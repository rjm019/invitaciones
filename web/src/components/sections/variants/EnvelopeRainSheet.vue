<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PaperSheet from '@/components/ui/PaperSheet.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Lluvia de sobres en lámina (`lamina`): el título (y el texto, si hay) dentro de la zona
 * segura de una imagen de papel; debajo, fuera de la imagen, los datos bancarios con su
 * botón para copiar. Por el enlace general los datos no llegan: se avisa dónde están.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()
const envelope = computed(() => event.value.envelope ?? null)
const src = computed(() => decorOr(props.section.decor, 'sheet', null))
const sheet = computed(() => props.section.sheet ?? {})
</script>

<template>
  <div class="rsheet">
    <section v-if="envelope" class="rsheet__box" aria-labelledby="rsheet-title">
      <PaperSheet :src="src" :aspect="sheet.aspect" :safe="sheet">
        <h2 id="rsheet-title" class="rsheet__title" data-text="title">
          {{ envelope.title || 'Lluvia de sobres' }}
        </h2>
        <p v-if="envelope.text" class="rsheet__text" data-text="text">{{ envelope.text }}</p>
      </PaperSheet>
      <div v-if="envelope.account" class="rsheet__bank" data-text="account">
        <span v-if="envelope.bank" class="rsheet__bank-name">{{ envelope.bank }}</span>
        <span class="rsheet__account">{{ groupDigits(envelope.account) }}</span>
        <span v-if="envelope.holder" class="rsheet__holder">{{ envelope.holder }}</span>
        <button
          type="button"
          class="rsheet__copy"
          aria-label="Copiar el número de cuenta"
          @click="copy(envelope.account, 'account')"
        >
          <AppIcon name="copy" />
          {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      <p v-else-if="envelope.hidden" class="rsheet__note">
        Los datos para tu sobre vienen en tu invitación personal.
      </p>
      <p v-if="envelope.box" class="rsheet__note">También habrá caja para sobres en el salón.</p>
    </section>
  </div>
</template>

<style scoped>
.rsheet {
  display: grid;
  justify-items: center;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.rsheet__box {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  width: 100%;
}
.rsheet__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.5rem, 11cqi, 2.8rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
  overflow-wrap: anywhere;
}
.rsheet__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(0.8rem, 5cqi, 1.1rem) * var(--t-text-size, 1));
  color: var(--t-text-color, var(--color-text));
}
.rsheet__bank {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  width: min(100%, 24rem);
  padding: 0.9rem 1rem;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  font-family: var(--t-account-font, var(--font-serif));
  color: var(--t-account-color, var(--color-text));
  box-shadow: var(--shadow-card);
}
.rsheet__bank-name {
  font-family: var(--font-caps);
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.rsheet__account {
  font-size: calc(1.15rem * var(--t-account-size, 1));
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.rsheet__holder {
  font-size: 0.9rem;
  opacity: 0.85;
}
.rsheet__copy {
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
.rsheet__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.rsheet__copy:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.rsheet__note {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
</style>
