<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import ButterflyFlight from '@/components/ui/ButterflyFlight.vue'
import CelebrationBurst from '@/components/ui/CelebrationBurst.vue'
import FloatingDecor from '@/components/ui/FloatingDecor.vue'
import MiniPlayer from '@/components/ui/MiniPlayer.vue'
import SectionShell from '@/components/ui/SectionShell.vue'
import { sectionRegistry } from '@/components/sectionRegistry'
import { provideCelebration } from '@/composables/useCelebration'
import { provideEvent } from '@/composables/useEvent'
import { provideMusic } from '@/composables/useMusic'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useSteadyScroll } from '@/composables/useSteadyScroll'
import { createAssetResolver } from '@/services/assetService'
import { backgroundVars } from '@/services/backgroundService'
import { placeOnDesktop, resolveSections, withContent, withPanels } from '@/services/sectionService'
import { spotifyEmbed } from '@/services/spotifyService'
import {
  applyTheme,
  fontVars,
  googleFontsUrl,
  paletteVars,
  resolveFonts,
} from '@/services/themeService'
import { loadTheme, themeAssets } from '@/themes'
import type { ThemeManifest } from '@/themes/types'
import type { EventConfig } from '@/types/event'

/** Arma la invitación: tema + paleta + fuentes del layout, y cada sección en su orden. */
const props = defineProps<{ event: EventConfig }>()

const theme = shallowRef<ThemeManifest | null>(null)
const themeMissing = shallowRef(false)
let revert: (() => void) | null = null

const resolveAsset = computed(() =>
  createAssetResolver(props.event.assets, themeAssets(props.event.theme)),
)
provideEvent({ event: computed(() => props.event), resolveAsset })
// Una sola canción para toda la invitación (la inicia el sobre; la controlan los reproductores).
// Con la música en Spotify suena la playlist, en la sección de playlist o, si no hay, en la
// del reproductor.
const music = provideMusic(() => resolveAsset.value(props.event.music.audio_url), undefined, {
  uri: () =>
    props.event.music.source === 'spotify'
      ? (spotifyEmbed(props.event.music.spotify_url)?.uri ?? null)
      : null,
  host: () =>
    props.event.sections.some((s) => s.type === 'spotify' && s.visible !== false)
      ? 'spotify'
      : 'music-player',
})
// Al cambiar de canción, Spotify mueve su lista y arrastraría la página hasta el
// reproductor: la vista se queda donde el invitado la tiene.
useSteadyScroll((hold) => music.onTrackChange(hold))

// Pétalos y confeti al abrir el sobre y al confirmar (nada con "menos movimiento").
const reduced = useReducedMotion()
provideCelebration(() => reduced.value)

const isDev = import.meta.env.DEV

// Solo se acomodan las secciones que se pintan (en producción se saltan las que aún no
// existen) y que tienen algo que mostrar (playlist con enlace, clima antes del evento).
// Los fondos de los paneles se turnan sobre esa lista final: nunca dos iguales seguidos.
const sections = computed(() =>
  theme.value
    ? placeOnDesktop(
        withPanels(
          withContent(
            resolveSections(props.event, theme.value, resolveAsset.value),
            props.event,
            Date.now(),
          ).filter((s) => sectionRegistry[s.type] || isDev),
          theme.value.panels,
        ),
      )
    : [],
)
const pageStyle = computed(() => backgroundVars(theme.value?.page, resolveAsset.value, '--page'))

watch(
  () => props.event.theme,
  async (id) => {
    const manifest = await loadTheme(id)
    themeMissing.value = manifest === null
    theme.value = manifest
  },
  { immediate: true },
)

// Paleta y fuentes del layout sobre los tokens del tema.
watch(
  [theme, () => props.event.palette, () => props.event.fonts],
  () => {
    revert?.()
    if (!theme.value) return
    const fonts = resolveFonts(theme.value.fonts, props.event.fonts)
    revert = applyTheme(
      document.documentElement,
      theme.value.id,
      { ...paletteVars(props.event.palette), ...fontVars(fonts) },
      googleFontsUrl(Object.values(fonts)),
    )
  },
  { immediate: true },
)
onBeforeUnmount(() => revert?.())
</script>

<template>
  <p v-if="themeMissing" class="invitation-error">El tema «{{ event.theme }}» no existe.</p>
  <div v-else class="invitation" :style="pageStyle">
    <div class="invitation__paper" aria-hidden="true" />
    <FloatingDecor v-if="theme?.floating?.length" :items="theme.floating" />
    <ButterflyFlight v-if="theme?.flights?.length" :items="theme.flights" />
    <main class="invitation__grid">
      <SectionShell
        v-for="section in sections"
        :key="section.id"
        :section="section"
        :class="`invitation__slot--${section.slot}`"
      >
        <component
          :is="sectionRegistry[section.type]"
          v-if="sectionRegistry[section.type]"
          :section="section"
        />
        <p v-else class="invitation__pending">Sección «{{ section.type }}» en construcción</p>
      </SectionShell>
    </main>
    <MiniPlayer />
    <CelebrationBurst />
  </div>
</template>

<style scoped>
/*
 * Celular primero: una sola columna de paneles. En pantallas grandes (≥ 64rem, laptop o
 * tablet acostada) la página se vuelve horizontal: las secciones "half" van en pares.
 * Entre panel y panel, y a las orillas, siempre el mismo espacio (--section-gap).
 */
.invitation {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  color: var(--color-text);
  font-family: var(--font-serif);
  background-color: var(--page-bg-color, var(--color-bg));
}
/* El papel se queda quieto detrás de todo: sin costuras de mosaico a ningún ancho. */
.invitation__paper {
  position: fixed;
  inset: 0 0 auto;
  height: 100vh;
  height: 100lvh;
  z-index: -1;
  background-image: var(--page-bg-image, none);
  background-size: cover;
  background-position: center top;
  pointer-events: none;
}
.invitation__grid {
  display: grid;
  gap: var(--section-gap);
  padding: var(--section-gap);
  overflow-x: clip;
}
@media (min-width: 64rem) {
  .invitation__grid {
    --section-gap: var(--space-3);
    --section-padding-block: var(--space-5);
    --section-padding-inline: var(--space-3);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: calc(var(--page-max-width) + 2 * var(--section-gap));
    margin-inline: auto;
  }
  .invitation__slot--full {
    grid-column: 1 / -1;
    --section-content-width: var(--page-max-width);
  }
}
.invitation__pending {
  margin: 0;
  padding: var(--space-3);
  border: 1px dashed var(--color-primary);
  text-align: center;
  font-family: system-ui, sans-serif;
  font-size: 0.85rem;
  opacity: 0.6;
}
.invitation-error {
  padding: var(--space-4);
  text-align: center;
}
</style>
