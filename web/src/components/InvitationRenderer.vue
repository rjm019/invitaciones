<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import ButterflyFlight from '@/components/ui/ButterflyFlight.vue'
import CelebrationBurst from '@/components/ui/CelebrationBurst.vue'
import DemoRibbon from '@/components/ui/DemoRibbon.vue'
import FloatingDecor from '@/components/ui/FloatingDecor.vue'
import MiniPlayer from '@/components/ui/MiniPlayer.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import SectionShell from '@/components/ui/SectionShell.vue'
import { sectionRegistry } from '@/components/sectionRegistry'
import { useAssetsReady } from '@/composables/useAssetsReady'
import { provideCelebration } from '@/composables/useCelebration'
import { provideEvent } from '@/composables/useEvent'
import { provideMusic } from '@/composables/useMusic'
import { providePreview, type PreviewOptions } from '@/composables/usePreview'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useSteadyScroll } from '@/composables/useSteadyScroll'
import { createAssetResolver } from '@/services/assetService'
import { backgroundVars } from '@/services/backgroundService'
import { criticalImages, fontFamilies } from '@/services/preloadService'
import { placeOnDesktop, resolveSections, withContent, withPanels } from '@/services/sectionService'
import { spotifyEmbed } from '@/services/spotifyService'
import {
  applyTheme,
  extraFonts,
  fontVars,
  googleFontsUrl,
  paletteVars,
  resolveFonts,
} from '@/services/themeService'
import { loadTheme, themeAssets } from '@/themes'
import type { ThemeManifest } from '@/themes/types'
import type { EventConfig, SectionBackground } from '@/types/event'

/**
 * Arma la invitación: tema + paleta + fuentes del layout, y cada sección en su orden.
 * No se muestra a medias: mientras cargan las fuentes y las imágenes de la portada se ve
 * la pantalla de espera, y luego aparece completa. El resto de las secciones (y Spotify)
 * se monta justo después, mientras el invitado ve el sobre.
 */
const props = defineProps<{
  event: EventConfig
  /** Solo en el editor del gestor: sobre abierto o cerrado, y sin sonido. */
  preview?: PreviewOptions
}>()
providePreview(() => props.preview)

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
// En la vista previa del gestor la canción no suena sola (el audio se crea en silencio).
const mutedAudio = () => Object.assign(new Audio(), { muted: true })
const music = provideMusic(
  () => resolveAsset.value(props.event.music.audio_url),
  props.preview?.muted ? mutedAudio : undefined,
  {
    uri: () =>
      props.event.music.source === 'spotify'
        ? (spotifyEmbed(props.event.music.spotify_url)?.uri ?? null)
        : null,
    host: () =>
      props.event.sections.some((s) => s.type === 'spotify' && s.visible !== false)
        ? 'spotify'
        : 'music-player',
  },
)
// Al cambiar de canción, Spotify mueve su lista y arrastraría la página hasta el
// reproductor: la vista se queda donde el invitado la tiene.
useSteadyScroll((hold) => music.onTrackChange(hold))

// Estrellitas al abrir el sobre; pétalos y confeti al confirmar (nada con "menos movimiento").
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
// El papel de la página: el del tema, o el que trae la invitación.
const page = computed<SectionBackground | undefined>(() =>
  props.event.page?.image
    ? { ...theme.value?.page, image: props.event.page.image }
    : theme.value?.page,
)
const pageStyle = computed(() => backgroundVars(page.value, resolveAsset.value, '--page'))
// Las mariposas que flotan y cruzan: del tema, salvo que la invitación las apague.
const decorOn = computed(() => props.event.page?.decor !== false)
const fonts = computed(() =>
  theme.value ? resolveFonts(theme.value.fonts, props.event.fonts) : null,
)

// Lista cuando cargaron el papel, la portada y las fuentes (o pasó el tiempo máximo).
const ready = useAssetsReady(() =>
  theme.value && fonts.value
    ? {
        images: criticalImages(sections.value[0], [
          resolveAsset.value(page.value?.image),
          resolveAsset.value(sections.value[0]?.background?.image),
        ]),
        fonts: fontFamilies(fonts.value),
      }
    : null,
)
// Ya visible la portada, en el siguiente cuadro se monta todo lo demás.
const complete = shallowRef(false)
watch(ready, (isReady) => {
  if (isReady) requestAnimationFrame(() => (complete.value = true))
})
const shown = computed(() => (complete.value ? sections.value : sections.value.slice(0, 1)))

watch(
  () => props.event.theme,
  async (id) => {
    const manifest = await loadTheme(id)
    themeMissing.value = manifest === null
    theme.value = manifest
  },
  { immediate: true },
)

// Paleta y fuentes de la invitación sobre los tokens del tema.
watch(
  [theme, () => props.event.palette, () => props.event.fonts, () => props.event.extra_fonts],
  () => {
    revert?.()
    if (!theme.value || !fonts.value) return
    revert = applyTheme(
      document.documentElement,
      theme.value.id,
      { ...paletteVars(props.event.palette), ...fontVars(fonts.value) },
      // Las fuentes de la invitación y las que eligió para algún texto, en una sola hoja.
      googleFontsUrl([...Object.values(fonts.value), ...extraFonts(props.event.extra_fonts)]),
    )
  },
  { immediate: true },
)
onBeforeUnmount(() => revert?.())
</script>

<template>
  <p v-if="themeMissing" class="invitation-error">El tema «{{ event.theme }}» no existe.</p>
  <template v-else>
    <Transition name="invitation-loader">
      <PageLoader v-if="!ready" class="invitation__loader" />
    </Transition>
    <div class="invitation" :class="{ 'is-ready': ready }" :style="pageStyle">
      <div class="invitation__paper" aria-hidden="true" />
      <FloatingDecor
        v-if="complete && decorOn && theme?.floating?.length"
        :items="theme.floating"
      />
      <ButterflyFlight
        v-if="complete && decorOn && theme?.flights?.length"
        :items="theme.flights"
      />
      <main class="invitation__grid">
        <SectionShell
          v-for="section in shown"
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
      <template v-if="complete">
        <MiniPlayer />
        <CelebrationBurst />
        <!-- Las muestras de la landing invitan a cotizar (en el gestor no estorba). -->
        <DemoRibbon v-if="event.demo && !preview" />
      </template>
    </div>
  </template>
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
  /* Oculta hasta que la portada esté completa (ver useAssetsReady). */
  opacity: 0;
}
.invitation.is-ready {
  opacity: 1;
  transition: opacity calc(0.45s * var(--motion-scale)) ease-out;
}
/* La pantalla de espera encima, y se desvanece cuando aparece la invitación. */
.invitation__loader {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.invitation-loader-leave-active {
  transition: opacity calc(0.45s * var(--motion-scale)) ease-out;
}
.invitation-loader-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .invitation.is-ready,
  .invitation-loader-leave-active {
    transition: none;
  }
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
