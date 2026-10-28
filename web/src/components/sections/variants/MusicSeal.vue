<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { useMusic } from '@/composables/useMusic'
import { formatTime } from '@/services/audioService'
import { spotifyEmbed as spotifyEmbedFor } from '@/services/spotifyService'
import type { ResolvedSection } from '@/types/event'

/**
 * Música de papelería ("lacre"): un reproductor discreto. El botón es un lacre con el
 * monograma (borgoña); mientras suena gira muy despacio y una marca fina dice "Sonando".
 * Debajo, una línea de avance de un pelo con los tiempos, y atrás/adelante de 10 s en texto.
 * Es la misma canción que inicia el sobre (el mini-reproductor la sigue entre secciones).
 * Con la música en Spotify, el reproductor de Spotify está presente (es el que suena) pero
 * no se ve: su caja negra rompería la papelería; en su lugar, un enlace fino a la lista.
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

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
watch(inView, (v) => music && (music.playerInView.value = v), { immediate: true })

const hostsSpotify = computed(() => music?.spotifyHost() === 'music-player')
// La lista en Spotify (si la hay y no tiene su propia sección): un enlace, no la caja.
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
  <div ref="root" class="ms" :class="{ 'is-playing': playing, 'is-off': !available }">
    <h2 class="ms__title" data-text="title">{{ title }}</h2>

    <div class="ms__row">
      <span class="ms__rule" aria-hidden="true" />
      <button
        type="button"
        class="ms__seal"
        :disabled="!available"
        :aria-label="playing ? 'Pausar la música' : 'Reproducir la música'"
        :aria-pressed="playing"
        @click="music?.toggle()"
      >
        <span class="ms__spin"><WaxSeal tone="burgundy" size="100%" seed="musica" /></span>
        <span class="ms__glyph" aria-hidden="true"><AppIcon :name="playing ? 'pause' : 'play'" /></span>
      </button>
      <span class="ms__rule" aria-hidden="true" />
    </div>

    <p class="ms__state" aria-live="polite">{{ playing ? 'Sonando' : 'Toca el sello para escuchar' }}</p>

    <div class="ms__progress">
      <button
        type="button"
        class="ms__skip"
        :disabled="!available"
        aria-label="Regresar 10 segundos"
        @click="music?.skip(-10)"
      >
        − 10
      </button>
      <span class="ms__time">{{ formatTime(state?.current ?? 0) }}</span>
      <span class="ms__track" aria-hidden="true">
        <span class="ms__fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
      <span class="ms__time">{{ formatTime(state?.duration ?? 0) }}</span>
      <button
        type="button"
        class="ms__skip"
        :disabled="!available"
        aria-label="Adelantar 10 segundos"
        @click="music?.skip(10)"
      >
        + 10
      </button>
    </div>

    <p v-if="state?.error" class="ms__error" role="status">{{ state.error }}</p>

    <a v-if="spotifyLink" :href="spotifyLink" class="ms__link" target="_blank" rel="noopener">
      Escuchar la lista completa
    </a>
    <div v-if="hostsSpotify" ref="spotifyHost" class="ms__spotify-host" aria-hidden="true" />
  </div>
</template>

<style scoped>
.ms {
  display: grid;
  justify-items: center;
  gap: 0.9rem;
  max-width: 24rem;
  margin: 0 auto;
  text-align: center;
}
.ms__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.8rem * var(--t-title-size, 1));
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.ms__row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
.ms__rule {
  height: 1px;
  background: color-mix(in srgb, var(--color-text) 30%, transparent);
}
.ms__seal {
  position: relative;
  width: 5.2rem;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  filter: drop-shadow(0 4px 6px rgb(40 20 20 / 0.3));
}
.ms__seal:disabled {
  cursor: default;
  opacity: 0.7;
}
.ms__seal:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 6px;
  border-radius: 50%;
}
.ms__spin {
  display: block;
}
.is-playing .ms__spin {
  animation: ms-spin calc(24s * var(--motion-scale)) linear infinite;
}
/* El signo de reproducir o pausar, chico, sobre el anillo de abajo del lacre. */
.ms__glyph {
  position: absolute;
  left: 50%;
  bottom: 4%;
  display: grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--color-paper, var(--color-surface));
  color: var(--color-borgona, var(--color-accent));
  transform: translateX(-50%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
}
.ms__glyph :deep(.app-icon) {
  width: 0.55rem;
  height: 0.55rem;
}
.ms__state {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.ms__progress {
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}
.ms__track {
  position: relative;
  height: 1px;
  background: color-mix(in srgb, var(--color-text) 25%, transparent);
  overflow: hidden;
}
.ms__fill {
  position: absolute;
  inset: 0;
  background: var(--color-borgona, var(--color-accent));
  transform-origin: 0 50%;
}
.ms__time,
.ms__skip {
  font-family: var(--font-caps);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
.ms__skip {
  padding: 0.3rem 0.2rem;
  border: 0;
  background: none;
  cursor: pointer;
}
.ms__skip:focus-visible {
  outline: 1px solid currentColor;
}
.ms__error {
  margin: 0;
  font-size: var(--text-small);
}
.ms {
  position: relative;
}
.ms__link {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--color-text) 40%, transparent);
}
.ms__link:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
/* El reproductor de Spotify suena, pero no se ve (sigue en la página con su tamaño). */
.ms__spotify-host {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 300px;
  height: 152px;
  opacity: 0;
  pointer-events: none;
  clip-path: inset(50%);
}
@keyframes ms-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-playing .ms__spin {
    animation: none;
  }
}
</style>
