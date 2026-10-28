<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useElementWidth } from '@/composables/useElementWidth'
import { useMonogram } from '@/composables/useMonogram'
import { seededRandom } from '@/services/effectsService'
import {
  cartouchePaths,
  monogramLayout,
  sealDetail,
  sealMonogramPaths,
  waxBlobPath,
} from '@/services/monogramService'

/**
 * Lacre de cera en SVG, quieto y con relieve de verdad. `shape`: redondo u ovalado (más
 * alto que ancho). `tone`: oro o borgoña. Sin `initials`, usa las de la invitación.
 *
 * Cómo se pinta: las piezas se dibujan como un mapa de alturas en los canales de color
 * (rojo = el reborde, verde = el fondo hundido, azul = lo que queda en relieve) y un solo
 * filtro SVG, estático, lo convierte en cera: el reborde se desenfoca hasta ser un cordón
 * redondeado con cresta y se corta en seco contra el fondo (el escalón del sello); el relieve
 * se desenfoca apenas (trazo nítido con su propia sombra); el grano muy fino (feTurbulence)
 * va solo en el fondo. Luego lo ilumina desde arriba a la izquierda (feDiffuseLighting y un
 * brillo satinado largo con feSpecularLighting), lo tiñe con el tono y le pone su sombra de
 * contacto sobre el papel. Nada se anima.
 *
 * - La orilla es casi un círculo con una ondulación suave (`waxBlobPath`), la misma para el
 *   mismo `seed`; el fondo va apenas fuera de centro, también por `seed`.
 * - En el fondo: una cartela heráldica de filigrana (`cartouchePaths`: volutas, marco con
 *   filete, ramas de hojas y bayas, florón, remate y anillo de perlas) y el monograma
 *   caligráfico grande, ambos en relieve. En lacres chicos el detalle fino se omite solo
 *   (`sealDetail` según el ancho medido), para que no se vea sucio.
 * - `icon` (play o pause) cambia el monograma por ese signo, grabado (hundido) en el fondo:
 *   el lacre es el botón de la música; el estado se lee solo en el signo.
 *
 * Colores por token, con respaldo: `--seal-gold` (si no, `--color-oro`, #b08d57),
 * `--seal-burgundy` (si no, `--color-borgona`, #5e1a24); `--seal-light` tiñe el brillo.
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

const root = ref<SVGSVGElement | null>(null)
const width = useElementWidth(root)
const detail = computed(() => sealDetail(width.value))

const chars = useMonogram(() => props.initials)
const oval = computed(() => props.shape === 'oval')
// Caja del dibujo: el ovalado es más alto que ancho.
const box = computed(() => (oval.value ? { w: 100, h: 124 } : { w: 100, h: 100 }))
const cy = computed(() => box.value.h / 2)

/** La forma: orilla, fondo del sello (un poco fuera de centro) y semilla del grano. */
const geometry = computed(() => {
  const random = seededRandom(props.seed)
  const body = oval.value
    ? waxBlobPath(random, 42, 56, 50, cy.value)
    : waxBlobPath(random, 45.5, 45.5, 50, cy.value)
  const dx = (random() - 0.5) * 1.6
  const dy = (random() - 0.5) * 1.6
  const grain = Math.floor(random() * 997) + 1
  return { body, wellX: 50 + dx, wellY: cy.value + dy, grain }
})
const well = computed(() => (oval.value ? { rx: 29, ry: 40.5 } : { rx: 32.5, ry: 32.5 }))
const cartouche = computed(() => cartouchePaths(detail.value))
// La cartela se dibuja de −50 a 50 (50 = el radio del fondo) y se agranda un poco para
// llenar el fondo; las perlas van a la escala del fondo, junto a su pared.
const wellTransform = (k: number) => {
  const { wellX, wellY } = geometry.value
  return `translate(${wellX} ${wellY}) scale(${(well.value.rx / 50) * k} ${(well.value.ry / 50) * k})`
}
const frameTransform = computed(() => wellTransform(1.15))
const beadsTransform = computed(() => wellTransform(1))

