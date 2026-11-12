<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Guirnalda de listón en acuarela, apaisada (mide el ancho de su contenedor): un moño grande al
 * centro, de lazos anchos y caídos, del que salen dos listones que cuelgan en guirnalda hacia
 * cada lado; en la esquina dan una vuelta y cuelgan en un rizo con la punta en V. A lo largo de
 * cada listón corre una rama de hojas lanceoladas con nervadura y racimos de bayas, y en el
 * extremo derecho hay una margarita. Cada trazo son lavados translúcidos superpuestos (donde el
 * listón se cruza consigo mismo se ve más intenso) y el grano viene de un filtro estático, nunca
 * animado. Con `tied` en falso solo se ve el nudo; al pasar a verdadero crecen los lazos, los
 * listones se despliegan del centro hacia los lados y al final brotan las hojas y las bayas,
 * escalonadas. Con `sway` cada lado se mece apenas desde el nudo, los rizos se balancean y cada
 * hoja tiembla a destiempo. `size`: `md` normal o `lg` (más alto, para la portada). `tone`
 * pisa el color del listón. Solo transform, opacity y las propiedades individuales scale y
 * rotate; con "menos movimiento" queda atada y quieta. Color: `--bow-color`, `--bow-color-dark`
 * y `--bow-color-soft` (respaldo en `--color-primary`, `-strong`, `-soft`), hojas en
 * `--color-accent`, margarita en `--color-paper` y `--color-mantequilla`. Sirve en cualquier tema.
 */
const props = withDefaults(
  defineProps<{ tied?: boolean; sway?: boolean; size?: 'md' | 'lg'; tone?: string }>(),
  { tied: true, sway: false, size: 'md', tone: undefined },
)

const fid = `rg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.tone) {
    s['--bow-color'] = props.tone
    s['--bow-color-dark'] = `color-mix(in srgb, ${props.tone} 68%, #3f3550)`
    s['--bow-color-soft'] = `color-mix(in srgb, ${props.tone} 36%, #fff)`
  }
  return s
})

// `lg` estira el dibujo hacia abajo (los listones cuelgan más); el nudo y los lazos no cambian.
const K = computed(() => (props.size === 'lg' ? 1.5 : 1))
const BASE_H = 380
const KNOT_Y = 118
const H = computed(() => Math.round(KNOT_Y + (BASE_H - KNOT_Y) * K.value))
const Y = (y: number) => (y <= KNOT_Y ? y : Math.round((KNOT_Y + (y - KNOT_Y) * K.value) * 10) / 10)
const P = (pts: number[]) => pts.map((v, i) => (i % 2 ? Y(v) : v)).join(' ')

// Listón del lado izquierdo (el derecho es el mismo, volteado): del nudo a la esquina, y el rizo.
const mainD = computed(() => `M484 ${Y(128)} C${P([432, 188, 342, 230, 260, 220])} C${P([180, 210, 142, 176, 106, 170])}`)
const curlD = computed(
  () =>
    `M106 ${Y(170)} C${P([70, 164, 36, 182, 36, 214])} C${P([36, 244, 82, 252, 94, 220])} C${P([104, 192, 70, 176, 54, 200])} C${P([44, 216, 54, 242, 58, 266])} C${P([62, 292, 38, 306, 44, 334])}`,
)
// La punta en V cuelga del final del rizo.
const tailT = computed(() => `translate(44 ${Y(334)}) rotate(4)`)

