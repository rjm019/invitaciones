<script setup lang="ts">
import { computed, ref } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { decorOr } from '@/services/decorService'
import { otherGroups } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Bendición en medallón (`medallon`): un óvalo crema con doble filete del color del listón
 * (una línea y, a unos milímetros, otra más fina) y un moñito de línea arriba, montado sobre
 * el filete, que se dibuja al llegar: primero el nudo y luego los lazos y las colas, con
 * opacity y scale. Dentro, el mensaje y los grupos (papás, padrinos, abuelos…) con su etiqueta
 * manuscrita y los nombres en serif. Si la lista es larga, el óvalo se alarga como píldora
 * vertical en lugar de recortar texto. Ramitas chicas a los lados del pie. Con "menos
 * movimiento" el moñito ya está dibujado. Sirve en cualquier tema: el filete y el moño salen
 * del primario de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset, sections } = useEvent()

// Si la portada ya es el sobre de papelería (que lleva a los papás), aquí van solo los demás.
const coverShowsParents = computed(() =>
  (sections?.value ?? []).some((s) => s.type === 'hero-envelope' && s.variant === 'sobre-lacre'),
)
const groups = computed(() =>
  coverShowsParents.value ? otherGroups(event.value.family) : event.value.family,
)
const long = computed(
  () => groups.value.length > 2 || (props.section.text ?? '').length > 150,
)
const sprig = computed(() => {
  const own = decorOr(props.section.decor, 'sprig', null)
  if (own) return own
  if ('sprig' in props.section.decor) return null
  return resolveAsset.value('ramita.svg')
})

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { threshold: 0.35 })
</script>

