import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManagerUser } from '@/types/design'

const api = vi.hoisted(() => ({ listUsers: vi.fn() }))
vi.mock('@/services/managerService', () => api)

const STORAGE_KEY = 'gestor:sesion'
const person = (username: string, over: Partial<ManagerUser> = {}): ManagerUser => ({
  username,
  name: username,
  role: 'editor',
  active: true,
  must_change_password: false,
  created_at: null,
  last_login_at: null,
  ...over,
})
const sessionOf = (username: string) =>
  JSON.stringify({
    token: `tok-${username}`,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    user: person(username, { role: 'admin' }),
  })

/** La lista y la sesión viven en sus módulos: cada prueba los carga de nuevo. */
async function fresh() {
  vi.resetModules()
  const { useManagerPeople } = await import('../useManagerPeople')
  const { useManagerSession } = await import('../useManagerSession')
  return { useManagerPeople, useManagerSession }
}

describe('useManagerPeople', () => {
  beforeEach(() => {
    api.listUsers.mockReset()
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, sessionOf('ana'))
  })

  it('"Datos generales" la pide una vez y después usa la que ya tiene', async () => {
    const { useManagerPeople } = await fresh()
    api.listUsers.mockResolvedValue([person('ana'), person('beto')])

    const [first, second] = await Promise.all([
      useManagerPeople().load(),
      useManagerPeople().load(),
    ])
    await useManagerPeople().load()
    expect(api.listUsers).toHaveBeenCalledTimes(1)
    expect(api.listUsers).toHaveBeenCalledWith('tok-ana')
    expect(first).toEqual(second)
    expect(useManagerPeople().people.value.map((p) => p.username)).toEqual(['ana', 'beto'])
  })

  it('"Personas del gestor" la vuelve a pedir y la deja al día con lo que cambia', async () => {
    const { useManagerPeople } = await fresh()
    api.listUsers.mockResolvedValueOnce([person('beto')]).mockResolvedValueOnce([person('beto')])
    const people = useManagerPeople()
    await people.load()
    await people.load(true)
    expect(api.listUsers).toHaveBeenCalledTimes(2)

    people.put(person('beto', { active: false }))
    people.put(person('caro'))
    expect(people.people.value).toEqual([person('beto', { active: false }), person('caro')])
  })

  it('si entra otra persona, la lista se pide otra vez', async () => {
    const { useManagerPeople, useManagerSession } = await fresh()
    api.listUsers.mockResolvedValue([person('ana')])
    await useManagerPeople().load()

    localStorage.setItem(STORAGE_KEY, sessionOf('caro'))
    window.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }))
    expect(useManagerSession().user.value?.username).toBe('caro')
    await useManagerPeople().load()
    expect(api.listUsers).toHaveBeenCalledTimes(2)
    expect(api.listUsers).toHaveBeenLastCalledWith('tok-caro')
  })

  it('si falla, el siguiente intento vuelve a pedirla', async () => {
    const { useManagerPeople } = await fresh()
    api.listUsers
      .mockRejectedValueOnce(new Error('Sin conexión.'))
      .mockResolvedValue([person('ana')])
    await expect(useManagerPeople().load()).rejects.toThrow('Sin conexión.')
    await expect(useManagerPeople().load()).resolves.toEqual([person('ana')])
  })
})
