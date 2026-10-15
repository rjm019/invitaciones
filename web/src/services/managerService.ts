import type {
  Catalog,
  Design,
  DesignBuild,
  DesignHistory,
  DesignPayload,
  ManagerEvent,
  ManagerSettings,
  ManagerUser,
  MediaFile,
} from '@/types/design'
import { http } from './http'

/** Llamadas del gestor (/api/manager). La sesión es un token (Authorization: Bearer). */

export interface ManagerSession {
  token: string
  expires_at: string
  user: ManagerUser
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
const event = (slug: string) => `/manager/events/${encodeURIComponent(slug)}`

/** ¿El gestor está encendido? ¿Falta crear la primera cuenta? */
export async function getStatus(): Promise<{ enabled: boolean; setup: boolean }> {
  const { data } = await http.get<{ enabled: boolean; setup: boolean }>('/manager/session')
  return data
}

export async function login(username: string, password: string): Promise<ManagerSession> {
  const { data } = await http.post<ManagerSession>('/manager/session', { username, password })
  return data
}

export interface FirstAccount {
  master_password: string
  name: string
  username: string
  password: string
}

/** La primera cuenta (administra), con la clave maestra. */
export async function setup(account: FirstAccount): Promise<ManagerSession> {
  const { data } = await http.post<ManagerSession>('/manager/setup', account)
  return data
}

export async function getMe(token: string): Promise<ManagerUser> {
  const { data } = await http.get<{ user: ManagerUser }>('/manager/me', auth(token))
  return data.user
}

/** Cambia mi clave; la sesión anterior deja de servir y llega una nueva. */
export async function changePassword(
  token: string,
  current: string,
  password: string,
): Promise<ManagerSession> {
  const { data } = await http.put<ManagerSession>(
    '/manager/me/password',
    { current_password: current, password },
    auth(token),
  )
  return data
}

export async function listUsers(token: string): Promise<ManagerUser[]> {
  const { data } = await http.get<{ users: ManagerUser[] }>('/manager/users', auth(token))
  return data.users
}

/** Agrega una persona; la clave temporal llega una sola vez. */
export async function createUser(
  token: string,
  person: { name: string; username: string; role: ManagerUser['role'] },
): Promise<{ user: ManagerUser; password: string }> {
  const { data } = await http.post<{ user: ManagerUser; password: string }>(
    '/manager/users',
    person,
    auth(token),
  )
  return data
}

export async function updateUser(
  token: string,
  username: string,
  changes: Partial<{
    name: string
    role: ManagerUser['role']
    active: boolean
    reset_password: true
  }>,
): Promise<{ user: ManagerUser; password?: string }> {
  const { data } = await http.put<{ user: ManagerUser; password?: string }>(
    `/manager/users/${encodeURIComponent(username)}`,
    changes,
    auth(token),
  )
  return data
}

export async function getCatalog(token: string): Promise<Catalog> {
  const { data } = await http.get<{ catalog: Catalog }>('/manager/catalog', auth(token))
  return data.catalog
}

export async function listEvents(token: string): Promise<ManagerEvent[]> {
  const { data } = await http.get<{ events: ManagerEvent[] }>('/manager/events', auth(token))
  return data.events
}

export interface NewEvent {
  slug: string
  source: 'blank' | 'event'
  from?: string
  template?: boolean
  event?: Partial<
    Record<'tipo' | 'festejada' | 'festejada_corto' | 'pareja' | 'inicia' | 'titulo', string>
  >
}

export async function createEvent(
  token: string,
  body: NewEvent,
): Promise<{ slug: string; panel_password: string | null }> {
  const { data } = await http.post<{ slug: string; panel_password: string | null }>(
    '/manager/events',
    body,
    auth(token),
  )
  return data
}

export async function getDesign(token: string, slug: string): Promise<DesignPayload> {
  const { data } = await http.get<DesignPayload>(`${event(slug)}/design`, auth(token))
  return data
}

/** Guarda el borrador. Si la invitación cambió en otra ventana, lanza ApiError 409. */
export async function saveDraft(
  token: string,
  slug: string,
  design: Design,
  version: string,
): Promise<DesignBuild> {
  const { data } = await http.put<DesignBuild>(
    `${event(slug)}/draft`,
    { design, version },
    { ...auth(token), timeout: 30000 },
  )
  return data
}

export async function discardDraft(token: string, slug: string): Promise<DesignPayload> {
  const { data } = await http.delete<DesignPayload>(`${event(slug)}/draft`, auth(token))
  return data
}

export async function publish(
  token: string,
  slug: string,
  version: string,
  replaceOwnerDeadline = false,
): Promise<{ published_at: string; migrated: boolean; version: string }> {
  const { data } = await http.post<{ published_at: string; migrated: boolean; version: string }>(
    `${event(slug)}/publish`,
    { version, replace_owner_deadline: replaceOwnerDeadline },
    auth(token),
  )
  return data
}

export async function getHistory(token: string, slug: string): Promise<DesignHistory> {
  const { data } = await http.get<DesignHistory>(`${event(slug)}/history`, auth(token))
  return data
}

export async function restoreVersion(
  token: string,
  slug: string,
  id: string,
): Promise<DesignPayload> {
  const { data } = await http.post<DesignPayload>(
    `${event(slug)}/history/${encodeURIComponent(id)}/restore`,
    {},
    auth(token),
  )
  return data
}

export async function updateSettings(
  token: string,
  slug: string,
  changes: { panel_password?: string | null; published?: boolean },
): Promise<ManagerSettings> {
  const { data } = await http.put<{ settings: ManagerSettings }>(
    `${event(slug)}/settings`,
    changes,
    auth(token),
  )
  return data.settings
}

export async function listMedia(
  token: string,
  slug: string,
): Promise<{ files: MediaFile[]; total_bytes: number }> {
  const { data } = await http.get<{ files: MediaFile[]; total_bytes: number }>(
    `${event(slug)}/media`,
    auth(token),
  )
  return data
}

export async function uploadMedia(
  token: string,
  slug: string,
  file: Blob,
  name: string,
  options: {
    purpose?: 'fondo' | 'foto' | 'adorno'
    trim?: boolean
    onProgress?: (fraction: number) => void
  } = {},
): Promise<MediaFile> {
  const form = new FormData()
  form.append('file', file, name)
  if (options.purpose) form.append('purpose', options.purpose)
  if (options.trim) form.append('trim', '1')
  const { data } = await http.post<{ file: MediaFile }>(`${event(slug)}/media`, form, {
    ...auth(token),
    timeout: 120000,
    onUploadProgress: (e) => {
      if (e.total) options.onProgress?.(e.loaded / e.total)
    },
  })
  return data.file
}

export async function deleteMedia(token: string, slug: string, name: string): Promise<void> {
  await http.delete(`${event(slug)}/media/${encodeURIComponent(name)}`, auth(token))
}

/** Descarga la invitación (csv, xlsx o zip) como archivo. */
export async function exportDesign(
  token: string,
  slug: string,
  format: 'csv' | 'xlsx' | 'zip',
): Promise<{ blob: Blob; name: string }> {
  const { data } = await http.get<Blob>(`${event(slug)}/export`, {
    ...auth(token),
    params: { format },
    responseType: 'blob',
    timeout: 120000,
  })
  return { blob: data, name: `invitacion-${slug}.${format}` }
}

export async function importDesign(
  token: string,
  slug: string,
  file: File,
): Promise<DesignPayload & { import: { warnings: string[]; media: string[] } }> {
  const form = new FormData()
  form.append('file', file, file.name)
  const { data } = await http.post<
    DesignPayload & { import: { warnings: string[]; media: string[] } }
  >(`${event(slug)}/import`, form, { ...auth(token), timeout: 120000 })
  return data
}
