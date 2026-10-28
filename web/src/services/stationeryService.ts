/**
 * Ayudas de la papelería fina (los diseños `sobre-lacre`, `editorial`, `banda`…): partir los
 * nombres de la pareja, separar a los papás de los padrinos y escribir la fecha como en una
 * tarjeta impresa. Lógica pura, sin Vue.
 */

/** Un grupo de familia tal como llega en la config (`family`). */
export interface FamilyGroup {
  role: string
  names: string[]
}

/**
 * Los nombres de la pareja: "Isabella & Mateo" → ["Isabella", "Mateo"]; también con "y" o
 * "e" entre los dos. Un solo nombre (XV, graduación) queda solo.
 */
export function coupleNames(name: string | undefined | null): string[] {
  const clean = (name ?? '').trim()
  if (!clean) return []
  const parts = clean
    .split(/\s*&\s*|\s+(?:y|e)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts.slice(0, 2) : [clean]
}

const PARENTS = /\b(pap[aá]s?|mam[aá]s?|padres|madre|padre)\b/i
const GODPARENTS = /padrin|madrin/i

/** Los grupos de papás ("Papás de la novia", "Mis padres"…), sin los padrinos. */
export function parentGroups(family: FamilyGroup[]): FamilyGroup[] {
  return family.filter((g) => PARENTS.test(g.role) && !GODPARENTS.test(g.role))
}

/** Los demás grupos (padrinos, abuelos…): los que no son papás. */
export function otherGroups(family: FamilyGroup[]): FamilyGroup[] {
  const parents = new Set(parentGroups(family))
  return family.filter((g) => !parents.has(g))
}

/** Primera letra en mayúscula (los nombres de día y mes llegan en minúsculas). */
function capital(word: string): string {
  return word ? word.charAt(0).toLocaleUpperCase('es-MX') + word.slice(1) : word
}

/**
 * La fecha como en una invitación impresa: "Sábado 23 de octubre de 2027". Recibe las
 * partes de `dateParts` (día, mes, año y día de la semana).
 */
export function formalDate(p: { weekday: string; day: string; month: string; year: string }): string {
  return [capital(p.weekday), p.day, 'de', p.month, 'de', p.year].filter(Boolean).join(' ')
}

/** Romano de un año ("2027" → "MMXXVII"); si no es un año, lo deja igual. */
export function romanYear(year: string): string {
  const n = Number(year)
  if (!Number.isInteger(n) || n <= 0 || n >= 4000) return year
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let rest = n
  let out = ''
  for (const [value, mark] of table) {
    while (rest >= value) {
      out += mark
      rest -= value
    }
  }
  return out
}
