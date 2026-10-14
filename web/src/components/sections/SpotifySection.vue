<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEmbedFocus } from '@/composables/useEmbedFocus'
import { useEvent } from '@/composables/useEvent'
import { useMusic } from '@/composables/useMusic'
import { spotifyEmbed, spotifyHeight } from '@/services/spotifyService'
import type { ResolvedSection } from '@/types/event'

/**
 * Playlist de Spotify (clave `spotify` de la pestaña evento) con la lista de canciones,
 * como el reproductor que comparte Spotify. Variante `compacta`: solo portada y botón.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const music = useMusic()

const embed = computed(() => spotifyEmbed(event.value.music.spotify_url))
const height = computed(() => spotifyHeight(props.section.variant))
const title = computed(() => props.section.title ?? 'Mi playlist')
const button = computed(() => props.section.button ?? 'Abrir en Spotify')

// Si la música del evento sale de Spotify, aquí vive ese reproductor (lo crea la API de
// Spotify y lo manejan el sobre y los controles dorados). Si no, es un reproductor más:
// al tocarlo se pausa la canción de la invitación para que no suenen dos a la vez.
const hostsMusic = computed(() => music?.spotifyHost() === 'spotify')
const host = ref<HTMLElement | null>(null)
onMounted(() => {
  if (hostsMusic.value && host.value) music?.attachSpotify(host.value, height.value)
})

const frame = ref<HTMLIFrameElement | null>(null)
useEmbedFocus(frame, () => music?.pause())
</script>

<template>
  <div v-if="embed" class="playlist">
    <h2 class="playlist__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="playlist__subtitle" data-text="subtitle">
      {{ section.subtitle }}
    </p>
    <p v-if="section.text" class="playlist__text" data-text="text">{{ section.text }}</p>

    <div
      v-if="hostsMusic"
      ref="host"
      class="playlist__player playlist__player--host"
      :style="{ height: `${height}px` }"
    />
    <iframe
      v-else
      ref="frame"
      class="playlist__player"
      :src="embed.embedUrl"
      :height="height"
      :style="{ height: `${height}px` }"
      :title="`${title} en Spotify`"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen
    />

    <p v-if="hostsMusic && music?.state.value.error" class="playlist__hint" role="status">
      {{ music.state.value.error }}
    </p>

    <a
      :href="embed.openUrl"
      class="playlist__open"
      data-text="button"
      target="_blank"
      rel="noopener"
    >
      <AppIcon name="spotify" />
      {{ button }}
    </a>
  </div>
</template>

<style scoped>
.playlist {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}
.playlist__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.playlist__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(clamp(0.95rem, 4.4cqi, 1.15rem) * var(--t-subtitle-size, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t-subtitle-color);
}
.playlist__text {
  max-width: 22rem;
  margin: 0;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  font-family: var(--t-text-font);
  color: var(--t-text-color);
}
.playlist__player {
  display: block;
  width: 100%;
  margin-top: var(--space-1);
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #282828;
  box-shadow: var(--shadow-card);
}
.playlist__player--host :deep(iframe) {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 12px;
}
.playlist__hint {
  margin: 0;
  font-size: var(--text-body);
  font-style: italic;
  color: var(--color-primary);
}
.playlist__open {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem;
  font-family: var(--t-button-font, var(--font-serif));
  font-size: calc(1.05rem * var(--t-button-size, 1));
  color: var(--t-button-color, var(--color-primary));
  text-underline-offset: 0.2em;
}
.playlist__open :deep(.app-icon) {
  width: 1.15em;
  height: 1.15em;
}
.playlist__open:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
