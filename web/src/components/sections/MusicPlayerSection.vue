<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { useMusic } from '@/composables/useMusic'
import { formatTime } from '@/services/audioService'
import { spotifyEmbed as spotifyEmbedFor } from '@/services/spotifyService'
import type { ResolvedSection } from '@/types/event'

/**
 * Reproductor "Dale play": la misma canción que inicia el sobre. Atrás/adelante mueven
 * 10 s y "repetir" deja la canción en bucle. Sin canción en el layout, los controles se
 * ven pero quedan desactivados.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()

const state = computed(() => music?.state.value)
const available = computed(() => !!state.value?.available)
const title = computed(() => props.section.title ?? 'Dale play')

// Mientras el reproductor está en pantalla, el mini-reproductor se esconde.
const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
watch(inView, (v) => music && (music.playerInView.value = v), { immediate: true })

function onSeek(e: Event) {
  music?.seek(Number((e.target as HTMLInputElement).value))
}

// Spotify (opcional): reproductor compacto debajo, salvo que el layout tenga su propia
// sección de playlist (entonces la lista completa vive ahí). Si la música del evento sale
// de Spotify, este reproductor es el que suena y los controles dorados lo manejan.
const hostsSpotify = computed(() => music?.spotifyHost() === 'music-player')
const spotifyEmbed = computed(() => {
  const hasPlaylist = event.value.sections.some((s) => s.type === 'spotify' && s.visible !== false)
  if (hasPlaylist || hostsSpotify.value) return null
  return spotifyEmbedFor(event.value.music.spotify_url)?.embedUrl ?? null
})
const spotifyHost = ref<HTMLElement | null>(null)
onMounted(() => {
  if (hostsSpotify.value && spotifyHost.value) music?.attachSpotify(spotifyHost.value, 152)
})
</script>

<template>
  <div ref="root" class="player" :class="{ 'player--off': !available }">
    <AppIcon name="heart" class="player__heart" :class="{ 'is-beating': state?.playing }" />
    <h2 class="player__title" data-text="title">{{ title }}</h2>
    <span class="player__eq" :class="{ 'is-playing': state?.playing }" aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>

    <div class="player__progress">
      <input
        type="range"
        class="player__range"
        min="0"
        :max="state?.duration || 1"
        step="0.1"
        :value="state?.current ?? 0"
        :disabled="!available"
        :style="{ '--fill': `${state?.duration ? (state.current / state.duration) * 100 : 0}%` }"
        aria-label="Avance de la canción"
        @input="onSeek"
      />
      <div v-if="available && state?.duration" class="player__times" aria-hidden="true">
        <span>{{ formatTime(state.current) }}</span>
        <span>{{ formatTime(state.duration) }}</span>
      </div>
    </div>

    <div class="player__controls">
      <span class="player__control player__control--deco" aria-hidden="true"
        ><AppIcon name="shuffle"
      /></span>
      <button
        type="button"
        class="player__control"
        :disabled="!available"
        aria-label="Regresar 10 segundos"
        @click="music?.skip(-10)"
      >
        <AppIcon name="backward" />
      </button>
      <button
        type="button"
        class="player__play"
        :disabled="!available"
        :aria-label="state?.playing ? 'Pausar la música' : 'Reproducir la música'"
        @click="music?.toggle()"
      >
        <AppIcon :name="state?.playing ? 'pause' : 'play'" />
      </button>
      <button
        type="button"
        class="player__control"
        :disabled="!available"
        aria-label="Adelantar 10 segundos"
        @click="music?.skip(10)"
      >
        <AppIcon name="forward" />
      </button>
      <button
        type="button"
        class="player__control"
        :class="{ 'is-off': !state?.loop }"
        :disabled="!available || !state?.canLoop"
        :aria-pressed="!!state?.loop"
        aria-label="Repetir la canción"
        @click="music?.setLoop(!state?.loop)"
      >
        <AppIcon name="repeat" />
      </button>
    </div>

    <p v-if="state?.error" class="player__error" role="status">{{ state.error }}</p>

    <div v-if="hostsSpotify" ref="spotifyHost" class="player__spotify-host" />
    <iframe
      v-else-if="spotifyEmbed"
      class="player__spotify"
      :src="spotifyEmbed"
      title="Playlist en Spotify"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  </div>
</template>

<style scoped>
.player {
  position: relative;
  display: grid;
  gap: 0.6rem;
  max-width: 24rem;
  margin: 0 auto;
  text-align: center;
}
.player__heart {
  position: absolute;
  top: -0.4rem;
  right: -0.2rem;
  font-size: 0.75rem;
  color: var(--color-accent);
}
.player__heart.is-beating {
  animation: player-beat calc(1.1s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes player-beat {
  0%,
  100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.3);
  }
  30% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.18);
  }
}
/* Ecualizador: cinco barras doradas; quietas y bajitas cuando no suena nada. */
.player__eq {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 1.1rem;
  margin: -0.2rem auto 0.2rem;
}
.player__eq i {
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: var(--color-primary);
  transform: scaleY(0.2);
  transform-origin: bottom;
  transition: transform calc(0.4s * var(--motion-scale)) var(--ease-out);
}
.player__eq.is-playing i {
  animation: player-eq calc(0.9s * var(--motion-scale)) ease-in-out infinite alternate;
}
.player__eq.is-playing i:nth-child(2) {
  animation-duration: calc(0.7s * var(--motion-scale));
  animation-delay: calc(-0.3s * var(--motion-scale));
}
.player__eq.is-playing i:nth-child(3) {
  animation-duration: calc(1.1s * var(--motion-scale));
  animation-delay: calc(-0.5s * var(--motion-scale));
}
.player__eq.is-playing i:nth-child(4) {
  animation-duration: calc(0.8s * var(--motion-scale));
  animation-delay: calc(-0.2s * var(--motion-scale));
}
.player__eq.is-playing i:nth-child(5) {
  animation-duration: calc(1s * var(--motion-scale));
  animation-delay: calc(-0.7s * var(--motion-scale));
}
@keyframes player-eq {
  from {
    transform: scaleY(0.2);
  }
  to {
    transform: scaleY(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .player__heart.is-beating,
  .player__eq.is-playing i {
    animation: none;
  }
}
.player__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.1rem, 5cqi, 1.45rem) * var(--t-title-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.player__progress {
  display: grid;
  gap: 0.15rem;
}
/* Barra dorada: la parte recorrida en oro, el resto en oro claro. */
.player__range {
  --fill: 0%;
  appearance: none;
  width: 100%;
  height: 1.4rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
.player__range::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--color-primary) var(--fill),
    color-mix(in srgb, var(--color-primary) 35%, transparent) var(--fill)
  );
}
.player__range::-moz-range-track {
  height: 3px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--color-primary) 35%, transparent);
}
.player__range::-moz-range-progress {
  height: 3px;
  background: var(--color-primary);
}
.player__range::-webkit-slider-thumb {
  appearance: none;
  width: 0.95rem;
  height: 0.95rem;
  margin-top: calc((3px - 0.95rem) / 2);
  border: 0;
  border-radius: 50%;
  background: var(--color-primary);
}
.player__range::-moz-range-thumb {
  width: 0.95rem;
  height: 0.95rem;
  border: 0;
  border-radius: 50%;
  background: var(--color-primary);
}
.player__range:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.player__range:disabled {
  cursor: default;
}
.player__times {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-serif);
  font-size: 0.8rem;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
.player__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.2rem;
}
.player__control {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: clamp(0.85rem, 4cqi, 1.05rem);
  cursor: pointer;
}
.player__control--deco {
  cursor: default;
}
.player__control.is-off {
  opacity: 0.45;
}
.player__play {
  display: grid;
  place-items: center;
  width: 3.2rem;
  height: 3.2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: 0.7rem;
  box-shadow: var(--shadow-button, none);
  cursor: pointer;
}
.player__control:focus-visible,
.player__play:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 50%;
}
.player button:disabled {
  cursor: default;
}
.player__error {
  margin: 0;
  font-size: var(--text-small);
}
.player__spotify-host {
  width: 100%;
  margin-top: var(--space-2);
}
.player__spotify-host :deep(iframe) {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 12px;
}
.player__spotify {
  width: 100%;
  height: 152px;
  margin-top: var(--space-2);
  border: 0;
  border-radius: 12px;
}
</style>
