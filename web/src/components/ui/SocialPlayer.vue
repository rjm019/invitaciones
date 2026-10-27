<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { motionScale } from '@/composables/useMotionScale'
import { useMusic } from '@/composables/useMusic'
import {
  INSTAGRAM_EMBED_SCRIPT,
  networkLabel,
  parseSocialUrl,
  playerSrc,
  type SocialLink,
} from '@/services/socialEmbedService'

/**
 * Fachada de un video o publicación de redes. Al abrir la invitación solo hay una portada
 * (la `poster` propia o un fondo con el ícono de la red) y un botón de play: NO se pide nada
 * a youtube.com, instagram.com, facebook.com ni a sus CDNs (ni siquiera la miniatura). El
 * reproductor o el script oficial se carga hasta que la persona toca, y ese mismo toque pausa
 * la música de la invitación. Si la red lo bloquea o tarda, queda el botón "Ver en <red>".
 * `file` es un MP4 propio (de la biblioteca del evento): se reproduce con <video>.
 */
const props = defineProps<{
  /** De dónde sale lo que se reproduce. */
  source: 'file' | 'youtube' | 'instagram' | 'facebook'
  /** Enlace ya validado por el servidor (se vuelve a validar aquí). */
  link?: SocialLink | null
  /** URL del MP4 propio (solo con source = file). */
  file?: string
  poster?: string
  /** `aspect-ratio` de la fachada. */
  aspect: string
  title: string
  /** Texto del botón de respaldo ("Ver en Instagram" si no se pone). */
  openLabel?: string
}>()

type Phase = 'idle' | 'loading' | 'ready' | 'failed'
const LOAD_TIMEOUT_MS = 10000

const music = useMusic()
const phase = ref<Phase>('idle')
const iframeSrc = ref<string | null>(null)
const videoUrl = ref<string | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const host = ref<HTMLElement | null>(null)

// Doble revisión: aunque el servidor ya lo validó, aquí solo se usa una URL armada por el servicio.
const safe = computed(() =>
  props.link ? parseSocialUrl(props.link.url, props.link.network) : null,
)
const network = computed(() => (props.source === 'file' ? null : props.source))
const icon = computed(() => network.value ?? 'play')
const open = computed(
  () => props.openLabel || (network.value ? `Ver en ${networkLabel(network.value)}` : ''),
)
const natural = computed(() => props.source === 'instagram' && phase.value !== 'idle')

let timer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null

function stopWatching(): void {
  if (timer) clearTimeout(timer)
  timer = null
  observer?.disconnect()
  observer = null
}
function fail(): void {
  stopWatching()
  iframeSrc.value = null
  videoUrl.value = null
  phase.value = 'failed'
}
function armTimeout(): void {
  timer = setTimeout(fail, LOAD_TIMEOUT_MS * motionScale())
}
function ready(): void {
  stopWatching()
  phase.value = 'ready'
}

async function start(): Promise<void> {
  if (phase.value === 'loading' || phase.value === 'ready') return
  // El toque es el permiso: la música de la invitación se pausa antes de que suene el video.
  music?.pause()
  if (props.source === 'file') {
    if (!props.file) return fail()
    videoUrl.value = props.file
    phase.value = 'ready'
    await nextTick()
    video.value?.play().catch(() => {})
    return
  }
  const link = safe.value
  if (!link) return fail()
  phase.value = 'loading'
  if (link.network === 'instagram') {
    await mountInstagram(link)
    return
  }
  const src = playerSrc(link)
  if (!src) return fail()
  iframeSrc.value = src
  armTimeout()
}

