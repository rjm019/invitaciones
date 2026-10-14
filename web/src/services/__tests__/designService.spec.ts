import { describe, expect, it } from 'vitest'
import {
  addItem,
  addSection,
  applyTextStyleEverywhere,
  duplicateSection,
  isVisible,
  moveItem,
  moveSection,
  nextId,
  removeItem,
  removeSection,
  sectionLabel,
  setBlockField,
  slugify,
  validSlug,
  setItemField,
  setSectionField,
  setSectionFields,
  toggleSection,
} from '../designService'
import type { Catalog, Design } from '@/types/design'

const catalog = {
  sections: [
    { id: 'frase', label: 'Frase', repeatable: true },
    { id: 'itinerario', label: 'Itinerario', repeatable: false },
    { id: 'clima', label: 'Clima', repeatable: false },
  ],
} as unknown as Catalog

const design = (): Design => ({
  event: { tema: 'jardin-azul' },
  colors: {},
  fonts: {},
  texts: {},
  page: {},
  sections: [
    {
      id: 'itinerario',
      fields: { visible: 'SI', titulo: 'Itinerario', titulo_color: 'acento' },
      items: [{ hora: '17:00' }, { hora: '18:00' }],
    },
    { id: 'frase', fields: { texto: 'Hola', titulo_fuente: 'Lora' }, items: [] },
    { id: 'clima', fields: { visible: 'NO' }, items: [] },
  ],
})

describe('designService', () => {
  it('cambia campos sin tocar la original; vacío quita el campo', () => {
    const original = design()
    const next = setSectionField(original, 'itinerario', 'titulo', 'Programa')
    expect(next.sections[0].fields.titulo).toBe('Programa')
    expect(original.sections[0].fields.titulo).toBe('Itinerario')
    expect(next.sections[1]).toBe(original.sections[1])

    expect(
      setSectionField(original, 'itinerario', 'titulo', '  ').sections[0].fields,
    ).not.toHaveProperty('titulo')
    expect(setBlockField(original, 'colors', 'primario', '#96792C').colors).toEqual({
      primario: '#96792C',
    })
    expect(
      setSectionFields(original, 'frase', { texto: '', boton: 'Ok' }).sections[1].fields,
    ).toEqual({ titulo_fuente: 'Lora', boton: 'Ok' })
  })

  it('las listas: agregar, cambiar, mover y quitar elementos', () => {
    let d = addItem(design(), 'itinerario', { hora: '19:00' })
    d = setItemField(d, 'itinerario', 0, 'actividad', 'Recepción')
    d = moveItem(d, 'itinerario', 2, 0)
    d = removeItem(d, 'itinerario', 2)
    expect(d.sections[0].items).toEqual([
      { hora: '19:00' },
      { hora: '17:00', actividad: 'Recepción' },
    ])
  })

  it('secciones: mover, ocultar y quitar', () => {
    const moved = moveSection(design(), 2, 0)
    expect(moved.sections.map((s) => s.id)).toEqual(['clima', 'itinerario', 'frase'])
    expect(isVisible(toggleSection(design(), 'clima').sections[2])).toBe(true)
    expect(isVisible(toggleSection(design(), 'frase').sections[1])).toBe(false)
    expect(removeSection(design(), 'frase').sections.map((s) => s.id)).toEqual([
      'itinerario',
      'clima',
    ])
  })

  it('agregar una que no se repite y ya está la vuelve a mostrar; las que se repiten llevan número', () => {
    const shown = addSection(design(), catalog, 'clima')
    expect(shown.id).toBe('clima')
    expect(isVisible(shown.design.sections[2])).toBe(true)
    expect(shown.design.sections).toHaveLength(3)

    const added = addSection(design(), catalog, 'frase', 1)
    expect(added.id).toBe('frase-2')
    expect(added.design.sections.map((s) => s.id)).toEqual([
      'itinerario',
      'frase-2',
      'frase',
      'clima',
    ])
    expect(nextId(added.design, 'frase')).toBe('frase-3')
    expect(sectionLabel(catalog, 'frase-2')).toBe('Frase 2')
  })

  it('duplicar copia la sección justo abajo, solo si su tipo se repite', () => {
    const copy = duplicateSection(design(), catalog, 'frase')
    expect(copy?.id).toBe('frase-2')
    expect(copy?.design.sections[2]).toEqual({
      id: 'frase-2',
      fields: { texto: 'Hola', titulo_fuente: 'Lora' },
      items: [],
    })
    expect(duplicateSection(design(), catalog, 'itinerario')).toBeNull()
  })

  it('"usar en todas las secciones" pasa el estilo a textos y lo quita de cada sección', () => {
    const next = applyTextStyleEverywhere(design(), 'titulo', {
      titulo_color: 'acento',
      titulo_fuente: 'Great Vibes',
    })
    expect(next.texts).toEqual({ titulo_color: 'acento', titulo_fuente: 'Great Vibes' })
    expect(next.sections[0].fields).not.toHaveProperty('titulo_color')
    expect(next.sections[1].fields).not.toHaveProperty('titulo_fuente')
    expect(next.sections[0].fields.titulo).toBe('Itinerario')
  })

  it('la dirección se arma sola desde el nombre y se revisa', () => {
    expect(slugify('XV Ana Sofía Peña')).toBe('xv-ana-sofia-pena')
    expect(slugify('  ¡Boda de María & José!  ')).toBe('boda-de-maria-jose')
    expect(validSlug('xv-ana')).toBe(true)
    expect(validSlug('a')).toBe(false)
    expect(validSlug('vista-previa')).toBe(false)
    expect(validSlug('-xv')).toBe(false)
  })
})
