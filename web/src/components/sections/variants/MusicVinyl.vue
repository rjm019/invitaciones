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
 * Música de Nueva York ("vinilo"): la canción en un tocadiscos. El disco gira mientras
 * suena (el brillo se queda quieto, como en uno de verdad) y el brazo baja sobre él; en la
 * etiqueta, el nombre de la festejada. Los controles son los de siempre: atrás y adelante
 * 10 s, reproducir y repetir.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()

const state = computed(() => music?.state.value)
const available = computed(() => !!state.value?.available)
const playing = computed(() => !!state.value?.playing)
const title = computed(() => props.section.title ?? 'Dale play')
const label = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || '',
)

// Mientras el tocadiscos está en pantalla, el mini-reproductor se esconde.
const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
watch(inView, (v) => music && (music.playerInView.value = v), { immediate: true })

function onSeek(e: Event) {
  music?.seek(Number((e.target as HTMLInputElement).value))
}

// Como en el reproductor de siempre: Spotify debajo, salvo que haya sección de playlist.
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
  <div ref="root" class="ny-vinyl" :class="{ 'is-playing': playing, 'is-off': !available }">
    <h2 class="ny-vinyl__title" data-text="title">{{ title }}</h2>

    <div class="ny-vinyl__deck" aria-hidden="true">
      <span class="ny-vinyl__platter" />
      <span class="ny-vinyl__disc">
        <span class="ny-vinyl__label">{{ label }}</span>
      </span>
      <span class="ny-vinyl__shine" />
      <span class="ny-vinyl__arm" />
    </div>

    <div class="ny-vinyl__progress">
      <span class="ny-vinyl__time">{{ formatTime(state?.current ?? 0) }}</span>
      <input
        type="range"
        class="ny-vinyl__range"
        min="0"
        :max="state?.duration || 1"
        step="0.1"
        :value="state?.current ?? 0"
        :disabled="!available"
        :style="{ '--fill': `${state?.duration ? (state.current / state.duration) * 100 : 0}%` }"
        aria-label="Avance de la canción"
        @input="onSeek"
      />
      <span class="ny-vinyl__time">{{ formatTime(state?.duration ?? 0) }}</span>
    </div>

    <div class="ny-vinyl__controls">
      <button
        type="button"
        class="ny-vinyl__control"
        :disabled="!available"
        aria-label="Regresar 10 segundos"
        @click="music?.skip(-10)"
      >
        <AppIcon name="backward" />
      </button>
      <button
        type="button"
        class="ny-vinyl__play"
        :disabled="!available"
        :aria-label="playing ? 'Pausar la música' : 'Reproducir la música'"
        @click="music?.toggle()"
      >
        <AppIcon :name="playing ? 'pause' : 'play'" />
      </button>
      <button
        type="button"
        class="ny-vinyl__control"
        :disabled="!available"
        aria-label="Adelantar 10 segundos"
        @click="music?.skip(10)"
      >
        <AppIcon name="forward" />
      </button>
      <button
        type="button"
        class="ny-vinyl__control ny-vinyl__control--repeat"
        :class="{ 'is-off': !state?.loop }"
        :disabled="!available || !state?.canLoop"
        :aria-pressed="!!state?.loop"
        aria-label="Repetir la canción"
        @click="music?.setLoop(!state?.loop)"
      >
        <AppIcon name="repeat" />
      </button>
    </div>

    <p v-if="state?.error" class="ny-vinyl__error" role="status">{{ state.error }}</p>

    <div v-if="hostsSpotify" ref="spotifyHost" class="ny-vinyl__spotify-host" />
    <iframe
      v-else-if="spotifyEmbed"
      class="ny-vinyl__spotify"
      :src="spotifyEmbed"
      title="Playlist en Spotify"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  </div>
</template>

<style scoped>
.ny-vinyl {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 24rem;
  margin: 0 auto;
}
.ny-vinyl__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}

