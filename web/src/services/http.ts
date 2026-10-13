import axios, { AxiosError } from 'axios'

/** Error de la API con un mensaje listo para mostrar en español. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Record<string, string[]> | string[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Mensajes propios por estado. En 403, 409 y 422 manda el del servidor, que ya viene en
// español y dice el motivo ("cerraron el 6 de noviembre", "solo queda 1 lugar").
const SERVER_MESSAGE = [403, 409, 422]
const MESSAGES: Record<number, string> = {
  401: 'Tu sesión terminó. Escribe la clave de nuevo.',
  404: 'No encontramos esta invitación.',
  422: 'Revisa los datos e inténtalo de nuevo.',
  429: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  503: 'La invitación no está disponible por ahora.',
}

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> | string[] }>) => {
    const status = error.response?.status ?? 0
    const server = SERVER_MESSAGE.includes(status) ? error.response?.data?.message : undefined
    const message =
      status === 0
        ? 'No hay conexión. Revisa tu internet e inténtalo de nuevo.'
        : (server ??
          MESSAGES[status] ??
          error.response?.data?.message ??
          'Algo salió mal. Inténtalo de nuevo.')
    return Promise.reject(new ApiError(message, status, error.response?.data?.errors ?? []))
  },
)
