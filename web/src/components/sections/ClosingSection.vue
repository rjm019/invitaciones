<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/** Cierre: "¡Te esperamos!" y, si el layout lo trae, un texto final. */
const props = defineProps<{ section: ResolvedSection }>()
const title = computed(() => props.section.title ?? '¡Te esperamos!')
</script>

<template>
  <div class="closing">
    <img v-if="section.decor.crown" :src="section.decor.crown" alt="" class="closing__crown" />
    <h2 class="closing__title">{{ title }}</h2>
    <p v-if="section.text" class="closing__text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.closing {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  max-width: 26rem;
  margin: 0 auto;
  padding-bottom: var(--space-3);
  text-align: center;
}
.closing__crown {
  width: 14%;
}
.closing__title {
  margin: 0;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2rem, 10cqi, 2.9rem);
  color: var(--color-primary);
}
.closing__text {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.4;
}
</style>