// Rama de hojas: curvas cúbicas que siguen al listón por arriba (puntos en el dibujo base).
type Pt = [number, number]
type Seg = [Pt, Pt, Pt, Pt]
const STEM: Seg[] = [
  [[432, 176], [392, 196], [330, 206], [262, 198]],
  [[262, 198], [184, 188], [146, 154], [108, 148]],
  [[108, 148], [72, 142], [44, 156], [30, 184]],
]
const bez = (s: Seg, t: number): Pt => {
  const u = 1 - t
  const f = (i: 0 | 1) =>
    u * u * u * s[0][i] + 3 * u * u * t * s[1][i] + 3 * u * t * t * s[2][i] + t * t * t * s[3][i]
  return [f(0), f(1)]
}
const bezAngle = (s: Seg, t: number): number => {
  const u = 1 - t
  const d = (i: 0 | 1) =>
    3 * u * u * (s[1][i] - s[0][i]) + 6 * u * t * (s[2][i] - s[1][i]) + 3 * t * t * (s[3][i] - s[2][i])
  return (Math.atan2(d(1), d(0)) * 180) / Math.PI
}
const along = (u: number) => {
  const g = Math.min(0.9999, Math.max(0, u)) * STEM.length
  const i = Math.floor(g)
  return { seg: STEM[i], t: g - i }
}
const stemD = computed(
  () =>
    `M${STEM[0][0][0]} ${Y(STEM[0][0][1])} ` +
    STEM.map((s) => `C${P([s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]])}`).join(' '),
)

interface Leaf {
  x: number
  y: number
  rot: number
  s: number
  i: number
}
interface Sprig {
  x: number
  y: number
  rot: number
  i: number
}
const LEAF_AT = [0.05, 0.14, 0.23, 0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.85, 0.93]
const foliage = computed(() => {
  const leaves: Leaf[] = []
  const sprigs: Sprig[] = []
  LEAF_AT.forEach((u, j) => {
    const { seg, t } = along(u)
    const [x, y] = bez(seg, t)
    const a = bezAngle(seg, t) + 180 // la rama se recorre del nudo hacia la esquina (hacia la izquierda)
    const size = 1.3 - j * 0.04
    // Hojas pareadas: una a cada lado de la rama, la de abajo un poco más atrás.
    leaves.push({ x, y: Y(y), rot: a - 48 + (j % 2) * 8, s: size, i: j * 2 })
    leaves.push({ x, y: Y(y), rot: a + 50 - (j % 2) * 6, s: size * 0.94, i: j * 2 + 1 })
  })
  for (const [n, u] of [0.38, 0.72].entries()) {
    const { seg, t } = along(u)
    const [x, y] = bez(seg, t)
    sprigs.push({ x, y: Y(y), rot: bezAngle(seg, t) + 180 + (n ? 62 : -64), i: 22 + n * 2 })
  }
  // Punta de la rama: una hoja terminal y un racimo de bayas.
  const end = STEM[STEM.length - 1]
  leaves.push({ x: end[3][0], y: Y(end[3][1]), rot: bezAngle(end, 1) + 180 - 8, s: 1, i: 21 })
  sprigs.push({ x: end[3][0], y: Y(end[3][1]), rot: bezAngle(end, 1) + 180 + 34, i: 26 })
  return { leaves, sprigs }
})

const wag = (i: number, side: 'l' | 'r') => ({
  '--i': String(i),
  '--wd': `${3.2 + ((i * 7) % 5) * 0.45}s`,
  '--wl': `${-(((i * 5) % 7) * 0.6) - (side === 'r' ? 1.3 : 0)}s`,
})

const LEAF = 'M0 0C6 -8 22 -10 34 0C22 9 6 8 0 0Z'
const LEAF_BACK = 'M0 0C8 1 24 3 34 0C22 9 6 8 0 0Z'
const LEAF_VEINS = 'M7 0.2H30M12 0C14 -3 17 -4.4 20 -4.8M12 0C14 3 17 4.2 20 4.6M21 0C23 -2.4 25 -3.2 27 -3.4M21 0C23 2.4 25 3 27 3.2'
// Cada lazo es una banda de listón abierta (se ve el fondo por dentro), no una mancha.
const LOOP_BAND =
  'M492 124C470 52 404 14 340 34C276 54 244 120 276 160C308 198 404 176 490 140'
const TAIL = 'M490 140C470 188 440 228 410 262'
const loops = [
  { key: 'l', t: '' },
  { key: 'r', t: 'translate(1000 0) scale(-1 1) rotate(3 500 118)' },
]
const sides = [
  { key: 'l', t: '' },
  { key: 'r', t: 'translate(1000 0) scale(-1 1)' },
]
const DAISY_PETALS = Array.from({ length: 12 }, (_, i) => i * 30)
</script>