const layout = computed(() => monogramLayout(chars.value, false))
const uid = useId()
const filterId = `seal-fx-${uid}`

// El signo de play o pausa, centrado en el fondo (caja de 100 de ancho).
const iconPath = computed(() => {
  const x = Math.round(geometry.value.wellX * 100) / 100
  const y = Math.round(geometry.value.wellY * 100) / 100
  if (props.icon === 'play') return `M${x - 5.5} ${y - 9.5}L${x + 9} ${y}L${x - 5.5} ${y + 9.5}Z`
  if (props.icon === 'pause')
    return `M${x - 7.5} ${y - 8.5}h5.4v17h-5.4ZM${x + 2.1} ${y - 8.5}h5.4v17h-5.4Z`
  return ''
})
// Los glifos de las letras (null si alguna no tiene: entonces va el texto).
const glyphs = computed(() => sealMonogramPaths(chars.value))
const glyphTransform = computed(() => {
  const k = oval.value ? 0.32 : 0.35
  const { wellX, wellY } = geometry.value
  return `translate(${wellX - 50 * k} ${wellY - 50 * k}) scale(${k})`
})
const label = computed(() => `Sello con las iniciales ${chars.value.join(' ')}`)
// El monograma, grande, en el centro de la cartela.
const letterTransform = computed(() => {
  // Más alto que ancho: la letra caligráfica se estira un poco en vertical.
  const k = (oval.value ? 0.32 : 0.35) * (chars.value.length === 1 ? 1.1 : 1)
  const ky = k * 1.32
  const { wellX, wellY } = geometry.value
  return `translate(${wellX - 50 * k} ${wellY - 52 * ky}) scale(${k} ${ky})`
})
// El oro brilla más (casi metálico); la cera borgoña, un satinado suave.
const spec = computed(() =>
  props.tone === 'gold' ? { constant: 1.0, exponent: 9 } : { constant: 0.5, exponent: 16 },
)
const region = computed(() => ({ x: -16, y: -16, width: box.value.w + 32, height: box.value.h + 36 }))
</script>

