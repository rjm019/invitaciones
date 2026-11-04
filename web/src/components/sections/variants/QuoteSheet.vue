<script setup lang="ts">
import { computed } from 'vue'
import PaperSheet from '@/components/ui/PaperSheet.vue'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Frase en lámina (`lamina`): la frase sobre una imagen de papel o encaje (ranura `lamina`)
 * que se ve completa, con la frase dentro de su zona segura. Sin imagen, una tarjeta lisa.
 */
const props = defineProps<{ section: ResolvedSection }>()
const text = computed(() => props.section.text ?? props.section.title ?? '')
const src = computed(() => decorOr(props.section.decor, 'sheet', null))
const sheet = computed(() => props.section.sheet ?? {})
</script>

<template>
  <figure class="qsheet">
    <PaperSheet :src="src" :aspect="sheet.aspect" :safe="sheet">
      <blockquote class="qsheet__text" data-text="text">{{ text }}</blockquote>
    </PaperSheet>
  </figure>
</template>

<style scoped>
.qsheet {
  margin: 0;
}
.qsheet__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-script));
  color: var(--t-text-color, var(--color-accent));
  font-size: calc(clamp(1.1rem, 9cqi, 2.1rem) * var(--t-text-size, 1));
  line-height: 1.25;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
</style>
