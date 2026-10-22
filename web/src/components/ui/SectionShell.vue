<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionAmbience from '@/components/ui/SectionAmbience.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { vReveal } from '@/directives/reveal'
import { backgroundVars } from '@/services/backgroundService'
import { motionTime, seededRandom, sparkles } from '@/services/effectsService'
import { sectionStyleVars } from '@/services/themeService'
import type { ResolvedSection } from '@/types/event'

/**
 * Envoltura de toda sección: es el ÚNICO lugar que pinta fondo, overlay y efectos.
 * Las secciones solo se ocupan de su contenido. Cada sección es un panel (fondo propio,
 * esquinas, sombra y línea fina del tema); la portada va sin panel, sobre el papel.
 * Difuminada (efecto "blend") no es panel: llega a las orillas, sin espacio con sus
 * vecinas, y si tiene fondo es una franja cuyas orillas se funden con lo que sigue.
 * También declara los colores propios de la sección y el estilo de cada texto (letra,
 * color y tamaño) como variables: las secciones solo leen tokens, así que les llegan solos.
 */
const props = defineProps<{ section: ResolvedSection }>()
// El renderer le pone a la raíz su lugar en la cuadrícula de escritorio (class).
const { resolveAsset } = useEvent()

const blend = computed(() => props.section.effects.includes('blend'))
const style = computed(() => ({
  ...backgroundVars(props.section.background, resolveAsset.value),
  ...sectionStyleVars(props.section),
  // Cada franja corta su orilla en otro punto del dibujo: dos seguidas no se ven iguales.
  ...(blend.value
    ? { '--blend-shift': `${Math.round(seededRandom(props.section.id)() * 700)}px` }
    : {}),
}))
// Fondo de un color de la paleta ("paper", "frame"…): el tema puede pintar distinto esa franja.
const bgToken = computed(() => {
  const color = props.section.background?.color?.trim().toLowerCase()
  return color && /^[a-z][a-z0-9-]*$/.test(color) ? color : null
})
const recolored = computed(() => Object.keys(props.section.colors ?? {}).length > 0)
const hasImage = computed(() => '--section-bg-image' in style.value)
const hasColor = computed(() => '--section-bg-color' in style.value)
const hasOverlay = computed(() => '--section-overlay' in style.value)

// destellos: estrellitas doradas que titilan detrás del contenido (siempre las mismas por sección).
const stars = computed(() =>
  props.section.effects.includes('sparkle') ? sparkles(props.section.id) : [],
)
// Reflectores, luces de ciudad, horizonte, escarcha, bola disco, íconos de la ciudad y taxis: detrás del contenido.
const AMBIENCE = [
  'searchlights',
  'city-lights',
  'skyline',
  'glitter',
  'disco-ball',
  'disco-lights',
  'city-icons',
  'taxi',
  'icon-strip',
]
const ambience = computed(() => props.section.effects.some((e) => AMBIENCE.includes(e)))
// cascada: los elementos de la sección entran uno tras otro; necesita saber cuándo se ve.
const REVEALS = ['reveal', 'reveal-zoom', 'reveal-slide', 'reveal-tilt', 'cascade']
const reveals = computed(() => props.section.effects.some((e) => REVEALS.includes(e)))

// Lejos de la pantalla, sus animaciones se pausan y su ambiente no se pinta: con muchas
// secciones con luces, escarcha o la ciudad, el celular no se satura (ver effects.css).
const root = ref<HTMLElement | null>(null)
const near = useInView(root, { once: false, rootMargin: '60% 0px', threshold: 0 })

