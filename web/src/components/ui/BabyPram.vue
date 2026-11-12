<script setup lang="ts">
import { useId } from 'vue'

/**
 * Carriola antigua en acuarela: asa dorada con voluta a la izquierda, cuerpo en forma de barca,
 * capota a la derecha (cuarto de cúpula con varillas en abanico desde el pivote del borde,
 * tela con florecitas y olán de encaje), moñito donde la capota toca el cuerpo, chasis dorado
 * con resortes en C y dos ruedas de rayos. Cada forma lleva dos lavados, borde de pigmento,
 * luces en blanco y sombras frías; el grano y el borde irregular vienen de un filtro estático
 * (se anima el transform de los grupos que lo contienen, nunca el filtro). Con `rolling` las
 * ruedas giran, el cuerpo sube y baja apenas sobre sus resortes y la capota se mece. Solo
 * transform y opacity; con "menos movimiento" queda quieta. Color: `--bow-color` (cuerpo y
 * moño; respaldo `--color-primary`, con `--bow-color-dark` y `--bow-color-soft`), `--color-accent`
 * (hojas), `--color-oro` (asa, chasis y ruedas) y `--color-paper`. Mide el ancho de su
 * contenedor o `size` (CSS). Sirve en cualquier tema.
 */
withDefaults(defineProps<{ rolling?: boolean; size?: string }>(), {
  rolling: false,
  size: undefined,
})

