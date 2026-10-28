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
