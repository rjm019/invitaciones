import { computed, ref } from 'vue'
import { ApiError } from '@/services/http'
import * as managerService from '@/services/managerService'

/**
 * Sesión del gestor. Se guarda en este navegador (localStorage) hasta que vence (12 h):
 * el gestor trabaja desde su computadora y abre varias pestañas (una por invitación).
 * Es una sola para toda la app: el inicio y el editor la comparten.
 */
const STORAGE_KEY = 'gestor:sesion'

interface Stored {
  token: string
  expires_at: string
}

function read(): Stored | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Stored | null
    return stored && Date.parse(stored.expires_at) > Date.now() ? stored : null
  } catch {
    return null
  }
}

function write(value: Stored | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura lo que la página.
  }
}

const session = ref<Stored | null>(read())
const message = ref('')

export function useManagerSession() {
  const token = computed(() => session.value?.token ?? null)
  const authenticated = computed(() => token.value !== null)

  /** Lanza ApiError si la clave no es correcta (el formulario la muestra). */
  async function login(password: string): Promise<void> {
    const created = await managerService.login(password)
    session.value = created
    message.value = ''
    write(created)
  }

  function logout(reason = ''): void {
    session.value = null
    message.value = reason
    write(null)
  }

  /** Llama con la sesión; si venció (401), sale con el aviso. */
  async function withSession<T>(call: (token: string) => Promise<T>): Promise<T> {
    const current = token.value
    if (!current) throw new ApiError('Tu sesión terminó. Escribe la clave de nuevo.', 401)
    try {
      return await call(current)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout(e.message)
      throw e
    }
  }

  return { token, authenticated, message, login, logout, withSession }
}