<template>
  <div ref="root" class="bm" :class="{ 'is-in': inView, 'bm--long': long }">
    <div class="bm__oval">
      <svg class="bm__bow" viewBox="0 4 120 66" aria-hidden="true" focusable="false">
        <g class="bm__part bm__part--knot-back">
          <ellipse cx="60" cy="33" rx="12" ry="11" class="bm__paper" />
        </g>
        <g class="bm__part bm__part--loop-l">
          <path d="M60 30C48 14 22 8 10 16C4 24 10 38 26 42C40 46 54 38 60 32Z" class="bm__paper bm__line" />
          <path d="M28 20C38 20 50 26 56 30" class="bm__line bm__line--thin" />
        </g>
        <g class="bm__part bm__part--loop-r">
          <path d="M60 30C72 14 98 8 110 16C116 24 110 38 94 42C80 46 66 38 60 32Z" class="bm__paper bm__line" />
          <path d="M92 20C82 20 70 26 64 30" class="bm__line bm__line--thin" />
        </g>
        <g class="bm__part bm__part--tail-l">
          <path d="M56 38C52 50 46 58 38 66M52 60L36 62" class="bm__line" />
        </g>
        <g class="bm__part bm__part--tail-r">
          <path d="M64 38C68 50 74 58 82 66M68 60L84 62" class="bm__line" />
        </g>
        <g class="bm__part bm__part--knot">
          <ellipse cx="60" cy="33" rx="6.5" ry="7.5" class="bm__knot" />
          <path d="M57 30C59 28 62 28 63 30" class="bm__gloss" />
        </g>
      </svg>

      <div class="bm__body">
        <p v-if="section.subtitle" class="bm__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
        <h2 v-if="section.title" class="bm__title" data-text="title">
          <FxText :text="section.title" :effects="section.effects" />
        </h2>
        <p v-if="section.text" class="bm__text" data-text="text">{{ section.text }}</p>

        <div v-if="groups.length" class="bm__groups">
          <div v-for="(group, i) in groups" :key="i" class="bm__group">
            <p class="bm__role" data-text="role">{{ group.role }}</p>
            <p class="bm__names" data-text="names">
              <span v-for="(n, j) in group.names" :key="j">{{ n }}</span>
            </p>
          </div>
        </div>

        <div v-if="sprig" class="bm__foot" aria-hidden="true">
          <img :src="sprig" alt="" class="bm__sprig" loading="lazy" />
          <span class="bm__dot" />
          <img :src="sprig" alt="" class="bm__sprig bm__sprig--r" loading="lazy" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bm {
  --bm-line: var(--color-primary);
  --bm-line-soft: color-mix(in srgb, var(--color-primary) 55%, var(--color-paper, #fdf8f0));
  container-type: inline-size;
  max-width: 24rem;
  margin: 0 auto;
  /* Lugar para el moñito, que sobresale del filete. */
  padding-top: 2.4rem;
}
.bm__oval {
  position: relative;
  /* Óvalo: más alto que ancho aunque tenga poco texto. */
  min-height: 30rem;
  display: grid;
  align-items: center;
  border: 1.5px solid var(--bm-line);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 0.7), transparent 60%),
    var(--color-paper, #fdf8f0);
  box-shadow:
    0 1.1rem 1.8rem -1.2rem color-mix(in srgb, var(--color-primary) 55%, transparent),
    inset 0 0 1.4rem color-mix(in srgb, var(--color-primary) 10%, transparent);
}
/* El segundo filete, más fino, a unos milímetros del borde. */
.bm__oval::before {
  content: '';
  position: absolute;
  inset: 0.5rem;
  border: 1px solid var(--bm-line-soft);
  border-radius: inherit;
  pointer-events: none;
}
/* Lista larga: píldora vertical con extremos redondos. */
.bm--long .bm__oval {
  min-height: 0;
  border-radius: 999px;
}
.bm__body {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  padding: 3.6rem 2.2rem 3.2rem;
  text-align: center;
}
.bm--long .bm__body {
  padding: 4.6rem 2rem 3.8rem;
}

/* Con la guirnalda de moño de la sección (`garland`), el moñito de línea sobra: un solo moño por sección. */
:global(.fx-garland .bm__bow) {
  display: none;
}
/* El moñito de línea: sobre el filete de arriba, centrado. */
.bm__bow {
  position: absolute;
  left: 50%;
  top: 0;
  z-index: 1;
  width: 6.4rem;
  translate: -50% -58%;
  overflow: visible;
}
.bm__paper {
  fill: var(--color-paper, #fdf8f0);
  stroke: none;
}
.bm__line {
  fill: var(--color-paper, #fdf8f0);
  stroke: var(--bm-line);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.bm__line--thin {
  fill: none;
  stroke-width: 1;
}
.bm__part:not(.bm__part--loop-l, .bm__part--loop-r, .bm__part--knot-back) .bm__line {
  fill: none;
}
.bm__knot {
  fill: var(--color-primary-soft, #f3d3d8);
  stroke: var(--bm-line);
  stroke-width: 1.6;
}
.bm__gloss {
  fill: none;
  stroke: #fff;
  stroke-width: 1.4;
  stroke-linecap: round;
}
/* Cada parte aparece con opacity y scale desde el nudo, una tras otra. */
.bm__part {
  transform-origin: 60px 33px;
  opacity: 0;
  scale: 0.5;
  transition:
    opacity calc(0.5s * var(--motion-scale)) ease var(--d, 0s),
    scale calc(0.7s * var(--motion-scale)) cubic-bezier(0.3, 1.4, 0.5, 1) var(--d, 0s);
}
.bm__part--knot-back,
.bm__part--knot {
  --d: 0s;
}
.bm__part--loop-l {
  --d: calc(0.35s * var(--motion-scale));
}
.bm__part--loop-r {
  --d: calc(0.5s * var(--motion-scale));
}
.bm__part--tail-l {
  --d: calc(0.7s * var(--motion-scale));
}
.bm__part--tail-r {
  --d: calc(0.82s * var(--motion-scale));
}
.bm.is-in .bm__part {
  opacity: 1;
  scale: 1;
}

.bm__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-oro, var(--color-primary)));
}
.bm__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(2rem, 9cqi, 2.6rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
.bm__text {
  max-width: 24ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.05rem, 4.6cqi, 1.25rem) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.bm__groups {
  display: grid;
  gap: 1rem;
  width: 100%;
  margin-top: 0.3rem;
}
.bm__role {
  margin: 0 0 0.1rem;
  font-family: var(--t-role-font, var(--font-script-mono, var(--font-script)));
  font-size: calc(1.5rem * var(--t-role-size, 1));
  line-height: 1.1;
  color: var(--t-role-color, var(--color-primary-strong, var(--color-primary)));
}
.bm__names {
  display: grid;
  margin: 0;
  font-family: var(--t-names-font, var(--font-serif));
  font-weight: 600;
  font-size: calc(1.1rem * var(--t-names-size, 1));
  line-height: 1.35;
  color: var(--t-names-color, var(--color-text));
  overflow-wrap: anywhere;
}
.bm__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.2rem;
}
.bm__sprig {
  width: 3rem;
  height: auto;
  rotate: -8deg;
}
.bm__sprig--r {
  scale: -1 1;
  rotate: 8deg;
}
.bm__dot {
  width: 0.35rem;
  height: 0.35rem;
  rotate: 45deg;
  background: var(--color-oro, var(--bm-line));
}

@media (prefers-reduced-motion: reduce) {
  .bm__part {
    opacity: 1;
    scale: 1;
    transition: none;
  }
}
</style>
