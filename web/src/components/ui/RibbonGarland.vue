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
const BASE_H = 350
const KNOT_Y = 150
const H = computed(() => Math.round(KNOT_Y + (BASE_H - KNOT_Y) * K.value))
const Y = (y: number) => (y <= KNOT_Y ? y : Math.round((KNOT_Y + (y - KNOT_Y) * K.value) * 10) / 10)
const P = (pts: number[]) => pts.map((v, i) => (i % 2 ? Y(v) : v)).join(' ')

type Pt = [number, number]
type Seg = [Pt, Pt, Pt, Pt]
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
// El mismo dibujo con la Y estirada (solo cambia en `lg`).
const stretch = (segs: Seg[]): Seg[] => segs.map((s) => s.map(([x, y]) => [x, Y(y)]) as Seg)

// Listón plano: una forma cerrada que sigue la línea central y se angosta (`pinch`) donde se tuerce;
// con `notch` la punta lleva el corte en V.
const strip = (segs: Seg[], w0: number, w1: number, notch = 0, pinch = 0): string => {
  const S = stretch(segs)
  const per = 16
  const total = S.length * per
  const left: string[] = []
  const right: string[] = []
  let end = ''
  for (let k = 0; k <= total; k++) {
    const i = Math.min(S.length - 1, Math.floor(k / per))
    const t = k === total ? 1 : (k % per) / per
    const [x, y] = bez(S[i], t)
    const a = (bezAngle(S[i], t) * Math.PI) / 180
    const u = k / total
    const w = (w0 + (w1 - w0) * u) * (1 - pinch * Math.sin(Math.PI * u)) * 0.5
    const nx = Math.sin(a)
    const ny = -Math.cos(a)
    left.push(`${(x + nx * w).toFixed(1)} ${(y + ny * w).toFixed(1)}`)
    right.push(`${(x - nx * w).toFixed(1)} ${(y - ny * w).toFixed(1)}`)
    if (k === total) end = `${(x - Math.cos(a) * notch).toFixed(1)} ${(y - Math.sin(a) * notch).toFixed(1)}`
  }
  return `M${left.join('L')}${notch ? `L${end}` : ''}L${right.reverse().join('L')}Z`
}
const centerD = (segs: Seg[]) => {
  const S = stretch(segs)
  return `M${S[0][0].join(' ')} ` + S.map((s) => `C${s[1].join(' ')} ${s[2].join(' ')} ${s[3].join(' ')}`).join(' ')
}

// Listón del lado izquierdo (el derecho es el mismo, volteado): sale de detrás del nudo, cuelga en
// catenaria hasta la esquina, ahí se dobla y cuelga una cola ondulada con la punta en V.
const GARLAND: Seg[] = [
  [[488, 152], [436, 196], [366, 266], [282, 256]],
  [[282, 256], [200, 246], [150, 176], [98, 138]],
]
const CORNER_TAIL: Seg[] = [
  [[86, 138], [56, 196], [124, 232], [92, 284]],
  [[92, 284], [70, 316], [102, 330], [86, 344]],
]
const CENTER_TAIL: Seg[] = [[[490, 164], [502, 214], [534, 248], [550, 308]]]
const garlandD = computed(() => strip(GARLAND, 66, 54, 0, 0.1))
const garlandSheen = computed(() => centerD(GARLAND))
const cornerTailD = computed(() => strip(CORNER_TAIL, 54, 46, 20, 0.12))
const cornerTailSheen = computed(() => centerD(CORNER_TAIL))
const centerTailD = computed(() => strip(CENTER_TAIL, 48, 42, 18, 0.06))
const CORNER = { x: 98, y: 138 }
// Doblez de la esquina: el triángulo del revés, más oscuro.
const foldD = computed(() => `M112 113L60 128L${CORNER.x} ${Y(154)}Z`)

// Lazo: banda ancha que sube y sale del nudo, da la vuelta y regresa (el revés va más oscuro).
const LOOP_OUTER =
  'M484 144C470 70 410 -2 330 4C240 10 166 56 154 116C144 172 210 204 292 198C372 192 440 164 490 150Z'
const LOOP_INNER =
  'M468 142C454 92 410 50 340 52C276 54 222 84 212 122C206 156 252 152 306 144C372 136 430 138 474 150Z'
const LOOP = `${LOOP_OUTER}${LOOP_INNER}`
const LOOP_BACK =
  'M154 116C144 172 210 204 292 198C372 192 440 164 490 150L474 150C430 138 372 136 306 144C252 152 206 156 212 122Z'
const LOOP_PLEATS =
  'M488 144L452 84L462 82ZM488 146L440 110L448 104ZM489 150L432 134L434 144ZM490 152L436 168L444 174Z'
