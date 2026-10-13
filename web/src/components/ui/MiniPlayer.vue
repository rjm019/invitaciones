<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useMusic } from '@/composables/useMusic'

/**
 * Botón flotante de la música: aparece cuando la canción ya sonó y el reproductor
 * grande no está en pantalla. Abajo a la derecha, lejos del pulgar que hace scroll.
 */
const music = useMusic()
const visible = computed(
  () =>
    !!music &&
    music.state.value.available &&
    music.state.value.started &&
    !music.playerInView.value,
)
const playing = computed(() => music?.state.value.playing ?? false)
</script>

<template>
  <Transition name="mini-player">
    <button
      v-if="visible"
      type="button"
      class="mini-player"
      :class="{ 'is-playing': playing }"
      :aria-label="playing ? 'Pausar la música' : 'Reproducir la música'"
      @click="music?.toggle()"
    >
      <AppIcon :name="playing ? 'pause' : 'play'" class="mini-player__icon" />
    </button>
  </Transition>
</template>

<style scoped>
.mini-player {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  z-index: 20;
  display: grid;
  place-items: center;
  width: 3.2rem;
  height: 3.2rem;
  border: 0;
  border-radius: 50%;
  background: var(--button-gradient);
  color: var(--color-surface);
  box-shadow: var(--shadow-button, var(--shadow-card));
  cursor: pointer;
}
/* Ondas suaves mientras suena (solo transform y opacity). */
.mini-player::before,
.mini-player::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--color-primary-soft);
  opacity: 0;
}
.mini-player.is-playing::before,
.mini-player.is-playing::after {
  animation: mini-player-pulse calc(2.2s * var(--motion-scale)) ease-out infinite;
}
.mini-player.is-playing::after {
  animation-delay: calc(1.1s * var(--motion-scale));
}
@keyframes mini-player-pulse {
  from {
    transform: scale(1);
    opacity: 0.8;
  }
  to {
    transform: scale(1.6);
    opacity: 0;
  }
}
.mini-player__icon {
  font-size: 0.6rem;
}
.mini-player:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.mini-player-enter-active,
.mini-player-leave-active {
  transition:
    opacity calc(0.3s * var(--motion-scale)) var(--ease-out),
    transform calc(0.3s * var(--motion-scale)) var(--ease-out);
}
.mini-player-enter-from,
.mini-player-leave-to {
  opacity: 0;
  transform: translateY(1rem) scale(0.9);
}
@media (prefers-reduced-motion: reduce) {
  .mini-player.is-playing::before,
  .mini-player.is-playing::after {
    animation: none;
  }
  .mini-player-enter-active,
  .mini-player-leave-active {
    transition: none;
  }
}
</style>
