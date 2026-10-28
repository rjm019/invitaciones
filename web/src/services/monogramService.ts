/**
 * Monograma: las iniciales de la invitación y dónde va cada letra en el dibujo (Monogram y
 * WaxSeal). Lógica pura, sin Vue ni DOM.
 */

export const MAX_MONOGRAM_LETTERS = 3

/** Separadores entre los dos nombres de una pareja: "&", "+", " y ", " e ", " and ". */
const COUPLE_SEPARATOR = /\s*(?:&|\+|\band\b|\by\b|\be\b)\s*/iu

function letters(text: string): string[] {
  return Array.from(text.normalize('NFC').toLocaleUpperCase('es-MX')).filter((ch) =>
    /\p{L}/u.test(ch),
  )
}

function firstLetter(word: string): string {
  return letters(word)[0] ?? ''
}

/** Las iniciales de un nombre suelto: "Isabella" → ["I"]; "Ana María López" → ["A", "L"]. */
function personInitials(name: string): string[] {
  const words = name.split(/\s+/u).filter((word) => firstLetter(word) !== '')
  if (words.length === 0) return []
  if (words.length === 1) return [firstLetter(words[0])]
  return [firstLetter(words[0]), firstLetter(words[words.length - 1])]
}

/**
 * Las iniciales del monograma. Si la invitación las escribió (`evento,,monograma`), esas
 * (solo letras, hasta tres). Si no, salen del nombre corto: "Isabella & Mateo" → I M; con un
 * solo nombre y una pareja ("Nat" y `pareja`), la inicial de cada uno; con un solo nombre,
 * su inicial.
 */
export function monogramInitials(
  explicit?: string | null,
  shortName?: string | null,
  fullName?: string | null,
  partnerName?: string | null,
): string[] {
  const own = letters(explicit ?? '').slice(0, MAX_MONOGRAM_LETTERS)
  if (own.length > 0) return own

  const name = (shortName ?? '').trim() || (fullName ?? '').trim()
  const parts = name.split(COUPLE_SEPARATOR).filter((part) => firstLetter(part) !== '')
  if (parts.length >= 2) return parts.slice(0, 2).map(firstLetter)

  const partner = firstLetter(partnerName ?? '')
  if (parts.length === 1 && partner !== '') return [firstLetter(parts[0]), partner]
  return parts.length === 1 ? personInitials(parts[0]).slice(0, 2) : []
}

export interface MonogramGlyph {
  char: string
  x: number
  y: number
  size: number
}

export interface MonogramLayout {
  /** El dibujo mide `width` × `height` (viewBox). */
  width: number
  height: number
  letters: MonogramGlyph[]
  /** El "&" caligráfico, si se pidió y hay dos letras. */
  ampersand: MonogramGlyph | null
}

/**
 * Acomoda las letras en una caja de 100 × 100: una al centro; dos encimadas (entrelazadas);
 * tres con la del centro más grande. Con "&" y dos letras, va chico debajo.
 */
export function monogramLayout(chars: string[], withAmpersand = false): MonogramLayout {
  const list = chars.slice(0, MAX_MONOGRAM_LETTERS)
  const base = 70
  const glyphs: MonogramGlyph[] =
    list.length === 1
      ? [{ char: list[0], x: 50, y: base, size: 72 }]
      : list.length === 2
        ? [
            { char: list[0], x: 35, y: base, size: 64 },
            { char: list[1], x: 65, y: base, size: 64 },
          ]
        : list.length === 3
          ? [
              { char: list[0], x: 25, y: base, size: 46 },
              { char: list[1], x: 50, y: base + 2, size: 60 },
              { char: list[2], x: 75, y: base, size: 46 },
            ]
          : []
  const ampersand =
    withAmpersand && list.length === 2 ? { char: '&', x: 50, y: 94, size: 22 } : null
  return { width: 100, height: 100, letters: glyphs, ampersand }
}

