<script setup lang="ts">
import { computed, useId } from 'vue'
import { useMonogram } from '@/composables/useMonogram'
import { seededRandom } from '@/services/effectsService'
import { monogramLayout, waxEdgePath } from '@/services/monogramService'

/**
 * Lacre de cera en SVG con el monograma en bajorrelieve. `shape`: redondo (orilla
 * irregular, como cera derramada) u ovalado (más alto que ancho, como un sello de
 * anillo). `tone`: oro o borgoña. El relieve sale de capas (luz abajo a la derecha y
 * sombra arriba a la izquierda dentro de las letras, anillo en alto y brillo en la orilla):
 * sin filtros pesados ni animación. Sin `initials`, usa las de la invitación.
 * Colores por token, con respaldo: `--seal-gold` (si no, `--color-oro`, #b08d57),
 * `--seal-burgundy` (si no, `--color-borgona`, #6e1f2c); `--seal-light` y `--seal-dark`
 * cambian el realce y la sombra. Letras: `--seal-font` (si no, `--font-serif`).
 * La forma de la orilla es la misma para el mismo `seed`.
 */
const props = withDefaults(
  defineProps<{
    initials?: string
    shape?: 'round' | 'oval'
    tone?: 'gold' | 'burgundy'
    /** Ancho del lacre: cualquier medida CSS (el alto sigue la forma). */
    size?: string
    seed?: string
    /** Decorativo: se oculta a los lectores de pantalla (lo normal). */
    decorative?: boolean
  }>(),
  {
    initials: undefined,
    shape: 'round',
    tone: 'gold',
    size: '6rem',
    seed: 'lacre',
    decorative: true,
  },
)

const chars = useMonogram(() => props.initials)
const oval = computed(() => props.shape === 'oval')
// Caja del dibujo: el ovalado es más alto que ancho.
const box = computed(() => (oval.value ? { w: 100, h: 124 } : { w: 100, h: 100 }))
const edge = computed(() =>
  // Nace en 100 × 100; el ovalado lo estira en vertical (edgeTransform).
  waxEdgePath(seededRandom(props.seed), oval.value ? 40 : 44, 44, oval.value ? 0.35 : 0.55),
)
const layout = computed(() => monogramLayout(chars.value, false))
const uid = useId()
const gradId = `seal-grad-${uid}`
const label = computed(() => `Sello con las iniciales ${chars.value.join(' ')}`)
// El monograma ocupa el centro del anillo (un 56 % del lacre).
const letterScale = computed(() => (oval.value ? 0.52 : 0.56))
const letterTransform = computed(() => {
  const k = letterScale.value
  const cy = box.value.h / 2
  return `translate(${50 - 50 * k} ${cy - 50 * k}) scale(${k})`
})
// El ovalado estira la orilla (nacida en 100 × 100) hasta el alto de su caja.
const edgeTransform = computed(() => (oval.value ? `scale(1 ${box.value.h / 100})` : undefined))
const ringStyle = computed(() => ({
  rx: oval.value ? 29 : 32,
  ry: oval.value ? 40 : 32,
}))
</script>

<template>
  <svg
    v-if="chars.length"
    class="seal"
    :class="`seal--${tone}`"
    :style="{ width: size }"
    :viewBox="`0 0 ${box.w} ${box.h}`"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : label"
    focusable="false"
  >
    <defs>
      <radialGradient :id="gradId" cx="36%" cy="30%" r="80%">
        <stop offset="0" class="seal__stop seal__stop--light" />
        <stop offset="0.55" class="seal__stop seal__stop--base" />
        <stop offset="1" class="seal__stop seal__stop--dark" />
      </radialGradient>
    </defs>
    <!-- Sombra proyectada: la misma orilla, desplazada y suave. -->
    <g transform="translate(1.5 2.5)">
      <path class="seal__shadow" :d="edge" :transform="edgeTransform" />
    </g>
    <path class="seal__body" :d="edge" :transform="edgeTransform" :fill="`url(#${gradId})`" />
    <!-- Brillo fino en la orilla de arriba a la izquierda. -->
    <path class="seal__rim" :d="edge" :transform="edgeTransform" />
    <!-- Anillo en alto: sombra y luz desfasadas un poco. -->
    <ellipse
      class="seal__ring seal__ring--dark"
      cx="50"
      :cy="box.h / 2"
      v-bind="ringStyle"
      transform="translate(-0.7 -0.7)"
    />
    <ellipse class="seal__ring seal__ring--light" cx="50" :cy="box.h / 2" v-bind="ringStyle" transform="translate(0.7 0.7)" />
    <!-- Monograma hundido: luz abajo, sombra arriba, letra en el tono de la cera. -->
    <g :transform="letterTransform" class="seal__letters">
      <template v-for="layer in ['light', 'dark', 'face']" :key="layer">
        <text
          v-for="(glyph, i) in layout.letters"
          :key="`${layer}-${i}`"
          :x="glyph.x + (layer === 'light' ? 0.9 : layer === 'dark' ? -0.9 : 0)"
          :y="glyph.y + (layer === 'light' ? 0.9 : layer === 'dark' ? -0.9 : 0)"
          :font-size="glyph.size"
          text-anchor="middle"
          class="seal__letter"
          :class="`seal__letter--${layer}`"
        >
          {{ glyph.char }}
        </text>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.seal {
  --seal-base: var(--seal-gold, var(--color-oro, #b08d57));
  --seal-hi: var(--seal-light, rgb(255 255 255 / 0.55));
  --seal-lo: var(--seal-dark, rgb(0 0 0 / 0.45));
  display: block;
  height: auto;
  overflow: visible;
}
.seal--burgundy {
  --seal-base: var(--seal-burgundy, var(--color-borgona, #6e1f2c));
}
.seal__stop--light {
  stop-color: color-mix(in srgb, var(--seal-base) 70%, #fff);
}
.seal__stop--base {
  stop-color: var(--seal-base);
}
.seal__stop--dark {
  stop-color: color-mix(in srgb, var(--seal-base) 62%, #000);
}
.seal__shadow {
  fill: rgb(0 0 0 / 0.3);
}
.seal__rim {
  fill: none;
  stroke: var(--seal-hi);
  stroke-width: 0.7;
  opacity: 0.6;
}
.seal__ring {
  fill: none;
  stroke-width: 1.1;
}
.seal__ring--dark {
  stroke: var(--seal-lo);
}
.seal__ring--light {
  stroke: var(--seal-hi);
}
.seal__letter {
  font-family: var(--seal-font, var(--font-serif));
  font-weight: 600;
}
.seal__letter--light {
  fill: var(--seal-hi);
}
.seal__letter--dark {
  fill: var(--seal-lo);
}
.seal__letter--face {
  fill: color-mix(in srgb, var(--seal-base) 82%, #000);
}
</style>