/* El tocadiscos: plato, disco con sus surcos, la etiqueta, el brillo fijo y el brazo. */
.ny-vinyl__deck {
  position: relative;
  width: min(78cqi, 17rem);
  aspect-ratio: 1;
}
.ny-vinyl__platter {
  position: absolute;
  inset: -4%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-primary) 30%, var(--color-night)) 0 68%,
    color-mix(in srgb, var(--color-primary) 55%, transparent) 69% 70%,
    transparent 71%
  );
  box-shadow: 0 1.2rem 2.4rem rgb(0 0 0 / 0.5);
}
.ny-vinyl__disc {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    repeating-radial-gradient(
      circle,
      color-mix(in srgb, var(--color-night) 90%, var(--color-primary)) 0 1.5px,
      var(--color-night) 1.5px 3px
    ),
    var(--color-night);
  animation: ny-spin calc(1.8s * var(--motion-scale)) linear infinite;
  animation-play-state: paused;
}
.is-playing .ny-vinyl__disc {
  animation-play-state: running;
}
@keyframes ny-spin {
  to {
    transform: rotate(360deg);
  }
}
.ny-vinyl__label {
  display: grid;
  place-items: center;
  width: 36%;
  aspect-ratio: 1;
  padding: 6%;
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--color-night) 0 5%, transparent 5.5%),
    radial-gradient(
      circle at 35% 30%,
      var(--color-primary-soft),
      var(--color-primary) 60%,
      var(--color-primary-strong)
    );
  color: var(--color-bg);
  font-family: var(--font-script);
  font-size: clamp(0.95rem, 6cqi, 1.5rem);
  line-height: 1;
  text-align: center;
  overflow: hidden;
}
/* El reflejo de la luz no gira con el disco: se queda quieto encima. */
.ny-vinyl__shine {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 20deg,
    transparent 0 10%,
    rgb(255 255 255 / 0.14) 16%,
    transparent 24% 58%,
    rgb(255 255 255 / 0.1) 64%,
    transparent 72%
  );
  -webkit-mask: radial-gradient(circle, transparent 0 19%, #000 20%);
  mask: radial-gradient(circle, transparent 0 19%, #000 20%);
  pointer-events: none;
}
/* El brazo: gira desde su base (arriba a la derecha) hasta quedar sobre el disco. */
.ny-vinyl__arm {
  position: absolute;
  top: -6%;
  right: -2%;
  width: 6%;
  height: 62%;
  transform-origin: 50% 6%;
  transform: rotate(-26deg);
  transition: transform calc(0.9s * var(--motion-scale)) var(--ease-out);
  background:
    radial-gradient(
      circle at 50% 6%,
      var(--color-primary-soft) 0 32%,
      var(--color-primary) 33% 48%,
      transparent 50%
    ),
    linear-gradient(var(--color-primary-strong), var(--color-primary-strong)) 50% 10% / 22% 82%
      no-repeat,
    linear-gradient(var(--color-primary), var(--color-primary)) 50% 100% / 70% 12% no-repeat;
  filter: drop-shadow(0 0.3rem 0.4rem rgb(0 0 0 / 0.45));
}
.is-playing .ny-vinyl__arm {
  transform: rotate(4deg);
}

.ny-vinyl__progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  font-family: var(--font-caps);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.ny-vinyl__range {
  width: 100%;
  height: 2px;
  margin: 0;
  appearance: none;
  background: linear-gradient(
    90deg,
    var(--color-primary) var(--fill, 0%),
    color-mix(in srgb, var(--color-primary) 25%, transparent) var(--fill, 0%)
  );
  cursor: pointer;
}
.ny-vinyl__range::-webkit-slider-thumb {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: var(--color-primary-strong);
  appearance: none;
}
.ny-vinyl__range::-moz-range-thumb {
  width: 0.85rem;
  height: 0.85rem;
  border: 0;
  border-radius: 50%;
  background: var(--color-primary-strong);
}
/* Atrás, reproducir y adelante, centrados bajo el disco; repetir, en la orilla derecha. */
.ny-vinyl__controls {
  display: grid;
  grid-template-columns: 1fr repeat(3, auto) 1fr;
  align-items: center;
  gap: clamp(0.8rem, 6cqi, 1.6rem);
  width: 100%;
}
.ny-vinyl__controls > :first-child {
  grid-column: 2;
}
.ny-vinyl__control--repeat {
  justify-self: end;
}
.ny-vinyl__control,
.ny-vinyl__play {
  display: grid;
  place-items: center;
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
}
.ny-vinyl__control {
  width: 2.4rem;
  height: 2.4rem;
}
.ny-vinyl__control :deep(.app-icon) {
  width: 1.05rem;
  height: 1.05rem;
}
.ny-vinyl__control.is-off {
  opacity: 0.45;
}
.ny-vinyl__play {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 50%;
  background: var(--button-gradient);
  color: var(--color-on-button, var(--color-bg));
  box-shadow: var(--shadow-button);
}
.ny-vinyl__play :deep(.app-icon) {
  width: 1.2rem;
  height: 1.2rem;
}
:is(.ny-vinyl__control, .ny-vinyl__play):disabled {
  cursor: default;
  opacity: 0.5;
}
:is(.ny-vinyl__control, .ny-vinyl__play):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.ny-vinyl__error {
  margin: 0;
  font-style: italic;
  color: var(--color-primary);
}
.ny-vinyl__spotify,
.ny-vinyl__spotify-host {
  width: 100%;
  height: 152px;
  border: 0;
  border-radius: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .ny-vinyl__disc {
    animation: none;
  }
  .ny-vinyl__arm {
    transition: none;
  }
}
</style>
