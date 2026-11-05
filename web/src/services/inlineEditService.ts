import type { Catalog, CatalogSection, Design } from '@/types/design'
import { FREE_REF } from './arrangeService'
import { catalogSection, setItemField, setSectionCanvas, setSectionField } from './designService'

/**
 * Doble clic para escribir un texto en su lugar (lógica pura). La vista previa dice qué
 * texto se editó (`ref`: «texto:título:0» o «lienzo-3») y el editor decide dónde se guarda:
 * en el campo de la sección, en el campo de un elemento de su lista o en el texto de un
 * elemento agregado. Si el texto sale de otro dato (los nombres, la fecha, la ciudad, un
 * número calculado), no se finge: se devuelve `open` y se abre el campo que lo controla.
 */

const TEXT_REF = /^texto:([a-z0-9_]{1,40}):(\d{1,3})$/

/** Los textos de una sección con su campo: los suyos o, si no tiene, los comunes. */
function textsOf(catalog: Catalog, def: CatalogSection | undefined) {
  return def?.texts ?? catalog.texts
}

/** Campo de la sección (no una lista) que escribe un bloque de texto, si lo hay. */
function sectionField(catalog: Catalog, def: CatalogSection | undefined, block: string): string | null {
  const text = textsOf(catalog, def).find((t) => t.block === block)
  const key = text?.field ?? text?.key
  return key && def?.fields.some((f) => f.key === key && f.key !== 'variante') ? key : null
}

/** Campo de la lista de la sección que escribe un bloque de texto, si lo hay. */
function listField(catalog: Catalog, def: CatalogSection | undefined, block: string): string | null {
  const key = textsOf(catalog, def).find((t) => t.block === block)?.key
  return key && def?.list?.fields.some((f) => f.key === key) ? key : null
}

/**
 * Por sección, los bloques de texto que sí se escriben en un campo suyo (o de su lista):
 * son los que el doble clic edita en el lugar.
 */
export function editableBlocks(catalog: Catalog, design: Design): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const section of design.sections) {
    const def = catalogSection(catalog, section.id)
    out[section.id] = textsOf(catalog, def)
      .filter((t) => sectionField(catalog, def, t.block) || (section.items.length && listField(catalog, def, t.block)))
      .map((t) => t.block)
  }
  return out
}

export type EditResult = { design: Design } | { open: string }

/** Guarda un texto editado en el lugar; `open` (el bloque) si no se escribe en la sección. */
export function applyInlineEdit(
  catalog: Catalog,
  design: Design,
  sectionId: string,
  ref: string,
  text: string,
): EditResult | null {
  const section = design.sections.find((s) => s.id === sectionId)
  if (!section) return null
  const free = FREE_REF.exec(ref)
  if (free) {
    const index = Number(free[1]) - 1
    const row = section.canvas?.[index]
    if (!row || row.tipo !== 'texto') return null
    const canvas = (section.canvas ?? []).map((r, i) => (i === index ? { ...r, texto: text.trim() } : r))
    return { design: setSectionCanvas(design, sectionId, canvas) }
  }
  const match = TEXT_REF.exec(ref)
  if (!match) return null
  const block = match[1]
  const index = Number(match[2])
  const def = catalogSection(catalog, sectionId)
  const key = sectionField(catalog, def, block)
  if (key) {
    const input = def?.fields.find((f) => f.key === key)?.input
    const value = input === 'textarea' || input === 'lines' ? text.trim() : text.replace(/\s*\n\s*/g, ' ').trim()
    return { design: setSectionField(design, sectionId, key, value) }
  }
  const item = listField(catalog, def, block)
  if (item && index < section.items.length) {
    return { design: setItemField(design, sectionId, index, item, text.replace(/\s*\n\s*/g, ' ').trim()) }
  }
  return { open: block }
}

/** Sin espacios ni mayúsculas: los nombres se parten en renglones («Alexa», «&», «Carlos»). */
const norm = (v: string) => v.replace(/\s+/g, '').toLowerCase()

/** Las palabras de un texto, sin mayúsculas ni puntuación. */
const words = (v: string) => v.toLowerCase().match(/[\p{L}\p{N}&]+/gu) ?? []

/** Si `part` aparece en `all` como palabras completas y seguidas: «A C» no está en «a celebrar». */
const hasWords = (all: string[], part: string[]) =>
  part.length > 0 && all.some((_, i) => part.every((word, j) => all[i + j] === word))

/**
 * El campo del evento que controla un texto que no es de la sección: de los «del evento» de
 * la sección (o de todos los grupos) el que vale lo mismo que se ve. null si ninguno.
 */
export function controllingEventField(
  catalog: Catalog,
  design: Design,
  sectionId: string,
  shown: string,
): { key: string; label: string; inSection: boolean } | null {
  const wanted = norm(shown)
  if (!wanted) return null
  const shownWords = words(shown)
  const def = catalogSection(catalog, sectionId)
  const all = catalog.event_groups.flatMap((g) => g.fields)
  const matches = (key: string) => {
    const value = design.event[key] ?? ''
    const valueWords = words(value)
    return norm(value) === wanted || hasWords(shownWords, valueWords) || hasWords(valueWords, shownWords)
  }
  const linked = (def?.linked ?? []).find(matches)
  const key = linked ?? all.find((f) => matches(f.key))?.key
  if (!key) return null
  return { key, label: all.find((f) => f.key === key)?.label ?? key, inSection: !!linked }
}
