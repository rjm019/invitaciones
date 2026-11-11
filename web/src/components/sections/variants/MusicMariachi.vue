<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { useMusic } from '@/composables/useMusic'
import { formatTime } from '@/services/audioService'
import { spotifyEmbed as spotifyEmbedFor } from '@/services/spotifyService'
import type { ResolvedSection } from '@/types/event'
// El trío va en línea (no como imagen) para poder mecer a cada músico y hacer vibrar su instrumento.
import mariachisSvg from '@/themes/_shared/assets/mariachis.svg?raw'

/**
 * Música de mariachi (`mariachi`): el trío en acuarela. Al sonar, cada músico se mece
 * (desfasados entre sí), los instrumentos vibran apenas y suben notas; en pausa todo queda
 * quieto. Debajo, la canción y un botón redondo de play/pausa con una barra de avance. Es la
 * misma canción que inicia la portada. Con la música en Spotify, el reproductor de Spotify
 * está presente (es el que suena) pero no se ve; en su lugar, un enlace a la lista.
 * Solo transform y opacity; con "menos movimiento" no hay mecido ni notas.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()

const state = computed(() => music?.state.value)
const available = computed(() => !!state.value?.available)
const playing = computed(() => !!state.value?.playing)
const title = computed(() => props.section.title ?? 'Nuestra canción')
const progress = computed(() =>
  state.value?.duration ? Math.min(1, state.value.current / state.value.duration) : 0,
)
const NOTES = ['♪', '♫', '♪', '♬', '♫', '♪']

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
watch(inView, (v) => music && (music.playerInView.value = v), { immediate: true })

const hostsSpotify = computed(() => music?.spotifyHost() === 'music-player')
const spotifyLink = computed(() => {
  const hasPlaylist = event.value.sections.some((s) => s.type === 'spotify' && s.visible !== false)
  return !hasPlaylist && spotifyEmbedFor(event.value.music.spotify_url)
    ? event.value.music.spotify_url
    : null
})
const spotifyHost = ref<HTMLElement | null>(null)
onMounted(() => {
  if (hostsSpotify.value && spotifyHost.value) music?.attachSpotify(spotifyHost.value, 152)
})
</script>

<template>
  <div ref="root" class="mm" :class="{ 'is-playing': playing, 'is-off': !available }">
    <div class="mm__stage">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="mm__art" aria-hidden="true" v-html="mariachisSvg" />
      <span
        v-for="(note, i) in NOTES"
        :key="i"
        class="mm__note"
        :style="{ '--n': i }"
        aria-hidden="true"
        >{{ note }}</span
      >
    </div>

    <h2 class="mm__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>

    <div class="mm__controls">
      <button
        type="button"
        class="mm__play inv-btn"
        :disabled="!available"
        :aria-label="playing ? 'Pausar la música' : 'Reproducir la música'"
        :aria-pressed="playing"
        @click="music?.toggle()"
      >
        <AppIcon :name="playing ? 'pause' : 'play'" />
      </button>
    </div>

    <p class="mm__state" aria-live="polite">{{ playing ? 'Sonando' : 'Toca para escuchar' }}</p>

    <div class="mm__progress">
      <span class="mm__time">{{ formatTime(state?.current ?? 0) }}</span>
      <span class="mm__track" aria-hidden="true">
        <span class="mm__fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
      <span class="mm__time">{{ formatTime(state?.duration ?? 0) }}</span>
    </div>

    <p v-if="state?.error" class="mm__error" role="status">{{ state.error }}</p>

    <a v-if="spotifyLink" :href="spotifyLink" class="mm__link" target="_blank" rel="noopener">
      Escuchar la lista completa
    </a>
    <div v-if="hostsSpotify" ref="spotifyHost" class="mm__spotify-host" aria-hidden="true" />
  </div>
</template>

<style scoped>
.mm {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
.mm__stage {
  position: relative;
  width: 100%;
}
.mm__art {
  width: 100%;
}
.mm__art :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
/* Quietos por defecto; solo se mueven mientras suena. */
.mm__art :deep([id^='musico-']) {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.mm__art :deep(.instrumento) {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.is-playing .mm__art :deep(#musico-1) {
  animation: mm-sway calc(2.4s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-playing .mm__art :deep(#musico-2) {
  animation: mm-sway calc(2.4s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(-0.8s * var(--motion-scale));
}
.is-playing .mm__art :deep(#musico-3) {
  animation: mm-sway calc(2.4s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(-1.6s * var(--motion-scale));
}
.is-playing .mm__art :deep(.instrumento) {
  animation: mm-shake calc(0.22s * var(--motion-scale)) ease-in-out infinite alternate;
}

/* Las notas suben desde el trío mientras suena. */
.mm__note {
  position: absolute;
  bottom: 38%;
  left: calc(14% + var(--n) * 13%);
  font-size: 1.5rem;
  line-height: 1;
  color: var(--t-title-color, var(--color-rosa, var(--color-accent)));
  opacity: 0;
  pointer-events: none;
}
.is-playing .mm__note {
  animation: mm-note calc(3s * var(--motion-scale)) ease-out infinite;
  animation-delay: calc(var(--n) * 0.5s * var(--motion-scale));
}

.mm__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.9rem, 9cqi, 2.8rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-text));
}
.mm__play {
  display: grid;
  place-items: center;
  width: 3.6rem;
  aspect-ratio: 1;
  padding: 0;
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
}
.mm__play:disabled {
  cursor: default;
  opacity: 0.7;
}
.mm__play:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
.mm__state {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
.mm__progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}
.mm__track {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-text) 22%, transparent);
  overflow: hidden;
}
.mm__fill {
  position: absolute;
  inset: 0;
  background: var(--color-rosa, var(--color-accent));
  transform-origin: 0 50%;
}
.mm__time {
  font-family: var(--font-caps);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.mm__error {
  margin: 0;
  font-size: var(--text-small);
}
.mm__link {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.mm__link:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
/* El reproductor de Spotify suena, pero no se ve (sigue en la página con su tamaño). */
.mm__spotify-host {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 300px;
  height: 152px;
  opacity: 0;
  pointer-events: none;
  clip-path: inset(50%);
}

@keyframes mm-sway {
  from {
    transform: rotate(-2deg);
  }
  to {
    transform: rotate(2deg);
  }
}
@keyframes mm-shake {
  from {
    transform: rotate(-1.2deg);
  }
  to {
    transform: rotate(1.2deg);
  }
}
@keyframes mm-note {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.8);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(0.8rem, -6rem) scale(1.1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-playing .mm__art :deep(#musico-1),
  .is-playing .mm__art :deep(#musico-2),
  .is-playing .mm__art :deep(#musico-3),
  .is-playing .mm__art :deep(.instrumento),
  .is-playing .mm__note {
    animation: none;
  }
}
</style>
