<script setup lang="ts">
import { computed } from 'vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Frase en script azul con el laurel abajo. Con el efecto "escribir", aparece letra por
 * letra (1.2 s en total) al entrar a la pantalla. El lector de pantalla lee la frase entera.
 */
const props = defineProps<{ section: ResolvedSection }>()
const text = computed(() => props.section.text ?? props.section.title ?? '')
</script>

<template>
  <figure class="quote">
    <blockquote class="quote__text">
      <TypewriterText :text="text" :active="section.effects.includes('typewriter')" />
    </blockquote>
    <img v-if="section.decor.divider" :src="section.decor.divider" alt="" class="quote__divider" />
  </figure>
</template>

<style scoped>
.quote {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
.quote__text {
  margin: 0;
  font-family: var(--font-script-mono);
  font-size: clamp(1.7rem, 9.6cqi, 2.5rem);
  line-height: 1.2;
  color: var(--color-accent);
}
.quote__divider {
  width: 88%;
}
</style>
