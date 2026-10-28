<script setup lang="ts">
import { computed, useId } from 'vue'
import { useMonogram } from '@/composables/useMonogram'
import { monogramLayout } from '@/services/monogramService'

/**
 * Monograma: las iniciales de la invitación entrelazadas, en SVG. Con dos letras se
 * montan una sobre otra y se cruzan (la segunda "pasa por encima" y la primera vuelve a
 * cruzar por arriba en un tramo); el "&" caligráfico es opcional. Sin `initials`, salen
 * de la invitación (`evento,,monograma`, o las del nombre corto).
 * Tokens: `--monogram-font` (si no, `--font-serif`), `--monogram-amp-font` (si no,
 * `--font-script`), `--monogram-color` (si no, `--color-primary`) y `--monogram-gap` (el
 * color del papel donde se cruzan las letras, para el efecto de entrelazado).
 */
// El archivo se llama Monogram (como pide el diseño); el nombre del componente lleva dos palabras.
defineOptions({ name: 'MonogramMark' })

const props = withDefaults(
  defineProps<{
    /** Iniciales a mano ("I M"); vacío: las de la invitación. */
    initials?: string
    /** "&" caligráfico entre las dos letras. */
    ampersand?: boolean
    /** Ancho del dibujo: cualquier medida CSS (el alto sigue la proporción). */
    size?: string
    /** Decorativo: se oculta a los lectores de pantalla (lo normal). */
    decorative?: boolean
  }>(),
  { initials: undefined, ampersand: false, size: '6rem', decorative: true },
)

const chars = useMonogram(() => props.initials)
const layout = computed(() => monogramLayout(chars.value, props.ampersand))
const uid = useId()
const clipId = `monogram-clip-${uid}`
const label = computed(() => `Monograma ${chars.value.join(' ')}`)
// Dos letras: el tramo donde la primera vuelve a pasar por encima de la segunda.
const crossing = computed(() => layout.value.letters.length === 2)
</script>

<template>
  <svg
    v-if="layout.letters.length"
    class="monogram"
    :style="{ width: size }"
    :viewBox="`0 0 ${layout.width} ${layout.height}`"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : label"
    focusable="false"
  >
    <defs v-if="crossing">
      <clipPath :id="clipId">
        <rect x="46" y="20" width="14" height="30" />
      </clipPath>
    </defs>
    <g class="monogram__letters">
      <text
        v-for="(glyph, i) in layout.letters"
        :key="`${i}-${glyph.char}`"
        :x="glyph.x"
        :y="glyph.y"
        :font-size="glyph.size"
        text-anchor="middle"
        class="monogram__letter"
        :class="{ 'monogram__letter--over': i === 1 }"
      >
        {{ glyph.char }}
      </text>
      <text
        v-if="crossing"
        :x="layout.letters[0].x"
        :y="layout.letters[0].y"
        :font-size="layout.letters[0].size"
        text-anchor="middle"
        class="monogram__letter monogram__letter--again"
        :clip-path="`url(#${clipId})`"
      >
        {{ layout.letters[0].char }}
      </text>
    </g>
    <text
      v-if="layout.ampersand"
      :x="layout.ampersand.x"
      :y="layout.ampersand.y"
      :font-size="layout.ampersand.size"
      text-anchor="middle"
      class="monogram__amp"
    >
      &amp;
    </text>
  </svg>
</template>

<style scoped>
.monogram {
  display: block;
  height: auto;
  overflow: visible;
  color: var(--monogram-color, var(--color-primary));
}
.monogram__letter {
  fill: currentColor;
  font-family: var(--monogram-font, var(--font-serif));
  font-weight: 400;
}
/* La segunda letra recorta a la primera con el color del papel, para que se vea entrelazada. */
.monogram__letter--over {
  stroke: var(--monogram-gap, var(--color-bg, transparent));
  stroke-width: 2.4;
  paint-order: stroke fill;
  stroke-linejoin: round;
}
.monogram__letter--again {
  stroke: var(--monogram-gap, var(--color-bg, transparent));
  stroke-width: 0;
}
.monogram__amp {
  fill: currentColor;
  font-family: var(--monogram-amp-font, var(--font-script));
}
</style>