const classes = computed(() => [
  'section',
  `section--${props.section.type}`,
  props.section.variant && `section--${props.section.type}--${props.section.variant}`,
  ...props.section.effects.map((e) => `fx-${e}`),
  {
    'section--panel': props.section.panel && !blend.value,
    // Sin panel por diseño del tema (la portada): su contenido es lo que se ve.
    'section--bare': !props.section.panel,
    'section--blend': blend.value,
    [`section--edge-${props.section.edge}`]: blend.value && !!props.section.edge,
    [`section--bg-${bgToken.value}`]: !!bgToken.value,
    'section--has-bg': hasImage.value || hasColor.value,
    'section--sticky-bg': hasImage.value && props.section.background?.attachment === 'sticky',
    // Con colores propios, los tokens que se calculan desde otros (degradados, sombras) se
    // vuelven a calcular aquí (ver tokens.css).
    'section--recolored': recolored.value,
    'is-idle': !near.value,
  },
])
</script>

<template>
  <section
    :id="section.id"
    ref="root"
    :data-section-key="section.key"
    :class="classes"
    :style="style"
  >
    <!--
      Difuminada con fondo (una franja): el color y la imagen van en su hoja, con las orillas
      cortadas (degradado, ciudad u hoja rasgada); junto al corte, la fibra y la sombra.
    -->
    <div v-if="blend && (hasColor || hasImage)" class="section__sheet" aria-hidden="true">
      <div v-if="hasColor" class="section__fill" />
      <div v-if="hasImage" class="section__bg" />
      <div v-if="hasOverlay" class="section__overlay" />
      <span class="section__edge section__edge--top" />
      <span class="section__edge section__edge--bottom" />
    </div>
    <template v-else>
      <div v-if="hasImage" class="section__bg" aria-hidden="true" />
      <div v-if="hasOverlay" class="section__overlay" aria-hidden="true" />
    </template>
    <!-- cambio de color: tonos del tema que aparecen y se van sobre el fondo -->
    <div v-if="section.effects.includes('color-shift')" class="section__tint" aria-hidden="true">
      <span class="section__tint-layer" />
      <span class="section__tint-layer" />
    </div>
    <div v-if="stars.length" class="section__sparkles" aria-hidden="true">
      <span
        v-for="(star, i) in stars"
        :key="i"
        class="fx-sparkle-star"
        :style="{
          top: `${star.top}%`,
          left: `${star.left}%`,
          width: `${star.size}rem`,
          animationDelay: motionTime(star.delay),
          animationDuration: motionTime(star.duration),
        }"
      />
    </div>
    <SectionAmbience v-if="ambience" :section="section" />
    <div
      v-reveal="reveals"
      class="section__content"
      :class="{ 'is-cascade-only': !section.effects.some((e) => REVEALS.includes(e) && e !== 'cascade') }"
    >
      <slot />
    </div>
    <!-- reflejo plateado: encima del contenido, solo aclara lo claro (letras y filos) -->
    <div v-if="section.effects.includes('sheen')" class="section__sheen" aria-hidden="true" />
  </section>
</template>

<style scoped>
.section {
  position: relative;
  display: grid;
  align-content: center;
  /* Con colores propios (o en una franja de papel) la letra toma los de la sección, no
     los que trae heredados de la página. */
  color: var(--color-text);
  padding: var(--section-padding-block, var(--space-4))
    var(--section-padding-inline, var(--space-2));
  /* background (no background-color): el color de un panel también puede ser un degradado */
  background: var(--section-bg-color, transparent);
}
/* Sin panel (portada): su contenido es lo que se ve; el espacio lo pone la página. */
.section--bare {
  padding-block: 0;
}
.section--panel {
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow);
  overflow: clip;
}
/*
 * Con horizonte, la ciudad ocupa el pie del panel: el contenido termina antes. (En la
 * portada no: ahí la ciudad va al pie de la pantalla, detrás del sobre y del botón.)
 */
:is(.section--panel, .section--blend:not(.section--bare)).fx-skyline {
  padding-bottom: calc(var(--section-padding-block, var(--space-4)) + 4.5rem);
}
/*
 * difuminar (blend): no es tarjeta. Se come el espacio entre secciones (llega a las
 * orillas de la pantalla y toca a sus vecinas) y su contenido queda donde estaba. Con fondo
 * es una franja: sus orillas de arriba y abajo se funden con lo que sigue, en degradado o
 * con la forma que ponga el tema (--blend-top y --blend-bottom; en Nueva York, el
 * horizonte). El tamaño de esa orilla es --blend-edge.
 */