<template>
  <svg
    v-if="chars.length || icon"
    ref="root"
    class="seal"
    :class="[`seal--${tone}`, `seal--${detail}`]"
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
        <!-- El reborde (rojo): un cordón redondeado con cresta, cortado en seco contra el fondo. -->
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="rim" />
        <feGaussianBlur in="rim" stdDeviation="3.3" result="rimRound" />
        <feGaussianBlur in="rim" stdDeviation="0.45" result="rimEdge" />
        <feComposite in="rimRound" in2="rimEdge" operator="in" result="cord" />
        <!-- El fondo hundido (verde: su altura; el signo grabado va más abajo). -->
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0" result="floorRaw" />
        <feGaussianBlur in="floorRaw" stdDeviation="0.45" result="floor" />
        <!-- El relieve (azul): orilla nítida y lomo redondo, como un cojín por trazo. -->
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="raisedRaw" />
        <feGaussianBlur in="raisedRaw" stdDeviation="0.2" result="raisedSharp" />
        <feGaussianBlur in="raisedRaw" stdDeviation="0.7" result="raisedBlur" />
        <feComposite in="raisedBlur" in2="raisedSharp" operator="in" result="raisedDome" />
        <feComposite in="raisedSharp" in2="raisedDome" operator="arithmetic" k2="0.5" k3="0.6" result="raised" />
        <!-- Grano muy fino, solo en el fondo. -->
        <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" :seed="geometry.grain" result="noise" />
        <feColorMatrix in="noise" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="grainAll" />
        <feComposite in="grainAll" in2="floor" operator="in" result="grain" />
        <feComposite in="cord" in2="floor" operator="arithmetic" k2="1" k3="0.32" result="h1" />
        <feComposite in="h1" in2="raised" operator="arithmetic" k2="1" k3="0.3" result="h2" />
        <feComposite in="h2" in2="grain" operator="arithmetic" k2="1" k3="0.03" result="height" />
        <!-- La luz: difusa desde arriba a la izquierda y un brillo satinado largo. -->
        <feDiffuseLighting in="height" surfaceScale="9" diffuseConstant="1" lighting-color="#fff" result="shade">
          <feDistantLight azimuth="225" elevation="42" />
        </feDiffuseLighting>
        <feSpecularLighting
          in="height"
          class="seal__spec"
          surfaceScale="9"
          :specularConstant="spec.constant"
          :specularExponent="spec.exponent"
          result="gloss"
        >
          <feDistantLight azimuth="228" elevation="36" />
        </feSpecularLighting>
        <feGaussianBlur in="gloss" stdDeviation="0.6" result="glossSoft" />
        <!-- El tono de la cera, sombreado; el fondo, un poco más mate. -->
        <feFlood class="seal__tint" result="tint" />
        <feComposite in="tint" in2="shade" operator="arithmetic" k1="0.92" k2="0.3" result="lit" />
        <feColorMatrix in="floor" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.14 0" result="matte" />
        <feComposite in="matte" in2="lit" operator="over" result="litMatte" />
        <feComposite in="glossSoft" in2="litMatte" operator="arithmetic" k2="0.55" k3="1" result="waxLit" />
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
        fill="rgb(0 179 0)"
      />
      <g
        class="seal__relief"
        fill="rgb(0 179 210)"
        stroke="rgb(0 179 210)"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path v-if="cartouche.beads" :transform="beadsTransform" :d="cartouche.beads" stroke="none" />
        <g :transform="frameTransform">
          <path
            class="seal__cartouche"
            :d="cartouche.heavy"
            fill="none"
            stroke="rgb(0 179 255)"
            stroke-width="2.3"
          />
          <!-- El surco al centro del trazo grueso: el doble contorno de la cartela. -->
          <path :d="cartouche.heavy" fill="none" stroke="rgb(0 179 110)" stroke-width="0.7" />
          <path :d="cartouche.medium" fill="none" stroke-width="1.35" />
          <path
            v-if="cartouche.fine"
            :d="cartouche.fine"
            fill="none"
            stroke="rgb(0 179 160)"
            stroke-width="0.75"
          />
          <path class="seal__cartouche-fill" :d="cartouche.fill" stroke="none" />
        </g>
        <!-- El monograma en paths: la segunda letra pasa por encima (su contorno ancho en el
             verde del fondo, y luego ella en azul). -->
        <g v-if="!icon && glyphs" :transform="glyphTransform" class="seal__letters">
          <g v-for="(glyph, i) in glyphs" :key="i">
            <path
              v-if="i > 0"
              :d="glyph.d"
              :transform="glyph.transform"
              fill="rgb(0 179 0)"
              stroke="rgb(0 179 0)"
              :stroke-width="glyph.outline"
            />
            <path
              class="seal__glyph"
              :d="glyph.d"
              :transform="glyph.transform"
              fill="rgb(0 179 255)"
              stroke="rgb(0 179 255)"
              :stroke-width="glyph.hairline"
            />
          </g>
        </g>
        <g
          v-else-if="!icon"
          :transform="letterTransform"
          class="seal__letters"
          fill="rgb(0 179 255)"
          stroke="rgb(0 179 255)"
          stroke-width="2.2"
        >
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
      <!-- El signo (play o pausa), grabado más hondo que el fondo. -->
      <path v-if="icon" class="seal__icon" :d="iconPath" fill="rgb(0 89 0)" />
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
  --seal-base: var(--seal-burgundy, var(--color-borgona, #5e1a24));
  --seal-gloss: var(--seal-light, #f3d2c8);
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
