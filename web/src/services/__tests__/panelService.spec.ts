import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))
vi.mock('../http', () => ({ http: { get, post, put, delete: del } }))

import {
  assignTables,
  changesLabel,
  createInvitation,
  deadlineBounds,
  deleteInvitation,
  deletionWarning,
  filterDedications,
  filterGuests,
  filterInvitations,
  getBrand,
  getOverview,
  getVersion,
  guestCounts,
  guestRows,
  invitationProgress,
  login,
  parseTable,
  tableSummary,
  updateDeadline,
} from '../panelService'
import { setBoot } from '../bootService'
import type { PanelInvitation } from '@/types/panel'

const inv = (over: Partial<PanelInvitation> = {}): PanelInvitation => ({
  id: '1',
  label: 'Familia Pérez',
  passes: 3,
  url: 'https://x/i/Abc',
  message: '¡Hola! https://x/i/Abc',
  whatsapp_url: 'https://wa.me/?text=x',
  guests: [],
  opens: 0,
  created_at: null,
  ...over,
})

describe('panelService', () => {
  beforeEach(() => [get, post, put, del].forEach((m) => m.mockReset()))

  it('entra con la clave y manda el token en cada llamada', async () => {
    post.mockResolvedValueOnce({ data: { token: 't0k', expires_at: 'x' } })
    await expect(login('mis-xv', 'clave-larga')).resolves.toEqual({ token: 't0k', expires_at: 'x' })
    expect(post).toHaveBeenCalledWith('/admin/events/mis-xv/session', { password: 'clave-larga' })

    get.mockResolvedValueOnce({ data: { invitations: [] } })
    await getOverview('mis-xv', 't0k')
    expect(get).toHaveBeenCalledWith('/admin/events/mis-xv', {
      headers: { Authorization: 'Bearer t0k' },
    })
  })

  it('los colores de la entrada salen de la página la primera vez y luego de la API', async () => {
    const brand = { title: 'XV de Nat', theme: 'jardin-azul', palette: {}, fonts: {} }
    setBoot({ kind: 'panel', key: 'mis-xv', data: { brand } })
    await expect(getBrand('mis-xv')).resolves.toEqual(brand)
    expect(get).not.toHaveBeenCalled()

    get.mockResolvedValueOnce({ data: { brand } })
    await expect(getBrand('mis-xv')).resolves.toEqual(brand)
    expect(get).toHaveBeenCalledWith('/admin/events/mis-xv/brand')
  })

  it('genera un enlace para N invitados (nombre opcional) y cambia la fecha límite', async () => {
    post.mockResolvedValueOnce({ data: { invitation: inv() } })
    await createInvitation('mis-xv', 't', 3, '  ')
    expect(post).toHaveBeenCalledWith(
      '/admin/events/mis-xv/invitations',
      { passes: 3, label: null },
      expect.anything(),
    )

    put.mockResolvedValueOnce({ data: { rsvp: { changes_left: 2 } } })
    await expect(updateDeadline('mis-xv', 't', '2026-11-10')).resolves.toEqual({ changes_left: 2 })
    expect(put).toHaveBeenCalledWith(
      '/admin/events/mis-xv/deadline',
      { deadline: '2026-11-10' },
      expect.anything(),
    )
  })

  it('elimina una invitación y devuelve el panel actualizado', async () => {
    del.mockResolvedValueOnce({ data: { version: 'v4', invitations: [] } })
    await expect(deleteInvitation('mis-xv', 't0k', '3')).resolves.toEqual({
      version: 'v4',
      invitations: [],
    })
    expect(del).toHaveBeenCalledWith('/admin/events/mis-xv/invitations/3', {
      headers: { Authorization: 'Bearer t0k' },
    })
  })

  it('al eliminar, avisa qué más se borra', () => {
    const guest = { full_name: 'Ana', attending: true, table: null, responded_at: null }
    expect(deletionWarning(inv(), false)).toBe('')
    expect(deletionWarning(inv(), true)).toBe('Se borrarán también su dedicatoria.')
    expect(deletionWarning(inv({ guests: [{ ...guest, slot: 1 }] }), false)).toBe(
      'Se borrarán también su invitado.',
    )
    expect(
      deletionWarning(
        inv({
          guests: [
            { ...guest, slot: 1 },
            { ...guest, slot: 2 },
          ],
        }),
        true,
      ),
    ).toBe('Se borrarán también sus 2 invitados y su dedicatoria.')
  })

  it('avance de cada invitación', () => {
    const guests = [
      { slot: 1, full_name: 'Ana', attending: true, table: null, responded_at: null },
      { slot: 2, full_name: 'Luis', attending: false, table: null, responded_at: null },
    ]
    expect(invitationProgress(inv({ guests }))).toEqual({
      filled: 2,
      attending: 1,
      declined: 1,
      empty: 1,
      complete: false,
    })
  })

  it('texto de los cambios de fecha que quedan', () => {
    const rsvp = { deadline: null, open: true, changes_used: 0, max_changes: 3 }
    expect(changesLabel({ ...rsvp, changes_left: 3 })).toBe('Te quedan 3 de 3 cambios')
    expect(changesLabel({ ...rsvp, changes_left: 1 })).toBe('Te queda 1 de 3 cambios')
    expect(changesLabel({ ...rsvp, changes_left: 0 })).toBe('Ya usaste los 3 cambios')
  })

  it('la fecha límite va de hoy al día del evento, en la zona del evento', () => {
    const event = {
      slug: 'x',
      title: '',
      celebrant: {},
      starts_at: '2026-11-28T17:00:00-06:00',
      timezone: 'America/Mexico_City',
      published: true,
    }
    // 13-oct 03:00 UTC todavía es 12-oct en México
    expect(deadlineBounds({ event }, new Date('2026-10-13T03:00:00Z'))).toEqual({
      min: '2026-10-12',
      max: '2026-11-28',
    })
  })

  it('busca por nombre, por número o por invitado', () => {
    const list = [
      inv(),
      inv({
        id: '2',
        label: null,
        guests: [
          { slot: 1, full_name: 'Luis Gómez', attending: true, table: null, responded_at: null },
        ],
      }),
    ]
    expect(filterInvitations(list, 'pérez').map((i) => i.id)).toEqual(['1'])
    expect(filterInvitations(list, '#2').map((i) => i.id)).toEqual(['2'])
    expect(filterInvitations(list, 'gómez').map((i) => i.id)).toEqual(['2'])
    expect(filterInvitations(list, ' ')).toHaveLength(2)
  })
})

