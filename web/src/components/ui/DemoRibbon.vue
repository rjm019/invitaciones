<script setup lang="ts">
import { ref } from 'vue'

/**
 * Listón de las muestras (los demos de la landing): dice que es un ejemplo y lleva a
 * cotizar la propia. Se puede cerrar. No tapa el reproductor de música (abajo a la derecha).
 */
const open = ref(true)
</script>

<template>
  <aside v-if="open" class="demo-ribbon" aria-label="Invitación de muestra">
    <p class="demo-ribbon__text">
      <strong>Es una muestra.</strong>
      <span>La tuya, a la medida.</span>
    </p>
    <a class="demo-ribbon__cta" href="/#cotizar">Cotizar</a>
    <button
      type="button"
      class="demo-ribbon__close"
      aria-label="Cerrar aviso de muestra"
      @click="open = false"
    >
      ×
    </button>
  </aside>
</template>

<style scoped>
.demo-ribbon {
  position: fixed;
  left: max(1rem, env(safe-area-inset-left));
  /* Deja libre la esquina del reproductor de música. */
  right: calc(max(1rem, env(safe-area-inset-right)) + 4rem);
  bottom: max(1rem, env(safe-area-inset-bottom));
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 22rem;
  padding: 0.4rem 0.4rem 0.4rem 0.9rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--font-serif);
  animation: demo-ribbon-in calc(0.6s * var(--motion-scale)) var(--ease-out)
    calc(1.2s * var(--motion-scale)) both;
}
.demo-ribbon__text {
  display: grid;
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.2;
}
.demo-ribbon__text strong {
  font-weight: 600;
}
.demo-ribbon__cta {
  flex: none;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-surface);
  font-family: var(--font-button);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}
.demo-ribbon__close {
  flex: none;
  width: 1.9rem;
  height: 1.9rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
}
@keyframes demo-ribbon-in {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .demo-ribbon {
    animation: none;
  }
}
</style>
