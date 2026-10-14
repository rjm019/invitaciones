import type {
  Catalog,
  CatalogSection,
  Design,
  DesignIssue,
  DesignSection,
  DesignValues,
} from '@/types/design'

/**
 * Cambios a una invitación sin tocar la original (cada uno devuelve una nueva): así el
 * editor puede deshacer y comparar. Un valor vacío quita el campo (vuelve a lo del tema),
 * igual que una celda vacía en invitacion.csv.
 */

export type DesignBlock = 'event' | 'colors' | 'fonts' | 'texts' | 'page'

const YES = ['si', 'sí', 's', 'x', 'yes', 'true', '1']

export function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design
}

/** "frase-2" → "frase". */
export function sectionKind(id: string): string {
  return id.replace(/-\d+$/, '')
}

/** Sin el campo, la sección se ve (como en el CSV). */
export function isVisible(section: DesignSection): boolean {
  const value = (section.fields.visible ?? '').trim().toLowerCase()
  return value === '' || YES.includes(value)
}

export function catalogSection(catalog: Catalog, id: string): CatalogSection | undefined {
  return catalog.sections.find((s) => s.id === sectionKind(id))
}

/** "Frase", "Frase 2"… */
export function sectionLabel(catalog: Catalog, id: string): string {
  const base = catalogSection(catalog, id)?.label ?? sectionKind(id).replace(/_/g, ' ')
  const n = id.match(/-(\d+)$/)?.[1]
  return n ? `${base} ${n}` : base
}

function withValue(values: DesignValues, key: string, value: string): DesignValues {
  const next = { ...values }
  if (value.trim() === '') delete next[key]
  else next[key] = value
  return next
}

function mapSection(
  design: Design,
  id: string,
  change: (s: DesignSection) => DesignSection,
): Design {
  return { ...design, sections: design.sections.map((s) => (s.id === id ? change(s) : s)) }
}

export function setBlockField(
  design: Design,
  block: DesignBlock,
  key: string,
  value: string,
): Design {
  return { ...design, [block]: withValue(design[block], key, value) }
}

export function setSectionField(design: Design, id: string, key: string, value: string): Design {
  return mapSection(design, id, (s) => ({ ...s, fields: withValue(s.fields, key, value) }))
}

/** Varios campos de una sección de una vez (vacío = quitar). */
export function setSectionFields(
  design: Design,
  id: string,
  changes: Record<string, string>,
): Design {
  return mapSection(design, id, (s) => ({
    ...s,
    fields: Object.entries(changes).reduce((fields, [k, v]) => withValue(fields, k, v), s.fields),
  }))
}

export function setItemField(
  design: Design,
  id: string,
  index: number,
  key: string,
  value: string,
): Design {
  return mapSection(design, id, (s) => ({
    ...s,
    items: s.items.map((item, i) => (i === index ? withValue(item, key, value) : item)),
  }))
}

export function addItem(design: Design, id: string, item: DesignValues = {}): Design {
  return mapSection(design, id, (s) => ({ ...s, items: [...s.items, { ...item }] }))
}

export function removeItem(design: Design, id: string, index: number): Design {
  return mapSection(design, id, (s) => ({ ...s, items: s.items.filter((_, i) => i !== index) }))
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
  return next
}

export function moveItem(design: Design, id: string, from: number, to: number): Design {
  return mapSection(design, id, (s) => ({ ...s, items: move(s.items, from, to) }))
}

export function moveSection(design: Design, from: number, to: number): Design {
  return { ...design, sections: move(design.sections, from, to) }
}

export function toggleSection(design: Design, id: string): Design {
  return mapSection(design, id, (s) => ({
    ...s,
    fields: { ...s.fields, visible: isVisible(s) ? 'NO' : 'SI' },
  }))
}

/** Un id libre para otra sección de ese tipo: "frase", "frase-2", "frase-3"… */
export function nextId(design: Design, kind: string): string {
  const ids = new Set(design.sections.map((s) => s.id))
  if (!ids.has(kind)) return kind
  let n = 2
  while (ids.has(`${kind}-${n}`)) n++
  return `${kind}-${n}`
}

/**
 * Agrega una sección del catálogo. Si es de las que no se repiten y ya está (oculta),
 * solo se vuelve a mostrar. Devuelve el id de la sección que quedó.
 */
export function addSection(
  design: Design,
  catalog: Catalog,
  kind: string,
  at = design.sections.length,
): { design: Design; id: string } {
  const def = catalog.sections.find((s) => s.id === kind)
  const existing = design.sections.find((s) => sectionKind(s.id) === kind)
  if (existing && !def?.repeatable) {
    return {
      design: isVisible(existing) ? design : toggleSection(design, existing.id),
      id: existing.id,
    }
  }
  const id = nextId(design, kind)
  const sections = [...design.sections]
  sections.splice(at, 0, { id, fields: { visible: 'SI' }, items: [] })
  return { design: { ...design, sections }, id }
}

/** Una copia justo abajo (solo los tipos que se repiten: frase, foto, cierre). */
export function duplicateSection(
  design: Design,
  catalog: Catalog,
  id: string,
): { design: Design; id: string } | null {
  const index = design.sections.findIndex((s) => s.id === id)
  if (index < 0 || !catalogSection(catalog, id)?.repeatable) return null
  const copy = JSON.parse(JSON.stringify(design.sections[index])) as DesignSection
  copy.id = nextId(design, sectionKind(id))
  const sections = [...design.sections]
  sections.splice(index + 1, 0, copy)
  return { design: { ...design, sections }, id: copy.id }
}

export function removeSection(design: Design, id: string): Design {
  return { ...design, sections: design.sections.filter((s) => s.id !== id) }
}

/**
 * "Usar en todas las secciones": el estilo de ese texto (título, texto…) pasa al bloque
 * global "textos" y se quita de cada sección, para que todas usen el mismo.
 */
export function applyTextStyleEverywhere(
  design: Design,
  block: string,
  style: DesignValues,
): Design {
  const props = ['fuente', 'color', 'tamano']
  let texts = { ...design.texts }
  for (const prop of props)
    texts = withValue(texts, `${block}_${prop}`, style[`${block}_${prop}`] ?? '')
  return {
    ...design,
    texts,
    sections: design.sections.map((s) => {
      const fields = { ...s.fields }
      for (const prop of props) delete fields[`${block}_${prop}`]
      return { ...s, fields }
    }),
  }
}

/** Lo que hay que revisar en una sección (o en un bloque general). */
export function issuesFor(issues: DesignIssue[], block: string): DesignIssue[] {
  return issues.filter((i) => i.block === block)
}

/** El mismo contenido (para saber si hay algo sin guardar). */
export function sameDesign(a: Design, b: Design): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** "XV Ana Sofía Peña" → "xv-ana-sofia-pena" (la dirección /e/<slug> de una invitación). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/** La dirección es válida para el servidor (2 a 60 caracteres, minúsculas, números y guiones). */
export function validSlug(slug: string): boolean {
  return (
    /^[a-z0-9][a-z0-9-]{1,59}$/.test(slug) &&
    !['vista-previa', 'gestor', 'api', 'media', 'nuevo'].includes(slug)
  )
}
