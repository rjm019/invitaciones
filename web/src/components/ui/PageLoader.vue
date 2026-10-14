<script setup lang="ts">
/**
 * Pantalla de espera mientras la invitación termina de cargar (datos, fuentes e imágenes):
 * el papel con tres puntos que laten. La misma en todas las páginas, así no hay saltos
 * entre "cargando el evento" y "cargando las imágenes". Con `busy` en false solo muestra
 * el mensaje (errores).
 */
withDefaults(defineProps<{ message?: string; busy?: boolean }>(), {
  message: 'Abriendo tu invitación…',
  busy: true,
})
</script>

<template>
  <div class="page-loader" role="status" :aria-busy="busy">
    <span v-if="busy" class="page-loader__dots" aria-hidden="true"><i /><i /><i /></span>
    <p class="page-loader__text">{{ message }}</p>
  </div>
</template>

<style scoped>
.page-loader {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1rem;
  min-height: 100vh;
  min-height: 100svh;
  padding: 1.5rem;
  text-align: center;
  background: var(--color-bg);
  color: var(--color-text);
}
.page-loader__text {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  opacity: 0.85;
}
.page-loader__dots {
  display: flex;
  gap: 0.5rem;
}
.page-loader__dots i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--color-primary);
  animation: page-loader-dot calc(1.1s * var(--motion-scale)) ease-in-out infinite;
}
.page-loader__dots i:nth-child(2) {
  animation-delay: calc(0.18s * var(--motion-scale));
}
.page-loader__dots i:nth-child(3) {
  animation-delay: calc(0.36s * var(--motion-scale));
}
@keyframes page-loader-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: scale(0.75);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .page-loader__dots i {
    animation: none;
    opacity: 0.6;
  }
}
</style>
