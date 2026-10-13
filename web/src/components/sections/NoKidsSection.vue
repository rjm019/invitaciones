<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/** Aviso de evento sin niños: título, etiqueta ("Solo adultos") y el mensaje del layout. */
const props = defineProps<{ section: ResolvedSection }>()
const title = computed(() => props.section.title ?? 'Sin niños')
const badge = computed(() => props.section.subtitle ?? 'Solo adultos')
const text = computed(
  () =>
    props.section.text ??
    'Queremos mucho a sus pequeños, pero esta celebración es solo para adultos. ¡Gracias por su comprensión!',
)
</script>

<template>
  <div class="no-kids">
    <img v-if="section.decor.bow" :src="section.decor.bow" alt="" class="no-kids__bow" />
    <h2 class="no-kids__title">{{ title }}</h2>
    <p v-if="badge" class="no-kids__badge">{{ badge }}</p>
    <p v-if="text" class="no-kids__text">{{ text }}</p>
  </div>
</template>

<style scoped>
.no-kids {
  display: grid;
  justify-items: center;
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
.no-kids__bow {
  width: min(24%, 6rem);
  margin-bottom: var(--space-1);
}
.no-kids__title {
  margin: 0;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: var(--text-title);
  line-height: 1.15;
  color: var(--color-primary);
}
.no-kids__badge {
  margin: var(--space-1) 0 0;
  padding: 0.3rem 1.1rem;
  border: 1px solid var(--color-primary);
  border-radius: 999px;
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.no-kids__text {
  margin: var(--space-2) 0 0;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  line-height: 1.4;
}
</style>
