import { describe, expect, it } from 'vitest'
import { groupByTab, kindOf, needsConfirmation, searchEvents, tabOf } from '../managerHomeService'
import type { ManagerEvent } from '@/types/design'

function ev(over: Partial<ManagerEvent>): ManagerEvent {
  return {
    slug: 'xv-ana',
    title: 'XV de Ana',
    type: 'xv',
    celebrant: 'Ana',
    starts_at: null,
    published: true,
    template: false,
    demo: false,
    format: 'design',
    has_draft: false,
    pending: false,
    updated_at: null,
    last_publish: null,
    people: [],
    cover: { theme: 'jardin-azul', colors: {}, font: null },
    counts: { invitations: 0, guests: 0, attending: 0 },
    ...over,
  }
}

describe('managerHomeService', () => {
  it('cada tarjeta va en su pestaña: invitaciones, plantillas o muestras de la landing', () => {
    expect(tabOf(ev({}))).toBe('events')
    expect(tabOf(ev({ template: true }))).toBe('templates')
    expect(tabOf(ev({ demo: true }))).toBe('demos')

    const groups = groupByTab([
      ev({ slug: 'nat' }),
      ev({ slug: 'demo-boda', demo: true }),
      ev({ slug: 'plantilla-nueva-york', template: true }),
      ev({ slug: 'demo-xv', demo: true }),
    ])
    expect(groups.events.map((e) => e.slug)).toEqual(['nat'])
    expect(groups.templates.map((e) => e.slug)).toEqual(['plantilla-nueva-york'])
    expect(groups.demos.map((e) => e.slug)).toEqual(['demo-boda', 'demo-xv'])
  })

  it('busca por nombre, título o dirección, sin importar mayúsculas ni acentos', () => {
    const list = [
      ev({ slug: 'demo-xv', title: 'XV de Sofía', celebrant: 'Sofía' }),
      ev({ slug: 'xv-ximena', title: 'XV de Ximena', celebrant: 'Ximena' }),
    ]
    expect(searchEvents(list, 'sofia').map((e) => e.slug)).toEqual(['demo-xv'])
    expect(searchEvents(list, '  XIMENA ').map((e) => e.slug)).toEqual(['xv-ximena'])
    expect(searchEvents(list, 'xv').length).toBe(2)
    expect(searchEvents(list, 'xv-').map((e) => e.slug)).toEqual(['xv-ximena'])
    expect(searchEvents(list, '')).toBe(list)
  })

  it('pide escribir la dirección para eliminar una invitación ya compartida', () => {
    const counts = (invitations: number, guests: number) => ({ invitations, guests, attending: 0 })
    // Visible, con enlaces o con confirmaciones: hay invitados que la tienen.
    expect(needsConfirmation(ev({ published: true }))).toBe(true)
    expect(needsConfirmation(ev({ published: false, counts: counts(2, 0) }))).toBe(true)
    expect(needsConfirmation(ev({ published: false, counts: counts(0, 3) }))).toBe(true)
    expect(needsConfirmation(ev({ demo: true }))).toBe(true)
    // Recién hecha y oculta, o una plantilla: basta con confirmar.
    expect(needsConfirmation(ev({ published: false }))).toBe(false)
    expect(needsConfirmation(ev({ template: true, published: false }))).toBe(false)
    // Si no se pudo leer, mejor pedirla.
    expect(needsConfirmation(ev({ published: false, error: 'No se pudo leer' }))).toBe(true)
  })

  it('dice qué se elimina', () => {
    expect(kindOf(ev({}))).toBe('invitación')
    expect(kindOf(ev({ template: true }))).toBe('plantilla')
    expect(kindOf(ev({ demo: true }))).toBe('muestra')
  })
})