/**
 * Orilla irregular de un lacre: puntos alrededor de una elipse con un temblor repetible
 * (mismo `seed`, misma forma), como cera que se derramó. Devuelve el `d` de un path cerrado
 * y suave en un cuadro de 100 × 100, con radios `rx` y `ry` (en el cuadro) y `wobble` de 0 a 1.
 */
export function waxEdgePath(
  random: () => number,
  rx = 44,
  ry = 44,
  wobble = 0.5,
  points = 24,
): string {
  const cx = 50
  const cy = 50
  const pts: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const k = 1 + (random() - 0.5) * 0.18 * wobble * 2 * (i % 2 === 0 ? 1 : 0.6)
    pts.push([cx + Math.cos(angle) * rx * k, cy + Math.sin(angle) * ry * k])
  }
  // Curvas suaves por los puntos medios (cada punto es el control de su esquina).
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ]
  const fmt = (n: number) => Math.round(n * 100) / 100
  const start = mid(pts[points - 1], pts[0])
  let d = `M${fmt(start[0])} ${fmt(start[1])}`
  for (let i = 0; i < points; i++) {
    const end = mid(pts[i], pts[(i + 1) % points])
    d += `Q${fmt(pts[i][0])} ${fmt(pts[i][1])} ${fmt(end[0])} ${fmt(end[1])}`
  }
  return `${d}Z`
}

type Point = [number, number]
const fmt2 = (n: number) => Math.round(n * 100) / 100
const pt = (p: Point) => `${fmt2(p[0])} ${fmt2(p[1])}`

/** Curva cerrada y suave (Catmull-Rom → Bézier cúbicas) por los puntos dados. */
function smoothClosedPath(pts: Point[]): string {
  const n = pts.length
  let d = `M${pt(pts[0])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return `${d}Z`
}

/** Curva abierta y suave (Catmull-Rom → Bézier cúbicas) por los puntos dados. */
function smoothOpenPath(pts: Point[]): string {
  const n = pts.length
  let d = `M${pt(pts[0])}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}

/**
 * Orilla de un lacre bien hecho: casi un círculo, con una ondulación suave y orgánica
 * (armónicos 3, 5, 6 y 7 de amplitud chica, con fase por semilla) y sin temblor fino: la curva es
 * continua, como un cordón de cera. Misma semilla, misma forma. Devuelve el `d` de un path
 * cerrado alrededor de (`cx`, `cy`) con radios `rx` y `ry`.
 */
export function waxBlobPath(
  random: () => number,
  rx = 44,
  ry = 44,
  cx = 50,
  cy = 50,
  points = 48,
): string {
  const waves = [3, 5, 6, 7].map((k) => ({
    k,
    amp: k === 3 ? 0.004 + random() * 0.004 : 0.006 + random() * 0.009,
    phase: random() * Math.PI * 2,
  }))
  const pts: Point[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    let k = 1
    for (const w of waves) k += w.amp * Math.sin(w.k * a + w.phase)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return smoothClosedPath(pts)
}

/** Nivel de detalle del grabado: completo, medio (sin perlas ni trazos finos) o simple. */
export type SealDetail = 'full' | 'mid' | 'low'

/** El nivel de detalle según el ancho del lacre en pantalla (px de CSS). */
export function sealDetail(widthPx: number): SealDetail {
  if (!widthPx || widthPx >= 110) return 'full'
  return widthPx >= 56 ? 'mid' : 'low'
}

export interface CartouchePaths {
  /** Trazos gruesos: el marco, las volutas grandes. */
  heavy: string
  /** Trazos medios: tallos, volutas chicas, el remate. */
  medium: string
  /** Trazos finos: el filete de adentro del marco. */
  fine: string
  /** Rellenos: hojas, bayas, ojos de las volutas y florón. */
  fill: string
  /** El anillo de perlas, en coordenadas del hueco (50 = su radio), sin la escala de la cartela. */
  beads: string
}

const R2D = Math.PI / 180
const dot = (c: Point, r: number) =>
  `M${fmt2(c[0] - r)} ${fmt2(c[1])}a${r} ${r} 0 1 0 ${fmt2(2 * r)} 0a${r} ${r} 0 1 0 ${fmt2(-2 * r)} 0Z`

/** Hoja lanceolada (punta fina, panza al tercio) de `len` que nace en `base` hacia `dir`. */
function leafPath(base: Point, dir: Point, len: number, width = 0.36): string {
  const m = Math.hypot(dir[0], dir[1]) || 1
  const u: Point = [dir[0] / m, dir[1] / m]
  const n: Point = [-u[1], u[0]]
  const at = (t: number, s: number): Point => [
    base[0] + u[0] * len * t + n[0] * len * s,
    base[1] + u[1] * len * t + n[1] * len * s,
  ]
  const w = width / 2
  return (
    `M${pt(base)}C${pt(at(0.2, w))} ${pt(at(0.6, w * 0.9))} ${pt(at(1, 0))}` +
    `C${pt(at(0.6, -w * 0.9))} ${pt(at(0.2, -w))} ${pt(base)}Z`
  )
}

/** Espiral (voluta) de centro `c`, del radio `r0` al `r1`, desde `a0`° girando `sweep`°. */
function spiral(c: Point, r0: number, r1: number, a0: number, sweep: number): Point[] {
  const steps = Math.max(8, Math.round(Math.abs(sweep) / 18))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const a = (a0 + sweep * t) * R2D
    const r = r0 + (r1 - r0) * t
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r] as Point
  })
}