describe('lista completa de invitados', () => {
  const g = (slot: number, full_name: string, attending: boolean, table: number | null = null) => ({
    slot,
    full_name,
    attending,
    table,
    responded_at: null,
  })
  const list = [
    inv({
      id: '1',
      label: 'Familia Pérez',
      passes: 3,
      guests: [g(1, 'Ana Pérez', true, 5), g(2, 'Luis Pérez', false)],
    }),
    inv({ id: '2', label: null, passes: 2, guests: [g(1, 'Eva Ruiz', true)] }),
  ]

  it('una fila por lugar, con los lugares libres', () => {
    const rows = guestRows(list)
    expect(rows.map((r) => [r.key, r.name, r.table])).toEqual([
      ['1-1', 'Ana Pérez', 5],
      ['1-2', 'Luis Pérez', null],
      ['1-3', null, null],
      ['2-1', 'Eva Ruiz', null],
      ['2-2', null, null],
    ])
  })

  it('filtra por estado y busca por nombre, invitación o mesa', () => {
    const rows = guestRows(list)
    const names = (r: ReturnType<typeof guestRows>) => r.map((x) => x.name ?? `libre ${x.key}`)
    expect(names(filterGuests(rows, 'all'))).toEqual(['Ana Pérez', 'Luis Pérez', 'Eva Ruiz'])
    expect(names(filterGuests(rows, 'attending'))).toEqual(['Ana Pérez', 'Eva Ruiz'])
    expect(names(filterGuests(rows, 'declined'))).toEqual(['Luis Pérez'])
    expect(names(filterGuests(rows, 'no-table'))).toEqual(['Eva Ruiz'])
    expect(names(filterGuests(rows, 'empty'))).toEqual(['libre 1-3', 'libre 2-2'])
    expect(names(filterGuests(rows, 'all', 'pérez'))).toEqual(['Ana Pérez', 'Luis Pérez'])
    expect(names(filterGuests(rows, 'all', '#2'))).toEqual(['Eva Ruiz'])
    expect(names(filterGuests(rows, 'all', 'Mesa 5'))).toEqual(['Ana Pérez'])
    expect(guestCounts(rows)).toEqual({
      all: 3,
      attending: 2,
      declined: 1,
      'no-table': 1,
      empty: 2,
    })
  })

  it('resumen por mesa (solo quienes asisten)', () => {
    expect(tableSummary(guestRows(list))).toEqual({
      tables: [{ table: 5, people: 1 }],
      unassigned: 1,
    })
  })

  it('número de mesa: vacío quita la mesa; lo que no sea 1…999 no vale', () => {
    expect(parseTable(' 12 ')).toBe(12)
    expect(parseTable('')).toBeNull()
    expect(parseTable('0')).toBeUndefined()
    expect(parseTable('1000')).toBeUndefined()
    expect(parseTable('3a')).toBeUndefined()
  })

  it('pide la huella y asigna mesas', async () => {
    get.mockResolvedValueOnce({ data: { version: 'v2' } })
    await expect(getVersion('mis-xv', 't')).resolves.toBe('v2')
    expect(get).toHaveBeenCalledWith('/admin/events/mis-xv/version', expect.anything())

    put.mockResolvedValueOnce({ data: { version: 'v3' } })
    const assignments = [{ invitation: '1', slot: 1, table: 5 }]
    await assignTables('mis-xv', 't', assignments)
    expect(put).toHaveBeenCalledWith(
      '/admin/events/mis-xv/tables',
      { assignments },
      expect.anything(),
    )
  })
})

describe('filterDedications', () => {
  const list = [
    {
      invitation: '1',
      label: 'Familia Pérez',
      name: 'Ana',
      message: '¡Felicidades, Nat!',
      sent_at: null,
    },
    { invitation: '2', label: null, name: 'Luis', message: 'Te queremos mucho', sent_at: null },
  ]
  it('busca por quién la escribió, la invitación o el texto', () => {
    expect(filterDedications(list, 'pérez').map((d) => d.name)).toEqual(['Ana'])
    expect(filterDedications(list, 'QUEREMOS').map((d) => d.name)).toEqual(['Luis'])
    expect(filterDedications(list, '  ')).toBe(list)
  })
})
