<script setup lang="ts">
import { computed, toRef } from 'vue'
import { usePanelTheme } from '@/composables/usePanelTheme'
import { ENDED_MESSAGE } from '@/services/albumService'
import type { PanelBrand } from '@/types/panel'

/**
 * "Este evento ya terminó. ¡Gracias por acompañarnos!": la invitación deja de abrir cuando se
 * cierra el álbum. Se ve con los colores y las letras del evento (los que manda la API en el
 * 410); sin ellos, con los de siempre.
 */
const props = defineProps<{ brand?: PanelBrand | null; message?: string }>()
usePanelTheme(toRef(() => props.brand ?? null))
const text = computed(() => props.message || ENDED_MESSAGE)
</script>

<template>
  <main class="ended">
    <p v-if="brand?.title" class="ended__kicker">{{ brand.title }}</p>
    <h1 class="ended__title" role="status">{{ text }}</h1>
  </main>
</template>

<style scoped>
.ended {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.8rem;
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--color-bg, #f3f1ec);
  color: var(--color-text, #523c0b);
  text-align: center;
}
.ended__kicker {
  margin: 0;
  font-family: var(--font-caps, Georgia, serif);
  font-size: 0.95rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-primary, #96792c);
}
.ended__title {
  max-width: 24rem;
  margin: 0;
  font-family: var(--font-script, Georgia, serif);
  font-weight: 400;
  font-size: clamp(2rem, 9vw, 3rem);
  line-height: 1.2;
  color: var(--color-primary, #96792c);
}
</style>
