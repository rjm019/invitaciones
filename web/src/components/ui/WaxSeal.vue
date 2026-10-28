<script setup lang="ts">
import { computed, useId } from 'vue'
import { useMonogram } from '@/composables/useMonogram'
import { seededRandom } from '@/services/effectsService'
import { monogramLayout, waxBlobPath, wreathPaths } from '@/services/monogramService'

/**
 * Lacre de cera en SVG, quieto y con relieve de verdad. `shape`: redondo u ovalado (más
 * alto que ancho). `tone`: oro o borgoña. Sin `initials`, usa las de la invitación.
 *
 * Cómo se pinta: las piezas se dibujan como un mapa de alturas en los canales de color
 * (rojo = la cera, verde = el hueco que dejó el sello, azul = lo que queda en relieve) y un
 * solo filtro SVG, estático, lo convierte en cera: desenfoca cada canal a su medida (orilla
 * gruesa y redondeada, pared del hueco, relieve fino), le suma el grano de la cera
 * (feTurbulence), lo ilumina desde arriba a la izquierda (feDiffuseLighting y un brillo
 * especular suave con feSpecularLighting), lo tiñe con el tono y le pone su sombra de
 * contacto sobre el papel. Nada se anima.
 *
 * - La orilla es orgánica (ondas lentas y derrames, `waxBlobPath`) y la misma para el mismo
 *   `seed`; el hueco del sello va apenas fuera de centro, también por `seed`.
 * - Dentro del hueco: una corona de filigrana vegetal con perlas (`wreathPaths`) y el
 *   monograma caligráfico, ambos en relieve.
 * - `icon` (play o pause) cambia el monograma por ese signo, grabado (hundido) en el fondo:
 *   el lacre es el botón de la música; el estado se lee solo en el signo.
 *
 * Colores por token, con respaldo: `--seal-gold` (si no, `--color-oro`, #b08d57),
 * `--seal-burgundy` (si no, `--color-borgona`, #6e1f2c); `--seal-light` tiñe el brillo.
 * Letras: `--seal-font` (si no, `--font-script`, luego `--font-serif`). Cada lacre tiene sus
 * propios ids (useId): caben varios en la página.
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
    /** Un signo grabado en lugar del monograma (el lacre como botón de la música). */
    icon?: 'play' | 'pause'
    /** Ya no hace nada: el lacre no lleva brillo animado. Se acepta por compatibilidad. */
    shine?: boolean
  }>(),
  {
    initials: undefined,
    shape: 'round',
    tone: 'gold',
    size: '6rem',
    seed: 'lacre',
    decorative: true,
    icon: undefined,
    shine: false,
  },
)

const chars = useMonogram(() => props.initials)
const oval = computed(() => props.shape === 'oval')
// Caja del dibujo: el ovalado es más alto que ancho.
const box = computed(() => (oval.value ? { w: 100, h: 124 } : { w: 100, h: 100 }))
const cy = computed(() => box.value.h / 2)

/** La forma: orilla, hueco del sello (un poco fuera de centro) y semilla del grano. */
const geometry = computed(() => {
  const random = seededRandom(props.seed)
  const body = oval.value
    ? waxBlobPath(random, 41, 54, 50, cy.value)
    : waxBlobPath(random, 44, 44, 50, cy.value)
  const dx = (random() - 0.5) * 2.4
  const dy = (random() - 0.5) * 2.4
  const grain = Math.floor(random() * 997) + 1
  return { body, wellX: 50 + dx, wellY: cy.value + dy, grain }
})
const well = computed(() => (oval.value ? { rx: 27.5, ry: 39 } : { rx: 30.5, ry: 30.5 }))
const wreath = computed(() => {
  const { wellX, wellY } = geometry.value
  return wreathPaths(wellX, wellY, well.value.rx * 0.76, well.value.ry * 0.76)
})

const layout = computed(() => monogramLayout(chars.value, false))
const uid = useId()
const filterId = `seal-fx-${uid}`

// El signo de play o pausa, centrado en el hueco (caja de 100 de ancho).
const iconPath = computed(() => {
  const x = geometry.value.wellX
  const y = geometry.value.wellY
  if (props.icon === 'play') return `M${x - 6} ${y - 10.5}L${x + 10} ${y}L${x - 6} ${y + 10.5}Z`
  if (props.icon === 'pause')
    return `M${x - 8.5} ${y - 9.5}h6v19h-6ZM${x + 2.5} ${y - 9.5}h6v19h-6Z`
  return ''
})
const label = computed(() => `Sello con las iniciales ${chars.value.join(' ')}`)
// El monograma ocupa el centro de la corona.
const letterTransform = computed(() => {
  const k = oval.value ? 0.4 : 0.42
  const { wellX, wellY } = geometry.value
  return `translate(${wellX - 50 * k} ${wellY - 50 * k + 1.5}) scale(${k})`
})
// El oro brilla más (casi metálico); la cera borgoña, un satinado suave.
const spec = computed(() =>
  props.tone === 'gold' ? { constant: 1.1, exponent: 14 } : { constant: 0.85, exponent: 18 },
)
const region = computed(() => ({ x: -16, y: -16, width: box.value.w + 32, height: box.value.h + 36 }))
</script>

