import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManagerUser } from '@/types/design'

const api = vi.hoisted(() => ({
  login: vi.fn(),
  setup: vi.fn(),
  changePassword: vi.fn(),
  getMe: vi.fn(),
}))
vi.mock('@/services/managerService', () => api)

const STORAGE_KEY = 'gestor:sesion'
const later = () => new Date(Date.now() + 3_600_000).toISOString()
const person = (over: Partial<ManagerUser> = {}): ManagerUser => ({
  username: 'ana',
  name: 'Ana López',
  role: 'admin',
  active: true,
  must_change_password: false,
  created_at: null,
  last_login_at: null,
  ...over,
})
const stored = (over: Partial<ManagerUser> = {}, token = 'tok') =>
  JSON.stringify({ token, expires_at: later(), user: person(over) })

/** La sesión vive en el módulo: cada prueba lo carga de nuevo, como al abrir la página. */
async function fresh() {
  vi.resetModules()
  const { useManagerSession } = await import('../useManagerSession')
  const { ApiError } = await import('@/services/http')
  return { useManagerSession, ApiError }
}

describe('useManagerSession', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    localStorage.clear()
  })

  it('entra con usuario y clave, guarda quién es y la comparten el inicio y el editor', async () => {
    const { useManagerSession } = await fresh()
    api.login.mockResolvedValue({ token: 'tok', expires_at: later(), user: person() })
    const home = useManagerSession()

    await home.login('ana', 'su-clave-larga')
    expect(api.login).toHaveBeenCalledWith('ana', 'su-clave-larga')
    expect(home.authenticated.value).toBe(true)
    expect(home.isAdmin.value).toBe(true)
    expect(useManagerSession().user.value?.name).toBe('Ana López')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).token).toBe('tok')
  })

  it('al abrir otra pestaña sigue la sesión; si venció, está dañada o es de antes, pide entrar', async () => {
    localStorage.setItem(STORAGE_KEY, stored())
    expect((await fresh()).useManagerSession().authenticated.value).toBe(true)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: 'tok', expires_at: '2020-01-01T00:00:00Z', user: person() }),
    )
    expect((await fresh()).useManagerSession().authenticated.value).toBe(false)

    // Las sesiones de la clave maestra (sin persona) ya no sirven.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'tok', expires_at: later() }))
    expect((await fresh()).useManagerSession().authenticated.value).toBe(false)

    localStorage.setItem(STORAGE_KEY, '{dañada')
    expect((await fresh()).useManagerSession().authenticated.value).toBe(false)
  })

  it('con clave temporal no está adentro hasta elegir la suya', async () => {
    const { useManagerSession } = await fresh()
    api.login.mockResolvedValue({
      token: 'temp-tok',
      expires_at: later(),
      user: person({ role: 'editor', must_change_password: true }),
    })
    api.changePassword.mockResolvedValue({ token: 'nuevo', expires_at: later(), user: person() })
    const session = useManagerSession()

    await session.login('ana', 'k7m2-p9qa-x4tb')
    expect(session.authenticated.value).toBe(false)
    expect(session.mustChangePassword.value).toBe(true)

    await session.changePassword('k7m2-p9qa-x4tb', 'la-mia-de-ahora')
    expect(api.changePassword).toHaveBeenCalledWith('temp-tok', 'k7m2-p9qa-x4tb', 'la-mia-de-ahora')
    expect(session.authenticated.value).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).token).toBe('nuevo')
  })

  it('la primera cuenta se crea con la clave maestra y ya queda adentro', async () => {
    const { useManagerSession } = await fresh()
    api.setup.mockResolvedValue({ token: 'tok', expires_at: later(), user: person() })
    const session = useManagerSession()
    const account = {
      master_password: 'maestra',
      name: 'Ana',
      username: 'ana',
      password: 'x'.repeat(10),
    }

    await session.setup(account)
    expect(api.setup).toHaveBeenCalledWith(account)
    expect(session.authenticated.value).toBe(true)
  })

  it('una clave incorrecta no abre sesión y el error llega al formulario', async () => {
    const { useManagerSession, ApiError } = await fresh()
    api.login.mockRejectedValue(new ApiError('El usuario o la clave no son correctos.', 422))
    const session = useManagerSession()

    await expect(session.login('ana', 'otra')).rejects.toThrow(
      'El usuario o la clave no son correctos.',
    )
    expect(session.authenticated.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('si el servidor dice que la sesión venció (401), sale con el aviso', async () => {
    localStorage.setItem(STORAGE_KEY, stored())
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
    localStorage.setItem(STORAGE_KEY, stored())
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

  it('sigue a las otras pestañas (otra clave, salir) y trae mi rol si lo cambiaron', async () => {
    localStorage.setItem(STORAGE_KEY, stored())
    const { useManagerSession } = await fresh()
    const session = useManagerSession()

    localStorage.setItem(STORAGE_KEY, stored({}, 'de-la-otra-pestana'))
    window.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }))
    expect(session.token.value).toBe('de-la-otra-pestana')

    api.getMe.mockResolvedValue(person({ role: 'editor', name: 'Ana L.' }))
    await session.refresh()
    expect(session.isAdmin.value).toBe(false)
    expect(session.user.value?.name).toBe('Ana L.')

    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }))
    expect(session.authenticated.value).toBe(false)
  })

  it('mis datos al día llegan con la lista; si no cambiaron, no se vuelve a guardar nada', async () => {
    localStorage.setItem(STORAGE_KEY, stored())
    const { useManagerSession } = await fresh()
    const session = useManagerSession()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    session.setUser(person())
    expect(setItem).not.toHaveBeenCalled()

    session.setUser(person({ name: 'Ana L.', role: 'editor' }))
    expect(session.user.value?.name).toBe('Ana L.')
    expect(session.isAdmin.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).user.name).toBe('Ana L.')

    // Lo de otra persona no se mezcla con mi sesión.
    session.setUser(person({ username: 'beto', name: 'Beto' }))
    expect(session.user.value?.username).toBe('ana')
    setItem.mockRestore()
    expect(api.getMe).not.toHaveBeenCalled()
  })
})
