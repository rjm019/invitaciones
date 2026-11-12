<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CribMobile from '@/components/ui/CribMobile.vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { useMusic } from '@/composables/useMusic'
import { formatTime } from '@/services/audioService'
import { spotifyEmbed as spotifyEmbedFor } from '@/services/spotifyService'
import type { ResolvedSection } from '@/types/event'

/**
 * Música de cuna (`movil`): el móvil de cuna (`CribMobile`) es el reproductor. Al sonar gira
 * despacio y cada pieza (estrellas, nube, globo) se balancea desde su hilo; en pausa todo
 * queda quieto. El botón de play/pausa es una luna grande bajo el móvil. Debajo,
 * el título y el texto de la canción (si lo hay), un renglón de estado y una barra de avance.
 * Es la misma canción que inicia la portada. Con la música en Spotify, el reproductor de Spotify
 * está presente (es el que suena) pero no se ve; en su lugar, un enlace a la lista.
 * Solo transform y opacity; con "menos movimiento" no hay giro ni balanceo.
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
  <div ref="root" class="mb" :class="{ 'is-playing': playing, 'is-off': !available }">
    <div class="mb__stage">
      <CribMobile :playing="playing">
        <button
          type="button"
          class="mb__moon"
          :disabled="!available"
          :aria-label="playing ? 'Pausar' : 'Reproducir'"
          :aria-pressed="playing"
          @click="music?.toggle()"
        >
          <span class="mb__halo" aria-hidden="true" />
          <span class="mb__disc" aria-hidden="true" />
          <AppIcon class="mb__sign" :name="playing ? 'pause' : 'play'" />
        </button>
      </CribMobile>
    </div>

    <h2 class="mb__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
    <p v-if="section.text" class="mb__song" data-text="text">{{ section.text }}</p>

    <p v-if="available" class="mb__state" aria-live="polite">{{ playing ? 'Sonando' : 'Toca la luna para escuchar' }}</p>

    <div class="mb__progress">
      <span class="mb__time">{{ formatTime(state?.current ?? 0) }}</span>
      <span class="mb__track" aria-hidden="true">
        <span class="mb__fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
      <span class="mb__time">{{ formatTime(state?.duration ?? 0) }}</span>
    </div>

    <p v-if="state?.error" class="mb__error" role="status">{{ state.error }}</p>

    <a v-if="spotifyLink" :href="spotifyLink" class="mb__link" target="_blank" rel="noopener">
      {{ spotifyLink.includes('/track/') ? 'Escuchar en Spotify' : 'Escuchar la lista completa' }}
    </a>
    <div v-if="hostsSpotify" ref="spotifyHost" class="mb__spotify-host" aria-hidden="true" />
  </div>
</template>

<style scoped>
.mb {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  max-width: 24rem;
  margin: 0 auto;
  text-align: center;
}
.mb__stage {
  --cm-slot-top: 90%;
  position: relative;
  width: min(100%, 20rem);
}
.mb__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 3rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-text)));
}
.mb__song {
  margin: -0.2rem 0 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.1rem * var(--t-text-size, 1));
  color: var(--t-text-color, var(--color-text));
}

/* La luna: un disco de luz con cráteres suaves; el signo de play o pausa va adentro. */
.mb__moon {
  position: relative;
  display: grid;
  place-items: center;
  width: 4.8rem;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-primary-strong, var(--color-text));
  cursor: pointer;
}
.mb__moon:disabled {
  cursor: default;
  opacity: 0.7;
}
.mb__moon:focus-visible {
  outline: 2px solid var(--color-primary-strong, currentColor);
  outline-offset: 5px;
}
.mb__disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle 0.55rem at 28% 62%, color-mix(in srgb, var(--color-oro, #b8925a) 22%, transparent) 90%, transparent 100%),
    radial-gradient(circle 0.4rem at 70% 70%, color-mix(in srgb, var(--color-oro, #b8925a) 18%, transparent) 90%, transparent 100%),
    radial-gradient(circle 0.3rem at 62% 26%, color-mix(in srgb, var(--color-oro, #b8925a) 16%, transparent) 90%, transparent 100%),
    radial-gradient(circle at 36% 30%, var(--color-paper, #fdf8f0), var(--color-mantequilla, #f5e3ad) 78%);
  box-shadow:
    inset 0 0 0 0.16rem color-mix(in srgb, var(--color-oro, #b8925a) 70%, #fff),
    inset -0.5rem -0.6rem 1rem color-mix(in srgb, var(--color-oro, #b8925a) 26%, transparent),
    0 0.5rem 1.2rem -0.4rem color-mix(in srgb, var(--color-primary-strong, #b9647a) 45%, transparent);
}
.mb__sign {
  position: relative;
  width: 1.7rem;
  height: 1.7rem;
  /* el triángulo de play se ve más centrado un poco a la derecha */
  translate: 0.05rem 0;
}
.mb__halo {
  position: absolute;
  inset: -0.6rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--color-oro, #b8925a) 55%, transparent);
  opacity: 0;
}
.is-playing .mb__halo {
  animation: mb-halo calc(2.8s * var(--motion-scale)) ease-out infinite;
}
.mb__state {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
.mb__progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}
.mb__track {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-text) 22%, transparent);
  overflow: hidden;
}
.mb__fill {
  position: absolute;
  inset: 0;
  background: var(--color-primary, var(--color-accent));
  transform-origin: 0 50%;
}
.mb__time {
  font-family: var(--font-caps);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.mb__error {
  margin: 0;
  font-size: var(--text-small);
}
.mb__link {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.98rem;
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.mb__link:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
/* El reproductor de Spotify suena, pero no se ve (sigue en la página con su tamaño). */
.mb__spotify-host {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 300px;
  height: 152px;
  opacity: 0;
  pointer-events: none;
  clip-path: inset(50%);
}

@keyframes mb-halo {
  0% {
    opacity: 0.8;
    transform: scale(0.92);
  }
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

/* Escritorio: el móvil, el título y la barra crecen con la fila completa. */
@container section (min-width: 56rem) {
  .mb {
    max-width: 30rem;
    gap: 0.9rem;
  }
  .mb__stage {
    width: min(100%, 26rem);
  }
  .mb__moon {
    width: 5.8rem;
  }
  .mb__title {
    font-size: calc(clamp(2.8rem, 5cqi, 3.8rem) * var(--t-title-size, 1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-playing .mb__halo {
    animation: none;
  }
}
</style>