const fid = `bp-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

type Pt = [number, number]
const P: [Pt, Pt, Pt, Pt] = [
  [180, 118],
  [178, 62],
  [224, 20],
  [272, 20],
]
const at = (t: number): Pt => {
  const u = 1 - t
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  return [
    k[0] * P[0][0] + k[1] * P[1][0] + k[2] * P[2][0] + k[3] * P[3][0],
    k[0] * P[0][1] + k[1] * P[1][1] + k[2] * P[2][1] + k[3] * P[3][1],
  ]
}
const f = (n: number) => Math.round(n * 10) / 10

// Olán de encaje: festones a lo largo del borde curvo de la capota, con un ojalillo en cada uno.
const SCALLOPS = 10
const lacePts = Array.from({ length: SCALLOPS + 1 }, (_, i) => at(i / SCALLOPS))
let laceD = `M${f(lacePts[0][0])} ${f(lacePts[0][1])}`
const eyelets: Pt[] = []
for (let i = 1; i < lacePts.length; i++) {
  const [ax, ay] = lacePts[i - 1]
  const [bx, by] = lacePts[i]
  const r = Math.hypot(bx - ax, by - ay) / 2 + 0.4
  laceD += `A${f(r)} ${f(r)} 0 0 1 ${f(bx)} ${f(by)}`
  // El ojalillo va un poco hacia adentro del festón.
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const nx = -(by - ay)
  const ny = bx - ax
  const len = Math.hypot(nx, ny) || 1
  eyelets.push([mx + (nx / len) * 4.2, my + (ny / len) * 4.2])
}
const lace = laceD

// Varillas en abanico desde el pivote (286,118) hacia el borde curvo, un poco arqueadas.
const ribs = [0.25, 0.5, 0.75].map((t) => {
  const [x, y] = at(t)
  const cx = 286 + (x - 286) * 0.55 - 6
  const cy = 118 + (y - 118) * 0.55 + 8
  return `M286 118Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`
})

// Florecitas de la tela: x, y, tamaño, si el pétalo va en listón o en papel, giro.
const flowers = [
  { x: 240, y: 106, s: 0.95, c: 'a', r: 10 },
  { x: 208, y: 108, s: 0.8, c: 'b', r: 40 },
  { x: 264, y: 104, s: 0.85, c: 'b', r: 22 },
  { x: 222, y: 76, s: 1.05, c: 'b', r: 5 },
  { x: 198, y: 72, s: 0.8, c: 'a', r: 30 },
  { x: 252, y: 64, s: 1.0, c: 'a', r: 18 },
  { x: 232, y: 46, s: 0.8, c: 'b', r: 52 },
  { x: 273, y: 50, s: 0.85, c: 'b', r: 12 },
  { x: 278, y: 78, s: 0.8, c: 'a', r: 36 },
]
const leaves = flowers.flatMap((fl, i) => [
  { x: fl.x, y: fl.y, a: -40 + i * 37, s: fl.s },
  { x: fl.x, y: fl.y, a: 140 + i * 29, s: fl.s * 0.85 },
])
const petals = [0, 72, 144, 216, 288]

// Rayos de una rueda: 12, desde el cubo hasta el aro interior.
const spokes = (cx: number, cy: number, r0: number, r1: number) =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6
    return `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}`
  }).join('')
const wheels = [
  { key: 'a', cx: 112, cy: 220, r: 42 },
  { key: 'b', cx: 264, cy: 230, r: 32 },
]
const BODY =
  'M84 112C94 126 120 130 190 130C250 130 276 124 292 108C292 160 252 196 190 196C130 196 88 164 84 112Z'
const HOOD = 'M288 118L180 118C178 62 224 20 272 20C286 30 292 76 288 118Z'
</script>

<template>
  <div class="bp" :class="{ 'is-rolling': rolling }" :style="size ? { width: size } : undefined" aria-hidden="true">
    <svg viewBox="20 8 290 262" focusable="false">
      <defs>
        <filter :id="fid" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="6" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="2" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
      </defs>
      <ellipse class="bp__ground" cx="190" cy="263" rx="132" ry="5" />

      <!-- chasis dorado: barra, resortes en C -->
      <g :filter="`url(#${fid})`">
        <path class="gold" d="M112 221C160 238 220 240 264 231" />
        <path class="gold-hi" d="M114 219.5C162 236 220 238 262 229.5" />
        <path class="gold thin" d="M170 192C150 196 150 224 172 231" />
        <path class="gold thin" d="M214 194C236 198 236 226 214 236" />
        <path class="gold-hi thin" d="M168 194C153 198 153 220 170 227" />
        <path class="gold-hi thin" d="M216 196C232 200 232 222 216 231" />
      </g>

      <!-- cuerpo con asa, capota y moñito: sube y baja sobre los resortes -->
      <g class="bp__body">
        <!-- asa con voluta -->
        <g :filter="`url(#${fid})`">
          <path class="gold" d="M90 117C70 108 56 86 56 58" />
          <path class="gold-hi" d="M88.5 115C71 106 58 86 58 60" />
          <path class="gold grip" d="M36 55L78 50" />
          <path class="gold-hi grip" d="M40 53.5L74 49.4" />
          <circle class="gold-dot" cx="35" cy="55" r="3.2" />
          <circle class="gold-dot" cx="79" cy="50" r="3.2" />
          <path class="gold thin" d="M92 124C76 135 61 125 67 114C72 106 83 110 80 118" />
          <path class="gold thin" d="M60 70C47 73 43 85 51 88C57 90 61 84 57 82" />
        </g>

        <!-- cuerpo en forma de barca -->
        <g :filter="`url(#${fid})`">
          <path class="wash" :d="BODY" />
          <path class="wash-2" transform="translate(2.5 2)" :d="BODY" />
          <path class="shade" d="M96 150C112 176 150 193 190 193C240 193 276 168 289 128C280 168 244 191 192 191C140 191 106 176 96 150Z" />
          <path class="edge" :d="BODY" />
          <path class="stitch" d="M106 143C118 164 152 178 190 178C230 178 258 166 272 142" />
          <path class="gloss" d="M100 129C112 150 136 161 162 165" />
          <g v-for="b in [{ x: 156, y: 158 }, { x: 226, y: 160 }]" :key="b.x" :transform="`translate(${b.x} ${b.y}) scale(0.62)`">
            <path v-for="a in petals" :key="a" class="petal petal--paper" :transform="`rotate(${a})`" d="M0 0C-3.6 -3.4 -3.6 -9.4 0 -10.4C3.6 -9.4 3.6 -3.4 0 0Z" />
            <circle class="bloom-heart" r="2.6" />
          </g>
          <!-- borde dorado -->
          <path class="gold rim" d="M82 110C94 126 120 130 190 130C250 130 276 124 294 106" />
          <path class="gold-hi rim" d="M84 108.6C96 124.6 121 128.6 190 128.6C250 128.6 275 122.6 291 106.6" />
        </g>

        <!-- capota: se mece desde el pivote del borde -->
        <g class="bp__hood">
          <g :filter="`url(#${fid})`">
            <path class="cloth" :d="HOOD" />
            <path class="cloth-2" transform="translate(3 -1.5)" :d="HOOD" />
            <path class="wash-2 hood-tint" :d="HOOD" />
            <path class="shade shade--hood" d="M288 118L180 118C180 108 183 100 187 94C220 106 262 110 288 108Z" />
            <path class="shade shade--edge" d="M272 20C286 30 292 76 288 118L277 118C283 80 280 46 270 24Z" />
            <path v-for="(l, i) in leaves" :key="`l${i}`" class="leaf" :transform="`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.s})`" d="M0 0C4 -4 10 -3 13 0C10 3 4 4 0 0Z" />
            <g v-for="(fl, i) in flowers" :key="`f${i}`" :transform="`translate(${fl.x} ${fl.y}) rotate(${fl.r}) scale(${fl.s})`">
              <path v-for="a in petals" :key="a" class="petal" :class="fl.c === 'a' ? 'petal--bow' : 'petal--paper'" :transform="`rotate(${a})`" d="M0 0C-3.6 -3.4 -3.6 -9.4 0 -10.4C3.6 -9.4 3.6 -3.4 0 0Z" />
              <circle class="bloom-heart" r="2.5" />
            </g>
            <path v-for="(d, i) in ribs" :key="`r${i}`" class="gold rib" :d="d" />
            <path class="edge hood-edge" :d="HOOD" />
            <path class="gloss gloss--hood" d="M188 92C192 64 214 38 246 28" />
            <!-- olán de encaje en el borde curvo -->
            <path class="lace-fill" :d="lace" />
            <path class="lace" :d="lace" />
            <circle v-for="(e, i) in eyelets" :key="`e${i}`" class="eyelet" :cx="f(e[0])" :cy="f(e[1])" r="1.15" />
          </g>
        </g>

        <!-- moñito donde la capota toca el cuerpo -->
        <g transform="translate(286 114)">
          <g class="bp__bow" :filter="`url(#${fid})`">
            <path class="bow-tail" d="M-2 4C-8 14 -10 20 -17 27L-8 24L-5 31C-1 22 1 14 2 5Z" />
            <path class="bow-tail" d="M2 4C8 14 10 20 17 27L8 24L5 31C1 22 -1 14 -2 5Z" />
            <path class="bow-loop" d="M0 0C-6 -10 -23 -13 -25 -2C-27 9 -8 9 0 2Z" />
            <path class="bow-loop" d="M0 0C6 -10 23 -13 25 -2C27 9 8 9 0 2Z" />
            <path class="gloss gloss--bow" d="M-6 -3C-11 -7 -17 -7 -20 -4" />
            <ellipse class="bow-knot" cx="0" cy="0.5" rx="5.2" ry="4.6" />
          </g>
        </g>
      </g>

      <!-- ruedas de rayos -->
      <g v-for="w in wheels" :key="w.key" class="bp__wheel" :class="`bp__wheel--${w.key}`">
        <g :filter="`url(#${fid})`">
          <circle class="gold rimring" :cx="w.cx" :cy="w.cy" :r="w.r" />
          <circle class="gold-hi rimring" :cx="w.cx" :cy="w.cy" :r="w.r" />
          <circle class="gold thin" :cx="w.cx" :cy="w.cy" :r="w.r - 5" />
          <path class="gold spokes" :d="spokes(w.cx, w.cy, 6, w.r - 5)" />
          <circle class="gold-dot" :cx="w.cx" :cy="w.cy" r="6.4" />
          <circle class="bloom-heart hub" :cx="w.cx" :cy="w.cy" r="2.4" />
          <circle class="valve" :cx="w.cx + w.r - 2.5" :cy="w.cy" r="2.2" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.bp {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_green: var(--color-accent, #8fa686);
  --_oro: var(--color-oro, #b8925a);
  --_oro-lite: color-mix(in srgb, var(--_oro) 40%, #fff6dc);
  --_oro-dark: color-mix(in srgb, var(--_oro) 70%, #6a4a2a);
  --_paper: var(--color-paper, #fdf8f0);
  --_cool: color-mix(in srgb, var(--_bow-dark) 35%, #6f7ba6);
  display: block;
  width: 100%;
}
.bp svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.bp__ground {
  fill: var(--_cool);
  opacity: 0.14;
}
/* Pintura: dos lavados, sombra fría, borde de pigmento y luces en blanco. */
.wash {
  fill: var(--_bow);
  opacity: 0.58;
}
.wash-2 {
  fill: var(--_bow);
  opacity: 0.32;
}
.shade {
  fill: var(--_cool);
  opacity: 0.26;
}
.edge {
  fill: none;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.4;
  stroke-width: 1;
  stroke-linejoin: round;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.55;
  stroke-width: 3;
  stroke-linecap: round;
}
.stitch {
  fill: none;
  stroke: var(--_paper);
  stroke-opacity: 0.85;
  stroke-width: 1.4;
  stroke-dasharray: 1.4 4.2;
  stroke-linecap: round;
}

/* Dorado: trazo, luz clara encima y un contorno más oscuro. */
.gold {
  fill: none;
  stroke: var(--_oro);
  stroke-width: 4.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gold.thin {
  stroke-width: 2.6;
}
.gold.grip {
  stroke-width: 6;
}
.gold.rim {
  stroke-width: 4.4;
}
.gold.rib {
  stroke-width: 1.7;
  stroke-opacity: 0.9;
}
.gold.rimring {
  stroke-width: 3.8;
}
.gold.spokes {
  stroke-width: 1.2;
}
.gold-hi {
  fill: none;
  stroke: var(--_oro-lite);
  stroke-opacity: 0.8;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.gold-dot {
  fill: var(--_oro-lite);
  stroke: var(--_oro);
  stroke-width: 1.3;
}

/* Capota: tela, flores, hojas y encaje. */
.cloth {
  fill: var(--_bow-soft);
  opacity: 0.95;
}
.cloth-2 {
  fill: var(--_paper);
  opacity: 0.5;
}
.hood-tint {
  opacity: 0.16;
}
.shade--edge {
  opacity: 0.2;
}
.shade--hood {
  opacity: 0.14;
}
.hood-edge {
  stroke-opacity: 0.3;
}
.gloss--hood {
  stroke-opacity: 0.7;
  stroke-width: 2.4;
}
.leaf {
  fill: var(--_green);
  fill-opacity: 0.85;
  stroke: color-mix(in srgb, var(--_green) 65%, #2f4a30);
  stroke-opacity: 0.5;
  stroke-width: 0.6;
}
.petal {
  stroke-width: 0.7;
  stroke-opacity: 0.8;
}
.petal--bow {
  fill: var(--_bow);
  fill-opacity: 0.82;
  stroke: var(--_bow-dark);
}
.petal--paper {
  fill: var(--_paper);
  stroke: color-mix(in srgb, var(--_bow-dark) 55%, var(--_paper));
}
.bloom-heart {
  fill: color-mix(in srgb, var(--_oro) 55%, #f6d98a);
  stroke: var(--_oro);
  stroke-width: 0.6;
}
.lace-fill {
  fill: var(--_paper);
  fill-opacity: 0.55;
  stroke: none;
}
.lace {
  fill: none;
  stroke: var(--_paper);
  stroke-width: 3.2;
  stroke-linejoin: round;
}
.eyelet {
  fill: var(--_bow-dark);
  fill-opacity: 0.45;
}
.hood-edge {
  stroke-linecap: round;
}

/* Moñito */
.bow-loop,
.bow-tail {
  fill: var(--_bow);
  fill-opacity: 0.88;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.55;
  stroke-width: 0.9;
  stroke-linejoin: round;
}
.bow-knot {
  fill: var(--_bow-dark);
  fill-opacity: 0.75;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.6;
  stroke-width: 0.8;
}
.gloss--bow {
  stroke-width: 1.8;
}

/* Ruedas */
.valve {
  fill: var(--_bow);
  stroke: var(--_bow-dark);
  stroke-width: 0.8;
}
.hub {
  stroke: none;
}

/* Cada pieza gira o se mece desde su propio apoyo. */
.bp__wheel {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.bp__hood {
  transform-box: view-box;
  transform-origin: 286px 118px;
}
.bp__bow {
  transform-box: view-box;
  transform-origin: 0 0;
}

/* Rodando: ruedas, rebote del cuerpo sobre sus resortes y capota que se mece. */
.is-rolling .bp__wheel--a {
  animation: bp-spin calc(2.1s * var(--motion-scale, 1)) linear infinite;
}
.is-rolling .bp__wheel--b {
  animation: bp-spin calc(1.64s * var(--motion-scale, 1)) linear infinite;
}
.is-rolling .bp__body {
  animation: bp-bob calc(0.52s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-rolling .bp__bow {
  animation: bp-bounce calc(0.52s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}
.is-rolling .bp__hood {
  animation: bp-hood calc(1.04s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}

@keyframes bp-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes bp-bob {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-1.8px);
  }
}
@keyframes bp-bounce {
  from {
    transform: translateY(0) scale(1);
  }
  to {
    transform: translateY(-2px) scale(1.06);
  }
}
@keyframes bp-hood {
  from {
    transform: rotate(-1.3deg);
  }
  to {
    transform: rotate(1.1deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-rolling .bp__wheel,
  .is-rolling .bp__body,
  .is-rolling .bp__bow,
  .is-rolling .bp__hood {
    animation: none;
  }
}
</style>