.section--blend {
  --blend-edge: clamp(2.75rem, 13vw, 4.75rem);
  margin: calc(-0.5 * var(--section-gap)) calc(-1 * var(--section-gap));
  padding-inline: calc(var(--section-padding-inline, var(--space-2)) + var(--section-gap));
  background: none;
}
.section--blend.section--has-bg:not(.section--bare) {
  padding-block: calc(var(--section-padding-block, var(--space-4)) + 0.7 * var(--blend-edge));
}
.section__fill {
  position: absolute;
  inset: 0;
  background: var(--section-bg-color);
}
.section__sheet {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.section--blend :is(.section__fill, .section__bg, .section__overlay),
.section--blend > .section__tint {
  -webkit-mask:
    var(--blend-top, linear-gradient(transparent, #000)) var(--blend-shift, 0px) top /
      var(--blend-top-size, 100%) var(--blend-edge) repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 2 * var(--blend-edge) + 2px) no-repeat,
    var(--blend-bottom, linear-gradient(#000, transparent)) var(--blend-shift, 0px) bottom /
      var(--blend-bottom-size, 100%) var(--blend-edge) repeat-x;
  mask:
    var(--blend-top, linear-gradient(transparent, #000)) var(--blend-shift, 0px) top /
      var(--blend-top-size, 100%) var(--blend-edge) repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 2 * var(--blend-edge) + 2px) no-repeat,
    var(--blend-bottom, linear-gradient(#000, transparent)) var(--blend-shift, 0px) bottom /
      var(--blend-bottom-size, 100%) var(--blend-edge) repeat-x;
}
/*
 * La forma de las orillas (division entre secciones): la elige la sección (`orilla`), la
 * página o el tema (ver withEdges); sin ninguna, un degradado. Cada una pone su dibujo en
 * --blend-top/--blend-bottom y su alto en --blend-edge:
 * - hoja: la franja asoma por una rasgadura de la hoja de al lado (con su fibra,
 *   --blend-rim, y su sombra, --blend-shade: las tres máscaras usan el mismo corrimiento).
 * - ciudad: los edificios de Manhattan suben (arriba) o recortan la franja (abajo).
 * - ola y feston: una onda suave o medias lunas.
 * - recta: sin forma ni degradado.
 */
.section--edge-torn {
  --blend-edge: clamp(2.6rem, 12vw, 4rem);
  --blend-top: url('../../effects/assets/hoja-arriba.svg');
  --blend-top-size: auto;
  --blend-bottom: url('../../effects/assets/hoja-abajo.svg');
  --blend-bottom-size: auto;
}
.section--edge-city {
  --blend-edge: clamp(4.25rem, 22vw, 7.5rem);
  --blend-top: url('../../effects/assets/borde-arriba.svg');
  --blend-top-size: auto;
  --blend-bottom: url('../../effects/assets/borde-abajo.svg');
  --blend-bottom-size: auto;
}
.section--edge-wave {
  --blend-edge: clamp(1.8rem, 8vw, 2.8rem);
  --blend-top: url('../../effects/assets/ola-arriba.svg');
  --blend-top-size: auto;
  --blend-bottom: url('../../effects/assets/ola-abajo.svg');
  --blend-bottom-size: auto;
}
.section--edge-scallop {
  --blend-edge: clamp(1.1rem, 5vw, 1.6rem);
  --blend-top: url('../../effects/assets/feston-arriba.svg');
  --blend-top-size: auto;
  --blend-bottom: url('../../effects/assets/feston-abajo.svg');
  --blend-bottom-size: auto;
}
.section--edge-straight {
  --blend-edge: 0px;
  --blend-top: linear-gradient(#000 0 0);
  --blend-bottom: linear-gradient(#000 0 0);
}
/* El papel lleva grano y una luz suave al centro: no se ve plano. */
.section--bg-paper .section__fill {
  background:
    url('../../themes/_shared/assets/grano.svg') 0 0 / 240px,
    radial-gradient(
      120% 85% at 50% 42%,
      color-mix(in srgb, var(--color-paper) 70%, #fff) 0%,
      transparent 72%
    ),
    var(--section-bg-color);
}
.section__edge {
  display: none;
  position: absolute;
  left: 0;
  right: 0;
  height: var(--blend-edge);
}
.section__edge--top {
  top: 0;
}
.section__edge--bottom {
  bottom: 0;
}
.section--edge-torn .section__edge {
  display: block;
}
.section__edge::before,
.section__edge::after {
  content: '';
  position: absolute;
  inset: 0;
}
.section__edge::before {
  background: var(--blend-rim, rgb(0 0 0 / 0.14));
}
.section__edge::after {
  background: var(--blend-shade, rgb(0 0 0 / 0.2));
}
.section__edge--top::before {
  -webkit-mask: url('../../effects/assets/hoja-fibra-arriba.svg') var(--blend-shift, 0px) 0 / auto
    100% repeat-x;
  mask: url('../../effects/assets/hoja-fibra-arriba.svg') var(--blend-shift, 0px) 0 / auto 100%
    repeat-x;
}
.section__edge--top::after {
  -webkit-mask: url('../../effects/assets/hoja-sombra-arriba.svg') var(--blend-shift, 0px) 0 / auto
    100% repeat-x;
  mask: url('../../effects/assets/hoja-sombra-arriba.svg') var(--blend-shift, 0px) 0 / auto 100%
    repeat-x;
}
.section__edge--bottom::before {
  -webkit-mask: url('../../effects/assets/hoja-fibra-abajo.svg') var(--blend-shift, 0px) 0 / auto
    100% repeat-x;
  mask: url('../../effects/assets/hoja-fibra-abajo.svg') var(--blend-shift, 0px) 0 / auto 100%
    repeat-x;
}
.section__edge--bottom::after {
  -webkit-mask: url('../../effects/assets/hoja-sombra-abajo.svg') var(--blend-shift, 0px) 0 / auto
    100% repeat-x;
  mask: url('../../effects/assets/hoja-sombra-abajo.svg') var(--blend-shift, 0px) 0 / auto 100%
    repeat-x;
}
/* Línea fina por dentro del panel (como el filo de una tarjeta de papelería). */
.section--panel::after {
  content: '';
  position: absolute;
  inset: 0.4rem;
  border: var(--panel-border);
  border-radius: calc(var(--panel-radius) - 0.4rem);
  pointer-events: none;
}
.section--has-bg {
  overflow: hidden;
}
.section__bg {
  position: absolute;
  inset: 0;
  background-image: var(--section-bg-image);
  background-size: var(--section-bg-size, cover);
  background-repeat: var(--section-bg-repeat, no-repeat);
  background-position: center;
}
/* "fijo": el fondo se queda quieto mientras el contenido pasa (sin background-attachment: fixed, que falla en iOS) */
.section--sticky-bg {
  clip-path: inset(0 round var(--panel-radius));
}
.section--sticky-bg:not(.section--panel) {
  clip-path: inset(0);
}
.section--sticky-bg .section__bg {
  position: fixed;
}
.section__tint,
.section__tint-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.section__sparkles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.section__overlay {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / var(--section-overlay, 0));
}
/*
 * El contenido es un contenedor ("section"): las secciones se miden con cqi contra su
 * propio ancho, no contra la pantalla. Así se ven igual en un celular que en media fila
 * de escritorio.
 */
.section__content {
  position: relative;
  container: section / inline-size;
  width: 100%;
  max-width: var(--section-content-width, var(--section-max-width));
  margin-inline: auto;
}
</style>