const mirror = (p: Point): Point => [-p[0], p[1]]

/**
 * Cartela heráldica de filigrana para el centro del lacre (como los sellos de lacre finos):
 * dos volutas grandes arriba que enmarcan el centro, el marco que baja por los lados con un
 * filete fino por dentro, volutas cerradas en las esquinas de abajo y un remate con colgante,
 * ramas de hojas lanceoladas pareadas y bayas que suben por fuera, un florón arriba y un anillo
 * de perlas cerca de la pared del sello. Simétrica (se dibuja la mitad derecha y se refleja).
 * Coordenadas de −50 a 50 (50 = el radio del hueco); `detail` quita lo fino en lacres chicos.
 */
export function cartouchePaths(detail: SealDetail = 'full'): CartouchePaths {
  let heavy = ''
  let medium = ''
  let fine = ''
  let fill = ''
  let beads = ''
  const both = (pts: Point[]) => smoothOpenPath(pts) + smoothOpenPath(pts.map(mirror))
  const leafBoth = (base: Point, dir: Point, len: number, width?: number) =>
    leafPath(base, dir, len, width) + leafPath(mirror(base), [-dir[0], dir[1]], len, width)
  const dotBoth = (c: Point, r: number) => dot(c, r) + dot(mirror(c), r)

  // Volutas grandes de arriba: del centro suben, pasan por encima y se enroscan hacia adentro.
  const topScroll = spiral([12, -26], 9.5, 2.4, 200, 335)
  heavy += both(topScroll)
  fill += dotBoth(topScroll[topScroll.length - 1], 1.7)
  // El marco: baja tangente desde la voluta, con su panza, hasta la voluta de abajo.
  heavy += both([
    [19.6, -27.6],
    [21.2, -22.5],
    [24.6, -15],
    [26.8, -6],
    [26.4, 5],
    [24, 13.5],
    [20.8, 18.6],
  ])
  // Voluta cerrada en la esquina de abajo (se enrosca hacia adentro y arriba).
  const lowScroll = spiral([14.4, 21.6], 6.6, 1.9, -24, 305)
  heavy += both(lowScroll)
  fill += dotBoth(lowScroll[lowScroll.length - 1], 1.35)
  // De la voluta de abajo a la punta del escudo, con un remate enroscado y su colgante.
  medium += both([
    [14.2, 28.2],
    [9, 30.6],
    [4, 33.4],
    [0, 35.2],
  ])
  medium += both(spiral([4.2, 37], 3, 0.8, 200, -290))
  fill += leafPath([0, 36.4], [0, 1], 4.4, 0.5)
  // El florón de arriba: hoja central, dos que se abren y una perla debajo.
  fill += leafPath([0, -30.5], [0, -1], 9.4, 0.44)
  fill += leafBoth([0.6, -31.5], [0.8, -1], 7, 0.42)
  fill += dot([0, -28.6], 1.5)
  // Hojas de acanto pegadas a cada voluta grande, hacia afuera.
  fill += leafBoth([17.8, -32.4], [0.75, -0.75], 7.4, 0.46)
  fill += leafBoth([21.2, -29.4], [1, -0.15], 6, 0.46)

  if (detail !== 'low') {
    // Ramitas que salen del florón sobre las volutas.
    medium += both([
      [2.6, -34],
      [6.6, -37.8],
      [11.6, -39.4],
    ])
    fill += leafBoth([5.6, -37.2], [-0.1, -1], 4.6, 0.5)
    fill += leafBoth([8.8, -38.8], [0.45, -1], 4.4, 0.5)
    fill += leafBoth([11.4, -39.4], [1, -0.25], 4.2, 0.5)
    // Ramas que suben por fuera del marco con hojas pareadas y bayas.
    const stem: Point[] = [
      [18.6, 28.4],
      [25.6, 23],
      [30.2, 13.5],
      [32.3, 2],
      [31.8, -9],
      [28.8, -18.6],
    ]
    medium += both(stem)
    // la punta de la rama: una hoja que sigue el tallo
    fill += leafBoth([28.8, -18.6], [-0.35, -1], 6, 0.5)
    const every = detail === 'full' ? 1 : 2
    for (let i = 0; i < 9; i += every) {
      const t = 0.45 + i * 0.52
      const j = Math.min(stem.length - 2, Math.floor(t))
      const f = t - j
      const p: Point = [
        stem[j][0] + (stem[j + 1][0] - stem[j][0]) * f,
        stem[j][1] + (stem[j + 1][1] - stem[j][1]) * f,
      ]
      const tan: Point = [stem[j + 1][0] - stem[j][0], stem[j + 1][1] - stem[j][1]]
      const m = Math.hypot(tan[0], tan[1])
      const u: Point = [tan[0] / m, tan[1] / m]
      const out: Point = [-u[1], u[0]] // a la derecha del avance = hacia afuera
      const rot = (s: number): Point => [u[0] * 0.7 + out[0] * s, u[1] * 0.7 + out[1] * s]
      const len = 9.4 - i * 0.42
      fill += leafBoth(p, rot(0.85), len, 0.52)
      if (i % 3 !== 2) fill += leafBoth(p, rot(-0.45), len * 0.7, 0.52)
      if (detail === 'full' && i % 3 === 2) {
        const twig: Point = [p[0] + out[0] * 3 + u[0] * 2.4, p[1] + out[1] * 3 + u[1] * 2.4]
        medium += both([p, twig])
        fill += dotBoth([twig[0] + out[0] * 1.1, twig[1] + out[1] * 1.1], 1.2)
        fill += dotBoth([twig[0] + u[0] * 1.7, twig[1] + u[1] * 1.7], 0.95)
        fill += dotBoth([twig[0] - out[0] * 0.6 + u[0] * 2.6, twig[1] - out[1] * 0.6 + u[1] * 2.6], 0.75)
      }
    }
  }
  if (detail === 'full') {
    // Filete fino por dentro del marco.
    fine += both([
      [18.4, -19],
      [21.8, -11],
      [23.2, -1],
      [22.6, 8],
      [19.6, 14.6],
    ])
    // Anillo de perlas cerca de la pared del hueco.
    const count = 96
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      beads += dot([Math.cos(a) * 46.6, Math.sin(a) * 46.6], 0.72)
    }
  }
  return { heavy, medium, fine, fill, beads }
}