<template>
  <div
    class="rg"
    :class="[{ 'is-tied': tied, 'is-sway': sway }, `rg--${size}`]"
    :style="rootStyle"
    aria-hidden="true"
  >
    <svg :viewBox="`0 0 1000 ${H}`" focusable="false">
      <defs>
        <filter :id="fid" filterUnits="userSpaceOnUse" x="-60" y="-60" width="1120" :height="H + 120">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
      </defs>

      <!-- lazos -->
      <g v-for="l in loops" :key="l.key" class="rg__loop" :class="`rg__loop--${l.key}`">
        <g class="rg__loop-sway">
          <g :transform="l.t || undefined">
            <g :filter="`url(#${fid})`">
              <path class="rim" :d="LOOP_BAND" />
              <path class="band" :d="LOOP_BAND" />
              <path class="band band--2" transform="translate(3 4)" :d="LOOP_BAND" />
              <path class="sheen" transform="translate(-3 -5)" :d="LOOP_BAND" />
              <path class="rim" :d="TAIL" />
              <path class="band" :d="TAIL" />
              <path class="band band--2" transform="translate(2 3)" :d="TAIL" />
              <path class="sheen" transform="translate(-3 -4)" :d="TAIL" />
              <g transform="translate(410 262) rotate(40)">
                <path class="rim rim--fill" d="M-13 -3L13 -3L14 44L0 31L-14 44Z" />
                <path class="band band--fill" d="M-12 -3L12 -3L12 42L0 30L-12 42Z" />
              </g>
            </g>
          </g>
        </g>
      </g>

      <!-- cada lado: listón en guirnalda, rama de hojas y rizo; sale del nudo y se despliega -->
      <g v-for="s in sides" :key="s.key" class="rg__side" :class="`rg__side--${s.key}`">
        <g class="rg__sway">
          <g :transform="s.t || undefined">
            <g :filter="`url(#${fid})`">
              <g class="rg__ribbon">
                <path class="rim" :d="mainD" />
                <path class="band" :d="mainD" />
                <path class="band band--2" transform="translate(2 3)" :d="mainD" />
                <path class="sheen" transform="translate(-3 -4)" :d="mainD" />
              </g>
            </g>

            <!-- rizo de la esquina: se balancea desde donde se une al listón -->
            <g class="rg__curl" :style="{ transformOrigin: `106px ${Y(170)}px` }">
              <g :filter="`url(#${fid})`">
                <g class="rg__ribbon">
                  <path class="rim" :d="curlD" />
                  <path class="band" :d="curlD" />
                  <path class="band band--2" transform="translate(2 3)" :d="curlD" />
                  <path class="sheen" transform="translate(-3 -4)" :d="curlD" />
                </g>
                <g :transform="tailT">
                  <path class="rim rim--fill" d="M-13 -3L13 -3L14 44L0 31L-14 44Z" />
                  <path class="band band--fill" d="M-12 -3L12 -3L12 42L0 30L-12 42Z" />
                  <path class="crease" d="M-6 -2V32M6 -2V32" />
                </g>
              </g>
            </g>

            <!-- rama de hojas con nervadura y racimos de bayas -->
            <g class="rg__foliage">
              <path class="stem" :d="stemD" :filter="`url(#${fid})`" />
              <g
                v-for="(p, n) in foliage.sprigs"
                :key="`s${n}`"
                :transform="`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(1.6)`"
              >
                <g class="rg__leaf" :style="wag(p.i, s.key as 'l' | 'r')" :filter="`url(#${fid})`">
                  <g class="rg__wag">
                    <path class="stem stem--thin" d="M0 0C8 -5 18 -7 28 -5" />
                    <path class="stem stem--thin" d="M19 -6.4C21 -12 25 -15 30 -16" />
                    <circle class="berry" cx="28" cy="-5" r="6.4" />
                    <circle class="berry berry--2" cx="34" cy="-14" r="5.4" />
                    <circle class="berry" cx="22" cy="-15" r="5" />
                    <circle class="berry berry--2" cx="38" cy="-4" r="4.2" />
                    <circle class="glint" cx="26.4" cy="-7" r="1.6" />
                    <circle class="glint" cx="32.6" cy="-16" r="1.4" />
                    <circle class="glint" cx="20.6" cy="-17" r="1.3" />
                  </g>
                </g>
              </g>
              <g
                v-for="(l, n) in foliage.leaves"
                :key="`l${n}`"
                :transform="`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`"
              >
                <g class="rg__leaf" :style="wag(l.i, s.key as 'l' | 'r')" :filter="`url(#${fid})`">
                  <g class="rg__wag">
                    <path class="leaf" :d="LEAF" />
                    <path class="leaf leaf--back" :d="LEAF_BACK" />
                    <path class="leaf-edge" :d="LEAF" />
                    <path class="vein" :d="LEAF_VEINS" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      <!-- margarita del extremo derecho -->
      <g class="rg__daisy-pos" :transform="`translate(962 ${Y(190)})`">
        <g class="rg__daisy" :filter="`url(#${fid})`">
          <g class="rg__daisy-sway">
            <ellipse
              v-for="a in DAISY_PETALS"
              :key="a"
              class="petal"
              cx="0"
              cy="-27"
              rx="10"
              ry="22"
              :transform="`rotate(${a})`"
            />
            <ellipse
              v-for="a in DAISY_PETALS"
              :key="`s${a}`"
              class="petal-shade"
              cx="0"
              cy="-14"
              rx="4"
              ry="9"
              :transform="`rotate(${a + 15})`"
            />
            <circle class="eye" r="11" />
            <circle class="eye-glint" cx="-3" cy="-3.6" r="3.4" />
          </g>
        </g>
      </g>

      <!-- nudo -->
      <g class="rg__knot">
        <g :filter="`url(#${fid})`">
          <path class="rim rim--fill" d="M473 100C485 88 515 88 527 100C535 114 533 138 525 148C513 158 487 158 475 148C467 136 467 114 473 100Z" />
          <path class="band band--fill" d="M474 101C486 90 514 90 526 101C533 114 531 137 524 147C512 156 488 156 476 147C469 135 469 114 474 101Z" />
          <path class="shade" d="M526 104C533 118 531 138 524 147C512 156 490 156 480 149C500 150 518 142 526 104Z" />
          <path class="crease" d="M483 98C479 114 479 134 485 150M497 92C493 114 494 136 499 154M512 92C510 114 512 134 516 152" />
          <path class="gloss gloss--knot" d="M481 106C486 98 498 95 512 96" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.rg {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_cool: color-mix(in srgb, var(--_bow-dark) 38%, #8a7a8e);
  --_leaf: var(--color-accent, #7f9a76);
  --_leaf-dark: color-mix(in srgb, var(--_leaf) 62%, #2c3a2e);
  --_paper: var(--color-paper, #fdf8f0);
  display: block;
  width: 100%;
}
.rg svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Pintura: borde de pigmento más oscuro, lavados translúcidos encima y luces en blanco. */
.rim {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.3;
  stroke-width: 25;
  stroke-linejoin: round;
}
.rim--fill {
  fill: var(--_bow-dark);
  fill-opacity: 0.3;
  stroke: none;
}
.band {
  fill: none;
  stroke: var(--_bow);
  stroke-opacity: 0.5;
  stroke-width: 20;
  stroke-linejoin: round;
}
.band--2 {
  stroke-opacity: 0.24;
  stroke-width: 20;
}
.band--wide {
  stroke-width: 34;
  stroke-opacity: 0.14;
}
.band--fill {
  fill: var(--_bow);
  fill-opacity: 0.52;
  stroke: none;
}
.band--fill.band--2 {
  fill-opacity: 0.26;
}
.sheen {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.55;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 90 40 30 36;
}
.back {
  fill: var(--_bow-soft);
  fill-opacity: 0.85;
}
.shade {
  fill: var(--_cool);
  fill-opacity: 0.26;
}
.edge {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.3;
  stroke-width: 1;
}
.pleat {
  fill: var(--_bow-dark);
  fill-opacity: 0.2;
}
.crease {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.32;
  stroke-width: 1.3;
  stroke-linecap: round;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.62;
  stroke-width: 3.4;
  stroke-linecap: round;
}
.gloss--low {
  stroke-opacity: 0.38;
  stroke-width: 2.4;
}
.gloss--knot {
  stroke-opacity: 0.7;
  stroke-width: 2.8;
}

/* Rama, hojas y bayas */
.stem {
  fill: none;
  stroke: var(--_leaf-dark);
  stroke-opacity: 0.75;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.stem--thin {
  stroke-width: 1.6;
}
.leaf {
  fill: var(--_leaf);
  fill-opacity: 0.62;
}
.leaf--back {
  fill: var(--_leaf-dark);
  fill-opacity: 0.28;
}
.leaf-edge {
  fill: none;
  stroke: var(--_leaf-dark);
  stroke-opacity: 0.5;
  stroke-width: 0.9;
  stroke-linejoin: round;
}
.vein {
  fill: none;
  stroke: var(--_leaf-dark);
  stroke-opacity: 0.6;
  stroke-width: 0.9;
  stroke-linecap: round;
}
.berry {
  fill: var(--_bow);
  fill-opacity: 0.68;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.4;
  stroke-width: 0.9;
}
.berry--2 {
  fill: color-mix(in srgb, var(--_bow) 60%, var(--_bow-soft));
}
.glint {
  fill: #fff;
  fill-opacity: 0.85;
}

/* Margarita */
.petal {
  fill: var(--_paper);
  stroke: var(--_cool);
  stroke-opacity: 0.35;
  stroke-width: 1;
}
.petal-shade {
  fill: var(--_cool);
  fill-opacity: 0.12;
}
.eye {
  fill: var(--color-mantequilla, var(--color-oro, #e8c872));
  stroke: var(--color-oro, #b8925a);
  stroke-opacity: 0.6;
  stroke-width: 1.2;
}
.eye-glint {
  fill: #fff;
  fill-opacity: 0.55;
}

/* Cada pieza crece o se mece desde su apoyo (px del dibujo). */
.rg__side,
.rg__sway,
.rg__curl,
.rg__loop,
.rg__loop-sway,
.rg__knot,
.rg__daisy,
.rg__daisy-sway {
  transform-box: view-box;
}
.rg__side,
.rg__sway,
.rg__loop,
.rg__loop-sway,
.rg__knot {
  transform-origin: 500px 118px;
}
.rg__daisy,
.rg__daisy-sway {
  transform-origin: 0 0;
}
.rg__leaf,
.rg__wag {
  transform-box: fill-box;
  transform-origin: 0% 50%;
}

/* Desatado: solo el nudo, chico. */
.rg__loop {
  transform: scale(0.04);
  opacity: 0;
  transition:
    transform calc(0.35s * var(--motion-scale, 1)) ease-in,
    opacity calc(0.25s * var(--motion-scale, 1)) ease-in;
}
.rg__side {
  transform: scaleX(0.05);
  opacity: 0;
  transition:
    transform calc(0.3s * var(--motion-scale, 1)) ease-in,
    opacity calc(0.2s * var(--motion-scale, 1)) ease-in;
}
.rg__knot {
  transform: scale(0.6);
  transition: transform calc(0.45s * var(--motion-scale, 1)) cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rg__leaf {
  scale: 0.15;
  opacity: 0;
  transition:
    scale calc(0.5s * var(--motion-scale, 1)) cubic-bezier(0.3, 1.5, 0.5, 1),
    opacity calc(0.3s * var(--motion-scale, 1)) ease-out;
}
.rg__daisy {
  scale: 0;
  rotate: -40deg;
  transition:
    scale calc(0.7s * var(--motion-scale, 1)) cubic-bezier(0.3, 1.5, 0.5, 1),
    rotate calc(0.7s * var(--motion-scale, 1)) ease-out;
}

/* Atado: lazos con rebote, luego los listones se despliegan hacia los lados y brotan las hojas. */
.is-tied .rg__loop,
.is-tied .rg__side,
.is-tied .rg__knot {
  transform: none;
  opacity: 1;
}
.is-tied .rg__loop {
  transition:
    transform calc(0.9s * var(--motion-scale, 1)) cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity calc(0.3s * var(--motion-scale, 1)) ease-out;
}
.is-tied .rg__loop--r {
  transition-delay: calc(0.12s * var(--motion-scale, 1));
}
.is-tied .rg__side {
  transition:
    transform calc(1.3s * var(--motion-scale, 1)) cubic-bezier(0.25, 0.9, 0.35, 1),
    opacity calc(0.4s * var(--motion-scale, 1)) ease-out;
  transition-delay: calc(0.5s * var(--motion-scale, 1));
}
.is-tied .rg__side--r {
  transition-delay: calc(0.62s * var(--motion-scale, 1));
}
.is-tied .rg__leaf {
  scale: 1;
  opacity: 1;
  transition-delay: calc((1.5s + var(--i, 0) * 0.07s) * var(--motion-scale, 1));
}
.is-tied .rg__daisy {
  scale: 1;
  rotate: 0deg;
  transition-delay: calc(2.4s * var(--motion-scale, 1));
}
.is-tied .rg__knot {
  transition-delay: calc(0.05s * var(--motion-scale, 1));
}

/* Vaivén: cada lado desde el nudo, el rizo desde la esquina y cada hoja a destiempo. */
.is-sway.is-tied .rg__side--l .rg__sway {
  animation: rg-sway-l calc(5.2s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-sway.is-tied .rg__side--r .rg__sway {
  animation: rg-sway-r calc(6s * var(--motion-scale, 1)) ease-in-out infinite alternate;
  animation-delay: calc(-1.7s * var(--motion-scale, 1));
}
.is-sway.is-tied .rg__curl {
  animation: rg-curl calc(3.8s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-sway.is-tied .rg__side--r .rg__curl {
  animation-duration: calc(4.4s * var(--motion-scale, 1));
  animation-delay: calc(-1.2s * var(--motion-scale, 1));
}
.is-sway.is-tied .rg__loop--l .rg__loop-sway {
  animation: rg-breathe calc(5s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-sway.is-tied .rg__loop--r .rg__loop-sway {
  animation: rg-breathe calc(5.6s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}
.is-sway.is-tied .rg__wag {
  animation: rg-wag calc(var(--wd, 3.6s) * var(--motion-scale, 1)) ease-in-out infinite alternate;
  animation-delay: calc(var(--wl, 0s) * var(--motion-scale, 1));
}
.is-sway.is-tied .rg__daisy-sway {
  animation: rg-daisy calc(6.4s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}

@keyframes rg-sway-l {
  from {
    transform: rotate(-1.4deg);
  }
  to {
    transform: rotate(1.1deg);
  }
}
@keyframes rg-sway-r {
  from {
    transform: rotate(1.4deg);
  }
  to {
    transform: rotate(-1.1deg);
  }
}
@keyframes rg-curl {
  from {
    transform: rotate(-3.4deg);
  }
  to {
    transform: rotate(3.4deg);
  }
}
@keyframes rg-breathe {
  from {
    transform: rotate(-1.4deg) scale(1);
  }
  to {
    transform: rotate(1.4deg) scale(1.025);
  }
}
@keyframes rg-wag {
  from {
    transform: rotate(-5deg);
  }
  to {
    transform: rotate(5deg);
  }
}
@keyframes rg-daisy {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(4deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rg__loop,
  .rg__side,
  .rg__knot,
  .rg__leaf,
  .rg__daisy {
    transition: none !important;
  }
  .rg__sway,
  .rg__curl,
  .rg__loop-sway,
  .rg__wag,
  .rg__daisy-sway {
    animation: none !important;
  }
}
</style>
