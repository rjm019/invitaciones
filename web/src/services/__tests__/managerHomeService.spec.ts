import { describe, expect, it } from 'vitest'
import { canDelete, groupByTab, searchEvents, tabOf } from '../managerHomeService'
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

  it('solo quien administra elimina, y solo plantillas', () => {
    expect(canDelete(ev({ template: true }), true)).toBe(true)
    expect(canDelete(ev({ template: true }), false)).toBe(false)
    expect(canDelete(ev({}), true)).toBe(false)
    expect(canDelete(ev({ demo: true }), true)).toBe(false)
  })
})