const LOOP_SHEEN = 'M462 112C430 52 380 24 316 26'
const GARLAND_PLEATS = 'M488 152L450 162L452 172ZM490 156L444 186L456 192ZM490 160L460 206L470 204Z'

// Rama de hojas: curvas cúbicas por encima del listón (puntos en el dibujo base).
const STEM: Seg[] = [
  [[470, 152], [410, 174], [340, 200], [270, 196]],
  [[270, 196], [200, 192], [150, 150], [100, 118]],
  [[100, 118], [76, 104], [54, 100], [30, 104]],
]
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
const PAIRS = 11
const foliage = computed(() => {
  const leaves: Leaf[] = []
  const sprigs: Sprig[] = []
  for (let j = 0; j < PAIRS; j++) {
    const u = 0.03 + (j / (PAIRS - 1)) * 0.93
    const { seg, t } = along(u)
    const [x, y] = bez(seg, t)
    const a = bezAngle(seg, t) + 180 // la rama se recorre del nudo hacia la esquina (hacia la izquierda)
    // Hojas pareadas de tamaños distintos, una a cada lado de la rama.
    const size = (1.5 + ((j * 3) % 4) * 0.14) * (1 - u * 0.2)
    leaves.push({ x, y: Y(y), rot: a - 46 + (j % 2) * 9, s: size, i: j * 2 })
    leaves.push({ x, y: Y(y), rot: a + 48 - (j % 3) * 5, s: size * (0.82 + ((j * 5) % 3) * 0.08), i: j * 2 + 1 })
  }
  // Racimos de tres bayas con brillo, repartidos a lo largo.
  for (const [n, u] of [0.2, 0.54, 0.9].entries()) {
    const { seg, t } = along(u)
    const [x, y] = bez(seg, t)
    sprigs.push({ x, y: Y(y), rot: bezAngle(seg, t) + 180 + (n % 2 ? 66 : -68), i: 22 + n * 2 })
  }
  return { leaves, sprigs }
})

const wag = (i: number, side: 'l' | 'r') => ({
  '--i': String(i),
  '--wd': `${3.2 + ((i * 7) % 5) * 0.45}s`,
  '--wl': `${-(((i * 5) % 7) * 0.6) - (side === 'r' ? 1.3 : 0)}s`,
})