/** El `blockquote` y el `embed.js` oficiales de Instagram, solo después del toque. */
async function mountInstagram(link: SocialLink): Promise<void> {
  await nextTick()
  const container = host.value
  if (!container) return fail()
  const block = document.createElement('blockquote')
  block.className = 'instagram-media'
  block.setAttribute('data-instgrm-permalink', link.url)
  block.setAttribute('data-instgrm-version', '14')
  container.replaceChildren(block)
  observer = new MutationObserver(() => {
    if (container.querySelector('iframe')) ready()
  })
  observer.observe(container, { childList: true, subtree: true })
  armTimeout()
  const instgrm = (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm
  if (instgrm) {
    instgrm.Embeds.process()
    return
  }
  const script = document.createElement('script')
  script.async = true
  script.src = INSTAGRAM_EMBED_SCRIPT
  script.onerror = fail
  document.body.appendChild(script)
}

onBeforeUnmount(stopWatching)
</script>

<template>
  <div class="player" :class="{ 'is-natural': natural }" :style="{ '--player-aspect': aspect }">
    <div class="player__frame">
      <iframe
        v-if="iframeSrc"
        class="player__media"
        :src="iframeSrc"
        :title="title"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        @load="ready"
      />
      <video
        v-else-if="videoUrl"
        ref="video"
        class="player__media"
        :src="videoUrl"
        :poster="poster"
        :aria-label="title"
        controls
        playsinline
        preload="auto"
        @play="music?.pause()"
        @error="fail"
      />
      <div
        v-else-if="source === 'instagram' && phase !== 'idle' && phase !== 'failed'"
        ref="host"
        class="player__media player__host"
      />

      <!-- Fachada: sin pedir nada a terceros. -->
      <div
        v-if="phase !== 'ready'"
        class="player__cover"
        :class="{ 'is-failed': phase === 'failed' }"
      >
        <img
          v-if="poster"
          :src="poster"
          alt=""
          class="player__poster"
          loading="lazy"
          decoding="async"
        />
        <AppIcon v-else :name="icon" class="player__brand" />
        <template v-if="phase === 'failed'">
          <p class="player__note" role="status">No se pudo cargar aquí.</p>
          <a
            v-if="safe && network"
            class="player__open inv-btn"
            data-text="button"
            :href="safe.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon :name="icon" /> {{ open }}
          </a>
        </template>
        <button
          v-else
          type="button"
          class="player__play"
          :class="{ 'is-loading': phase === 'loading' }"
          :aria-label="`Reproducir: ${title}`"
          :disabled="phase === 'loading'"
          @click="start"
        >
          <AppIcon name="play" />
        </button>
        <p v-if="phase === 'loading'" class="player__note" role="status">Cargando…</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player {
  width: min(100%, 36rem);
  margin: 0 auto;
}
/* Vertical: más angosto para que no ocupe toda la pantalla del celular. */
.player[style*='9 / 16'] {
  width: min(100%, 20rem);
}
.player[style*='4 / 5'] {
  width: min(100%, 26rem);
}
.player__frame {
  position: relative;
  aspect-ratio: var(--player-aspect, 16 / 9);
  overflow: hidden;
  border-radius: var(--radius-card, 12px);
  background: color-mix(in srgb, var(--color-primary) 18%, #000);
  box-shadow: var(--shadow-card);
}
.is-natural .player__frame {
  aspect-ratio: auto;
  min-height: 12rem;
}
.is-natural .player__media {
  position: static;
}
.player__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
}
.player__host {
  background: transparent;
  overflow: auto;
}
.player__host :deep(iframe),
.player__host :deep(.instagram-media) {
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 0 auto !important;
}
.player__cover {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  background:
    radial-gradient(
      circle at 50% 40%,
      color-mix(in srgb, var(--color-accent) 30%, transparent),
      transparent 70%
    ),
    color-mix(in srgb, var(--color-primary) 22%, #000);
  color: var(--color-surface, #fff);
  text-align: center;
}
.player__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.player__brand {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 28%;
  height: 28%;
  opacity: 0.22;
}
.player__brand :deep(svg),
.player__brand.app-icon--svg :deep(svg) {
  width: 100%;
  height: 100%;
}
.player__play {
  position: relative;
  display: grid;
  place-items: center;
  width: 4.2rem;
  height: 4.2rem;
  padding: 0;
  border: var(--btn-border, 0);
  border-radius: 999px;
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-surface)));
  box-shadow: var(--btn-shadow, var(--shadow-button, 0 4px 16px rgb(0 0 0 / 0.35)));
  cursor: pointer;
  transition: transform calc(0.2s * var(--motion-scale, 1)) ease;
}
.player__play:hover:not(:disabled) {
  transform: scale(1.06);
}
.player__play:focus-visible,
.player__open:focus-visible {
  outline: 3px solid var(--color-surface, #fff);
  outline-offset: 3px;
}
.player__play.is-loading {
  opacity: 0.6;
  cursor: progress;
}
.player__play :deep(.app-icon) {
  width: 1.6rem;
  height: 1.6rem;
  margin-left: 0.2rem;
}
.player__note {
  position: relative;
  margin: 0;
  padding: 0.15rem 0.6rem;
  border-radius: 6px;
  background: rgb(0 0 0 / 0.45);
  font-size: var(--text-small);
}
.player__open {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.8rem;
  padding: 0 1.2rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 6px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-surface)));
  font-family: var(--t-button-font, var(--font-display));
  font-weight: 700;
  font-size: calc(1.05rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.04em);
  box-shadow: var(--btn-shadow, var(--shadow-button, none));
  text-decoration: var(--btn-decoration, none);
  text-transform: var(--btn-case, none);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.player__open :deep(.app-icon) {
  width: 1.1em;
  height: 1.1em;
}
@media (prefers-reduced-motion: reduce) {
  .player__play {
    transition: none;
  }
  .player__play:hover:not(:disabled) {
    transform: none;
  }
}
</style>