<template>
  <svg
    v-if="chars.length || icon"
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
      <filter
        :id="filterId"
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        v-bind="region"
        color-interpolation-filters="sRGB"
      >
        <!-- Cada canal a su propia altura: cera (rojo), hueco (verde) y relieve (azul). -->
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="wax" />
        <feGaussianBlur in="wax" stdDeviation="4.1" result="waxSoft" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0" result="hole" />
        <feGaussianBlur in="hole" stdDeviation="0.95" result="holeSoft" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="raised" />
        <feGaussianBlur in="raised" stdDeviation="0.42" result="raisedSoft" />
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" :seed="geometry.grain" result="noise" />
        <feColorMatrix in="noise" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="grain" />
        <feComposite in="waxSoft" in2="holeSoft" operator="arithmetic" k2="1" k3="-0.6" result="h1" />
        <feComposite in="h1" in2="raisedSoft" operator="arithmetic" k2="1" k3="0.22" result="h2" />
        <feComposite in="h2" in2="grain" operator="arithmetic" k2="1" k3="0.028" k4="-0.014" result="height" />
        <!-- La luz: difusa desde arriba a la izquierda y un brillo especular suave. -->
        <feDiffuseLighting in="height" surfaceScale="9" diffuseConstant="1" lighting-color="#fff" result="shade">
          <feDistantLight azimuth="225" elevation="47" />
        </feDiffuseLighting>
        <feSpecularLighting
          in="height"
          class="seal__spec"
          surfaceScale="9"
          :specularConstant="spec.constant"
          :specularExponent="spec.exponent"
          result="gloss"
        >
          <feDistantLight azimuth="230" elevation="32" />
        </feSpecularLighting>
        <feGaussianBlur in="gloss" stdDeviation="0.5" result="glossSoft" />
        <!-- El tono de la cera, sombreado; el fondo del hueco, un poco más mate. -->
        <feFlood class="seal__tint" result="tint" />
        <feComposite in="tint" in2="shade" operator="arithmetic" k1="1" k2="0.2" result="lit" />
        <feColorMatrix in="holeSoft" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" result="matte" />
        <feComposite in="matte" in2="lit" operator="over" result="litMatte" />
        <feComposite in="glossSoft" in2="litMatte" operator="arithmetic" k2="0.6" k3="1" result="waxLit" />
        <feComposite in="waxLit" in2="SourceAlpha" operator="in" result="seal" />
        <!-- Sombra de contacto (pegada y oscura) y sombra suave más lejos, sobre el papel. -->
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="c1" />
        <feOffset in="c1" dx="0.4" dy="1" result="c2" />
        <feFlood flood-color="#1e120a" flood-opacity="0.42" result="c3" />
        <feComposite in="c3" in2="c2" operator="in" result="contact" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.6" result="a1" />
        <feOffset in="a1" dx="1.6" dy="4.2" result="a2" />
        <feFlood flood-color="#1e120a" flood-opacity="0.22" result="a3" />
        <feComposite in="a3" in2="a2" operator="in" result="ambient" />
        <feMerge>
          <feMergeNode in="ambient" />
          <feMergeNode in="contact" />
          <feMergeNode in="seal" />
        </feMerge>
      </filter>
    </defs>
    <!-- El mapa de alturas: solo lo lee el filtro (los colores son canales, no tonos). -->
    <g :filter="`url(#${filterId})`">
      <path class="seal__body" :d="geometry.body" fill="#f00" />
      <ellipse
        class="seal__well"
        :cx="geometry.wellX"
        :cy="geometry.wellY"
        :rx="well.rx"
        :ry="well.ry"
        fill="rgb(255 179 0)"
      />
      <g class="seal__relief" fill="rgb(255 179 255)">
        <path class="seal__wreath" :d="wreath.fill" />
        <path
          class="seal__wreath-stems"
          :d="wreath.stroke"
          fill="none"
          stroke="rgb(255 179 255)"
          stroke-width="1.15"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g v-if="!icon" :transform="letterTransform" class="seal__letters">
          <text
            v-for="(glyph, i) in layout.letters"
            :key="i"
            :x="glyph.x"
            :y="glyph.y"
            :font-size="glyph.size"
            text-anchor="middle"
            class="seal__letter"
          >
            {{ glyph.char }}
          </text>
        </g>
      </g>
      <!-- El signo (play o pausa), grabado más hondo que el fondo del hueco. -->
      <path v-if="icon" class="seal__icon" :d="iconPath" fill="rgb(255 255 0)" />
    </g>
  </svg>
</template>

<style scoped>
.seal {
  --seal-base: var(--seal-gold, var(--color-oro, #b08d57));
  --seal-gloss: var(--seal-light, #fff2d2);
  display: block;
  height: auto;
  overflow: visible;
}
.seal--burgundy {
  --seal-base: var(--seal-burgundy, var(--color-borgona, #6e1f2c));
  --seal-gloss: var(--seal-light, #ffe1dc);
}
.seal__tint {
  flood-color: var(--seal-base);
}
.seal__spec {
  lighting-color: var(--seal-gloss);
}
.seal__letter {
  font-family: var(--seal-font, var(--font-script, var(--font-serif)));
  font-weight: 400;
}
</style>