const LEAF = 'M0 0C5 -7 20 -11 36 0C20 11 5 7 0 0Z'
const LEAF_BACK = 'M0 0C9 1 24 3 36 0C20 11 5 7 0 0Z'
const LEAF_VEINS = 'M6 0.2H31M12 0C14 -3.4 18 -5 22 -5.4M12 0C14 3.4 18 4.8 22 5.2M22 0C24 -2.4 27 -3.4 29 -3.4M22 0C24 2.4 27 3.2 29 3.2'
const loops = [
  { key: 'l', t: '' },
  { key: 'r', t: `translate(1000 0) scale(-1 1) rotate(3 500 ${KNOT_Y})` },
]
const sides = [
  { key: 'l', t: '' },
  { key: 'r', t: 'translate(1000 0) scale(-1 1)' },
]
const daisies = computed(() => [
  { key: 'big', t: `translate(944 ${Y(124)}) scale(1.08)` },
  { key: 'small', t: `translate(58 ${Y(118)}) scale(0.55)` },
])
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

      <!-- lazos y colas del centro: bandas de satén, el revés más oscuro -->
      <g v-for="l in loops" :key="l.key" class="rg__loop" :class="`rg__loop--${l.key}`">
        <g class="rg__loop-sway">
          <g :transform="l.t || undefined">
            <g :filter="`url(#${fid})`">
              <path class="wash" :d="centerTailD" />
              <path class="wash wash--2" transform="translate(3 4)" :d="centerTailD" />
              <path class="pigment" :d="centerTailD" />
              <path class="wash" :d="LOOP" />
              <path class="wash wash--2" transform="translate(4 5)" :d="LOOP" />
              <path class="back" :d="LOOP_BACK" />
              <path class="pleat" :d="LOOP_PLEATS" />
              <path class="pigment" :d="LOOP" />
              <path class="sheen" :d="LOOP_SHEEN" />
            </g>
          </g>
        </g>
      </g>

      <!-- cada lado: listón en guirnalda, cola de la esquina y rama de hojas; sale del nudo y se despliega -->
      <g v-for="s in sides" :key="s.key" class="rg__side" :class="`rg__side--${s.key}`">
        <g class="rg__sway">
          <g :transform="s.t || undefined">
            <g :filter="`url(#${fid})`">
              <g class="rg__ribbon">
                <path class="wash" :d="garlandD" />
                <path class="wash wash--2" transform="translate(3 5)" :d="garlandD" />
                <path class="pigment" :d="garlandD" />
                <path class="pleat" :d="GARLAND_PLEATS" />
                <path class="sheen" transform="translate(-3 -10)" :d="garlandSheen" />
              </g>
            </g>

            <!-- cola de la esquina: se dobla y cuelga; se balancea desde el doblez -->
            <g class="rg__curl" :style="{ transformOrigin: `${CORNER.x}px ${Y(CORNER.y)}px` }">
              <g :filter="`url(#${fid})`">
                <g class="rg__ribbon">
                  <path class="wash" :d="cornerTailD" />
                  <path class="wash wash--2" transform="translate(3 4)" :d="cornerTailD" />
                  <path class="back" :d="cornerTailD" />
                  <path class="pigment" :d="cornerTailD" />
                  <path class="sheen" transform="translate(-6 0)" :d="cornerTailSheen" />
                  <path class="fold-tri" :d="foldD" />
                </g>
              </g>
            </g>

            <!-- rama de hojas lanceoladas con nervadura y racimos de bayas -->
            <g class="rg__foliage">
              <path class="stem" :d="stemD" :filter="`url(#${fid})`" />
              <g
                v-for="(p, n) in foliage.sprigs"
                :key="`s${n}`"
                :transform="`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(2)`"
              >
                <g class="rg__leaf" :style="wag(p.i, s.key as 'l' | 'r')" :filter="`url(#${fid})`">
                  <g class="rg__wag">
                    <path class="stem stem--thin" d="M0 0C8 -5 18 -7 26 -5" />
                    <path class="stem stem--thin" d="M16 -6C18 -11 21 -14 25 -15" />
                    <circle class="berry" cx="27" cy="-5" r="6.4" />
                    <circle class="berry berry--2" cx="26" cy="-16" r="5.6" />
                    <circle class="berry" cx="17" cy="-12" r="5" />
                    <circle class="glint" cx="25.2" cy="-7" r="1.8" />
                    <circle class="glint" cx="24.4" cy="-17.6" r="1.6" />
                    <circle class="glint" cx="15.6" cy="-13.6" r="1.4" />
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
                    <path class="leaf leaf--2" transform="translate(1 1.4)" :d="LEAF" />
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

      <!-- margaritas: una grande en el extremo derecho y otra chica a la izquierda -->
      <g v-for="d in daisies" :key="d.key" :transform="d.t">
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

      <!-- nudo: almohadilla con dos arrugas, más intensa que los lazos -->
      <g class="rg__knot">
        <g :filter="`url(#${fid})`">
          <path class="knot" d="M470 138C480 120 520 120 530 138C539 156 535 178 525 186C511 196 489 196 475 186C465 176 461 156 470 138Z" />
          <path class="knot knot--2" transform="translate(2 3)" d="M470 138C480 120 520 120 530 138C539 156 535 178 525 186C511 196 489 196 475 186C465 176 461 156 470 138Z" />
          <path class="shade" d="M529 142C538 160 534 180 525 187C511 197 490 196 480 190C502 192 522 180 529 142Z" />
          <path class="crease" d="M483 128C478 146 478 168 486 190M512 126C510 148 512 170 518 190" />
          <path class="pigment" d="M470 138C480 120 520 120 530 138C539 156 535 178 525 186C511 196 489 196 475 186C465 176 461 156 470 138Z" />
          <path class="gloss gloss--knot" d="M480 140C486 130 498 126 514 128" />
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

/* Pintura: formas rellenas en dos lavados, borde fino de pigmento y luces en blanco. */
.wash {
  fill: var(--_bow);
  fill-opacity: 0.55;
  fill-rule: evenodd;
}
.wash--2 {
  fill-opacity: 0.35;
}
.pigment {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.34;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.back {
  fill: var(--_bow-dark);
  fill-opacity: 0.2;
}
.fold-tri {
  fill: var(--_bow-dark);
  fill-opacity: 0.36;
}
.pleat {
  fill: var(--_bow-dark);
  fill-opacity: 0.24;
}
.knot {
  fill: var(--_bow-dark);
  fill-opacity: 0.5;
}
.knot--2 {
  fill: var(--_bow);
  fill-opacity: 0.42;
}
.shade {
  fill: var(--_cool);
  fill-opacity: 0.28;
}
.sheen {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.5;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 120 50 40 60;
}
.crease {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.38;
  stroke-width: 1.5;
  stroke-linecap: round;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.62;
  stroke-width: 3.4;
  stroke-linecap: round;
}
.gloss--knot {
  stroke-opacity: 0.7;
  stroke-width: 3.2;
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
.leaf--2 {
  fill-opacity: 0.3;
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
  transform-origin: 500px 150px;
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
