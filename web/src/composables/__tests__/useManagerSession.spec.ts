import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('@/services/managerService', () => api)

const STORAGE_KEY = 'gestor:sesion'
const later = () => new Date(Date.now() + 3_600_000).toISOString()

/** La sesión vive en el módulo: cada prueba lo carga de nuevo, como al abrir la página. */
async function fresh() {
  vi.resetModules()
  const { useManagerSession } = await import('../useManagerSession')
  const { ApiError } = await import('@/services/http')
  return { useManagerSession, ApiError }
}

describe('useManagerSession', () => {
  beforeEach(() => {
    api.login.mockReset()
    localStorage.clear()
  })

  it('entra con la clave, guarda la sesión y la comparten el inicio y el editor', async () => {
    const { useManagerSession } = await fresh()
    api.login.mockResolvedValue({ token: 'tok', expires_at: later() })
    const home = useManagerSession()

    await home.login('clave-maestra-larga')
    expect(api.login).toHaveBeenCalledWith('clave-maestra-larga')
    expect(home.authenticated.value).toBe(true)
    expect(useManagerSession().token.value).toBe('tok')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).token).toBe('tok')
  })

  it('al abrir otra pestaña sigue la sesión; si ya venció o está dañada, pide la clave', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'tok', expires_at: later() }))
    expect((await fresh()).useManagerSession().authenticated.value).toBe(true)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: 'tok', expires_at: '2020-01-01T00:00:00Z' }),
    )
    expect((await fresh()).useManagerSession().authenticated.value).toBe(false)

    localStorage.setItem(STORAGE_KEY, '{dañada')
    expect((await fresh()).useManagerSession().authenticated.value).toBe(false)
  })

  it('una clave incorrecta no abre sesión y el error llega al formulario', async () => {
    const { useManagerSession, ApiError } = await fresh()
    api.login.mockRejectedValue(new ApiError('La clave no es correcta.', 422))
    const session = useManagerSession()

    await expect(session.login('otra')).rejects.toThrow('La clave no es correcta.')
    expect(session.authenticated.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('si el servidor dice que la sesión venció (401), sale con el aviso', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'tok', expires_at: later() }))
    const { useManagerSession, ApiError } = await fresh()
    const session = useManagerSession()

    const call = vi.fn().mockRejectedValue(new ApiError('Tu sesión terminó.', 401))
    await expect(session.withSession(call)).rejects.toThrow('Tu sesión terminó.')
    expect(call).toHaveBeenCalledWith('tok')
    expect(session.authenticated.value).toBe(false)
    expect(session.message.value).toBe('Tu sesión terminó.')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('otros errores no cierran la sesión; sin sesión, ni siquiera se llama', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'tok', expires_at: later() }))
    const { useManagerSession, ApiError } = await fresh()
    const session = useManagerSession()

    await expect(
      session.withSession(() => Promise.reject(new ApiError('Falló el servidor.', 500))),
    ).rejects.toThrow()
    expect(session.authenticated.value).toBe(true)

    session.logout()
    const call = vi.fn()
    await expect(session.withSession(call)).rejects.toMatchObject({ status: 401 })
    expect(call).not.toHaveBeenCalled()
  })
})
