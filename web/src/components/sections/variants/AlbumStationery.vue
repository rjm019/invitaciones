<script setup lang="ts">
import { computed } from 'vue'
import AlbumSection from '@/components/sections/AlbumSection.vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Álbum de papelería ("papeleria"): el álbum de siempre (misma lógica, `AlbumSection`)
 * impreso en una tarjeta de papel con las esquinas recortadas y el filete
 * (`paper-notched`), con una cámara antigua dibujada a línea arriba (ranura `marco`, o el
 * adorno compartido `camara.svg`, pintado con máscara en la tinta). Antes del día se ve
 * como una tarjeta de aviso; ya abierto, las fotos van con su margen de papel.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { resolveAsset } = useEvent()

const camera = computed(() => decorOr(props.section.decor, 'frame', resolveAsset.value('camara.svg')))
const cameraStyle = computed(() =>
  camera.value ? { '--as-camera': `url("${camera.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="as">
    <div class="as__card paper-notched" data-fillet="burgundy">
      <span v-if="camera" class="as__camera" aria-hidden="true" :style="cameraStyle" />
      <AlbumSection :section="section" />
    </div>
  </div>
</template>

<style scoped>
.as {
  max-width: 30rem;
  margin: 0 auto;
  filter: drop-shadow(0 1px 1px rgb(59 52 46 / 0.12)) drop-shadow(0 12px 18px rgb(59 52 46 / 0.2));
}
.as__card {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  padding: 2.2rem 1.6rem 2rem;
  color: var(--color-text);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--color-paper, var(--color-surface));
}
.as__camera {
  width: 5.5rem;
  aspect-ratio: 160 / 110;
  background: var(--color-text);
  -webkit-mask: var(--as-camera) center / contain no-repeat;
  mask: var(--as-camera) center / contain no-repeat;
  opacity: 0.8;
}
.as :deep(.album) {
  /* el álbum es contenedor (cqi): dentro de la tarjeta, que ocupe todo el ancho */
  width: 100%;
}
.as :deep(.album__title) {
  font-family: var(--t-title-font, var(--font-display));
  font-size: calc(clamp(1.6rem, 7.5cqi, 2.2rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.as :deep(.album__text) {
  max-width: 30ch;
  margin-inline: auto;
  color: var(--t-text-color, var(--color-text));
}
.as :deep(.album__note) {
  margin-top: 0.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-borgona, var(--color-accent));
}
.as :deep(.album__button) {
  min-height: 2.8rem;
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(0.76rem * var(--t-button-size, 1));
}
.as :deep(.album__grid) {
  gap: 0.9rem;
}
.as :deep(.album__item) {
  padding: 0.35rem;
  border: 0;
  background: var(--color-surface);
  box-shadow:
    0 1px 1px rgb(59 52 46 / 0.12),
    0 8px 14px -8px rgb(59 52 46 / 0.4);
}
</style>
