import { describe, expect, it } from 'vitest'
import type { Catalog, Design } from '@/types/design'
import { applyInlineEdit, controllingEventField, editableBlocks } from '../inlineEditService'

const catalog = {
  texts: [{ key: 'titulo', block: 'title', label: 'Título' }],
  event_groups: [{ label: 'Nombres', fields: [{ key: 'festejada', label: 'Nombre completo', input: 'text' }] }],
  sections: [
    {
      id: 'itinerario', label: 'Itinerario', fields: [{ key: 'titulo', label: 'Título', input: 'text' }],
      list: { key: 'item', fields: [{ key: 'actividad', label: 'Actividad', input: 'text' }] },
      linked: [],
      texts: [
        { key: 'titulo', block: 'title', label: 'Título' },
        { key: 'actividad', block: 'activity', label: 'Actividades' },
        { key: 'hora', block: 'time', label: 'Horas' },
      ],
    },
    {
      id: 'portada', label: 'Portada', fields: [], list: null, linked: ['festejada'],
      texts: [{ key: 'nombre', block: 'name', label: 'Nombre' }],
    },
  ],
} as unknown as Catalog

const design = {
  event: { festejada: 'Alexa & Carlos' }, colors: {}, fonts: {}, texts: {}, page: {},
  sections: [
    { id: 'itinerario', fields: { titulo: 'Itinerario' }, items: [{ actividad: 'Misa' }, { actividad: 'Baile' }], canvas: [{ tipo: 'texto', texto: 'Hola' }] },
    { id: 'portada', fields: {}, items: [] },
  ],
} as unknown as Design

describe('inlineEditService', () => {
  it('solo son editables los bloques que se escriben en un campo de la sección o de su lista', () => {
    expect(editableBlocks(catalog, design)).toEqual({ itinerario: ['title', 'activity'], portada: [] })
  })

  it('un título se guarda en su campo', () => {
    const r = applyInlineEdit(catalog, design, 'itinerario', 'texto:title:0', 'Programa\nx')
    expect(r && 'design' in r && r.design.sections[0].fields.titulo).toBe('Programa x')
  })

  it('una fila de lista escribe el campo del elemento por su índice', () => {
    const r = applyInlineEdit(catalog, design, 'itinerario', 'texto:activity:1', 'Fiesta')
    expect(r && 'design' in r && r.design.sections[0].items.map((i) => i.actividad)).toEqual(['Misa', 'Fiesta'])
  })

  it('un texto agregado escribe su texto', () => {
    const r = applyInlineEdit(catalog, design, 'itinerario', 'lienzo-1', ' Adiós ')
    expect(r && 'design' in r && r.design.sections[0].canvas?.[0].texto).toBe('Adiós')
  })

  it('lo que sale de otro dato no se finge: pide abrir su campo', () => {
    expect(applyInlineEdit(catalog, design, 'portada', 'texto:name:0', 'X')).toEqual({ open: 'name' })
    expect(applyInlineEdit(catalog, design, 'itinerario', 'texto:time:0', 'X')).toEqual({ open: 'time' })
    expect(applyInlineEdit(catalog, design, 'itinerario', 'texto:activity:9', 'X')).toEqual({ open: 'activity' })
  })

  it('encuentra el campo del evento que controla lo que se ve, aunque lo partan en renglones', () => {
    const f = controllingEventField(catalog, design, 'portada', 'Alexa\n&\nCarlos')
    expect(f).toMatchObject({ key: 'festejada', inSection: true })
    expect(controllingEventField(catalog, design, 'portada', '13')).toBeNull()
  })
})
