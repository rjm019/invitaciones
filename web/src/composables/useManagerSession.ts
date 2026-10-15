import { computed, ref } from 'vue'
import { ApiError } from '@/services/http'
import * as managerService from '@/services/managerService'
import type { FirstAccount, ManagerSession } from '@/services/managerService'
import type { ManagerUser } from '@/types/design'

/**
 * Sesión del gestor: quién entró y su token. Se guarda en este navegador (localStorage)
 * hasta que vence (12 h): el gestor trabaja desde su computadora y abre varias pestañas
 * (una por invitación). Es una sola para toda la app: el inicio y el editor la comparten,
 * y las otras pestañas se enteran si cambia (otra clave, salir).
 *
 * Quien entra con una clave temporal todavía no está "adentro": primero elige la suya.
 */
const STORAGE_KEY = 'gestor:sesion'

function read(): ManagerSession | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ManagerSession | null
    return stored?.token && stored.user?.username && Date.parse(stored.expires_at) > Date.now()
      ? stored
      : null
  } catch {
    return null
  }
}

function write(value: ManagerSession | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura lo que la página.
  }
}

const session = ref<ManagerSession | null>(read())
const message = ref('')

// Otra pestaña entró, salió o cambió la clave: esta usa lo mismo (vive lo que la página).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) session.value = read()
  })
}

export function useManagerSession() {
  const token = computed(() => session.value?.token ?? null)
  const user = computed<ManagerUser | null>(() => session.value?.user ?? null)
  const mustChangePassword = computed(() => user.value?.must_change_password === true)
  const authenticated = computed(() => token.value !== null && !mustChangePassword.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function start(created: ManagerSession): void {
    session.value = created
    message.value = ''
    write(created)
  }

  /** Lanza ApiError si el usuario o la clave no son correctos (el formulario lo muestra). */
  async function login(username: string, password: string): Promise<void> {
    start(await managerService.login(username, password))
  }

  /** La primera cuenta, con la clave maestra. */
  async function setup(account: FirstAccount): Promise<void> {
    start(await managerService.setup(account))
  }

  /** Mi clave nueva: el servidor cierra las sesiones de antes y manda una nueva. */
  async function changePassword(current: string, password: string): Promise<void> {
    start(await withSession((t) => managerService.changePassword(t, current, password)))
  }

  /** Vuelve a leer mis datos (otra persona pudo cambiar mi nombre o mi rol). */
  async function refresh(): Promise<void> {
    const fresh = await withSession((t) => managerService.getMe(t))
    if (session.value) start({ ...session.value, user: fresh })
  }

  function logout(reason = ''): void {
    session.value = null
    message.value = reason
    write(null)
  }

  /** Llama con la sesión; si venció (401), sale con el aviso. */
  async function withSession<T>(call: (token: string) => Promise<T>): Promise<T> {
    const current = token.value
    if (!current) throw new ApiError('Tu sesión terminó. Entra de nuevo.', 401)
    try {
      return await call(current)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout(e.message)
      throw e
    }
  }

  return {
    token,
    user,
    authenticated,
    mustChangePassword,
    isAdmin,
    message,
    login,
    setup,
    changePassword,
    refresh,
    logout,
    withSession,
  }
}
