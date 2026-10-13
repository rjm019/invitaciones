import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/http'

const api = vi.hoisted(() => ({
  login: vi.fn(),
  getOverview: vi.fn(),
  getVersion: vi.fn(),
  createInvitation: vi.fn(),
  updateDeadline: vi.fn(),
  assignTables: vi.fn(),
}))
vi.mock('@/services/panelService', () => api)

import { usePanel } from '../usePanel'

const overview = { version: 'v1', rsvp: { changes_left: 3 }, invitations: [] }

describe('usePanel', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset())
    sessionStorage.clear()
  })

  it('entra con la clave, guarda la sesión de la pestaña y carga el panel', async () => {
    api.login.mockResolvedValue({ token: 't0k', expires_at: 'x' })
    api.getOverview.mockResolvedValue(overview)
    const panel = usePanel('mis-xv')

    await panel.login('clave-larga')
    expect(panel.token.value).toBe('t0k')
    expect(sessionStorage.getItem('panel:mis-xv')).toBe('t0k')
    expect(panel.overview.value).toEqual(overview)

    // Al recargar la pestaña la sesión sigue.
    expect(usePanel('mis-xv').token.value).toBe('t0k')
  })

  it('una clave incorrecta no abre sesión y el error llega al formulario', async () => {
    api.login.mockRejectedValue(new ApiError('La clave no es correcta.', 422))
    const panel = usePanel('mis-xv')
    await expect(panel.login('otra')).rejects.toThrow('La clave no es correcta.')
    expect(panel.token.value).toBeNull()
  })

  it('si la sesión venció, sale del panel con el aviso', async () => {
    sessionStorage.setItem('panel:mis-xv', 'viejo')
    api.getOverview.mockRejectedValue(
      new ApiError('Tu sesión terminó. Escribe la clave de nuevo.', 401),
    )
    const panel = usePanel('mis-xv')

    await panel.refresh()
    expect(panel.token.value).toBeNull()
    expect(panel.error.value).toBe('Tu sesión terminó. Escribe la clave de nuevo.')
    expect(sessionStorage.getItem('panel:mis-xv')).toBeNull()
  })

  it('generar un enlace actualiza la lista; cambiar la fecha actualiza los cambios que quedan', async () => {
    sessionStorage.setItem('panel:mis-xv', 't0k')
    api.getOverview.mockResolvedValue(overview)
    api.createInvitation.mockResolvedValue({ id: '1', passes: 3 })
    api.updateDeadline.mockResolvedValue({ changes_left: 2 })
    const panel = usePanel('mis-xv')
    await panel.refresh()

    await expect(panel.create(3, 'Familia Pérez')).resolves.toEqual({ id: '1', passes: 3 })
    expect(api.createInvitation).toHaveBeenCalledWith('mis-xv', 't0k', 3, 'Familia Pérez')
    expect(api.getOverview).toHaveBeenCalledTimes(2)

    await panel.changeDeadline('2026-11-10')
    expect(panel.overview.value?.rsvp).toEqual({ changes_left: 2 })
  })
  it('en vivo: solo recarga el panel cuando la huella del evento cambió', async () => {
    sessionStorage.setItem('panel:mis-xv', 't0k')
    api.getOverview.mockResolvedValue(overview)
    const panel = usePanel('mis-xv')
    await panel.refresh()

    api.getVersion.mockResolvedValueOnce('v1')
    await panel.checkForChanges()
    expect(api.getOverview).toHaveBeenCalledTimes(1) // nada nuevo
    expect(panel.live.value).toBe('live')

    api.getVersion.mockResolvedValueOnce('v2') // un invitado abrió su invitación
    api.getOverview.mockResolvedValueOnce({ ...overview, version: 'v2' })
    await panel.checkForChanges()
    expect(api.getOverview).toHaveBeenCalledTimes(2)
    expect(panel.overview.value?.version).toBe('v2')

    api.getVersion.mockRejectedValueOnce(new ApiError('No hay conexión.', 0))
    await panel.checkForChanges()
    expect(panel.live.value).toBe('offline')
  })

  it('asignar mesa reemplaza el panel con lo que devuelve el servidor', async () => {
    sessionStorage.setItem('panel:mis-xv', 't0k')
    api.assignTables.mockResolvedValue({ ...overview, version: 'v9' })
    const panel = usePanel('mis-xv')
    await panel.assignTables([{ invitation: '1', slot: 1, table: 5 }])
    expect(api.assignTables).toHaveBeenCalledWith('mis-xv', 't0k', [
      { invitation: '1', slot: 1, table: 5 },
    ])
    expect(panel.overview.value?.version).toBe('v9')
  })
})
