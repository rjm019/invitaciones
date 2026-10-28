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

/**
 * Orilla orgánica de un lacre de verdad: la cera se aplasta en un charco casi redondo con
 * ondas lentas (armónicos 2 a 5 con fase por semilla), unos cuantos derrames suaves y un
 * temblor fino. Misma semilla, misma forma. Devuelve el `d` de un path cerrado alrededor de
 * (`cx`, `cy`) con radios `rx` y `ry`.
 */
export function waxBlobPath(
  random: () => number,
  rx = 44,
  ry = 44,
  cx = 50,
  cy = 50,
  points = 72,
): string {
  const waves = [2, 3, 4, 5].map((k) => ({
    k,
    amp: (0.022 + random() * 0.03) / Math.sqrt(k - 1),
    phase: random() * Math.PI * 2,
  }))
  const drips = Array.from({ length: 3 + Math.floor(random() * 3) }, () => ({
    at: random() * Math.PI * 2,
    amp: 0.025 + random() * 0.045,
    width: 0.18 + random() * 0.22,
  }))
  const pts: Point[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    let k = 1
    for (const w of waves) k += w.amp * Math.sin(w.k * a + w.phase)
    for (const drip of drips) {
      // distancia angular más corta al derrame
      const da = Math.atan2(Math.sin(a - drip.at), Math.cos(a - drip.at))
      k += drip.amp * Math.exp(-(da * da) / (2 * drip.width * drip.width))
    }
    k += (random() - 0.5) * 0.008
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return smoothClosedPath(pts)
}

export interface WreathPaths {
  /** Hojas, bayas y perlas (relleno). */
  fill: string
  /** Tallos y volutas (trazo). */
  stroke: string
}

/**
 * Corona de filigrana vegetal para el centro del lacre: dos ramas que nacen abajo, se cruzan,
 * suben por los lados con hojas en pares y bayas y rematan arriba en una voluta; una hilera de
 * perlas finas la rodea. Elipse de centro (`cx`, `cy`) y radios `rx` × `ry`. Lógica pura.
 */
export function wreathPaths(cx: number, cy: number, rx: number, ry: number): WreathPaths {
  const deg = Math.PI / 180
  // a: ángulo desde arriba, en el sentido del reloj; side = 1 a la derecha, -1 a la izquierda.
  const at = (a: number, side: number, scale = 1): Point => [
    cx + side * rx * scale * Math.sin(a * deg),
    cy - ry * scale * Math.cos(a * deg),
  ]
  const leaf = (base: Point, dir: Point, len: number): string => {
    const tip: Point = [base[0] + dir[0] * len, base[1] + dir[1] * len]
    const mid: Point = [base[0] + dir[0] * len * 0.5, base[1] + dir[1] * len * 0.5]
    const w = len * 0.4
    const l: Point = [mid[0] - dir[1] * w, mid[1] + dir[0] * w]
    const r: Point = [mid[0] + dir[1] * w, mid[1] - dir[0] * w]
    return `M${pt(base)}Q${pt(l)} ${pt(tip)}Q${pt(r)} ${pt(base)}Z`
  }
  const dot = (c: Point, r: number) =>
    `M${fmt2(c[0] - r)} ${fmt2(c[1])}a${r} ${r} 0 1 0 ${fmt2(2 * r)} 0a${r} ${r} 0 1 0 ${fmt2(-2 * r)} 0Z`
  const rotate = (v: Point, angle: number): Point => [
    v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
    v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
  ]
  const unit = (v: Point): Point => {
    const m = Math.hypot(v[0], v[1]) || 1
    return [v[0] / m, v[1] / m]
  }

  let fill = ''
  let stroke = ''
  for (const side of [-1, 1]) {
    // El tallo: de abajo (cruzando un poco al otro lado) hasta arriba.
    const stem: Point[] = []
    for (let a = 188; a >= 26; a -= 6) stem.push(at(a, side))
    stroke += `M${stem.map(pt).join('L')}`
    // La voluta de arriba: una espiral que se enrosca hacia adentro.
    const end = at(26, side)
    const curl: Point[] = []
    for (let t = 0; t <= 1.35; t += 0.08) {
      const r = 3.4 * (1 - t * 0.62)
      const ang = (-90 - side * 70 + side * t * 360) * deg
      curl.push([end[0] + side * 2.6 + Math.cos(ang) * r * side, end[1] + 2.4 + Math.sin(ang) * r])
    }
    stroke += `M${pt(end)}L${curl.map(pt).join('L')}`
    // Hojas en pares (afuera y adentro), más chicas hacia la punta, y bayas entre ellas.
    for (let i = 0; i < 7; i++) {
      const a = 166 - i * 19
      const base = at(a, side)
      const ahead = at(a - 4, side)
      const tangent = unit([ahead[0] - base[0], ahead[1] - base[1]])
      const len = 7.2 - i * 0.5
      fill += leaf(base, rotate(tangent, side * -40 * deg), len)
      const inner = at(a - 8, side)
      fill += leaf(inner, rotate(tangent, side * 38 * deg), len * 0.82)
      if (i % 2 === 1) fill += dot(at(a - 10, side, 1.2), 0.95)
    }
  }
  // El remate de arriba: una hoja que sube entre las volutas, dos chicas y una baya.
  const top = at(0, 1, 1.02)
  fill += leaf(top, [0, -1], 6.4) + leaf(top, rotate([0, -1], -55 * deg), 4.2)
  fill += leaf(top, rotate([0, -1], 55 * deg), 4.2) + dot(at(0, 1, 0.86), 1)
  // El nudo de abajo, donde se cruzan los tallos.
  fill += dot(at(180, 1, 1), 1.5) + dot(at(186, 1, 1.12), 0.9) + dot(at(186, -1, 1.12), 0.9)
  // Perlas finas alrededor (por dentro de la pared del sello).
  const beads = 56
  for (let i = 0; i < beads; i++) {
    const a = (i / beads) * Math.PI * 2
    fill += dot([cx + Math.cos(a) * rx * 1.27, cy + Math.sin(a) * ry * 1.27], 0.55)
  }
  return { fill, stroke }
}
