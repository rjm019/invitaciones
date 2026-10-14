import { ref } from 'vue'
import { ApiError } from '@/services/http'
import * as panelService from '@/services/panelService'
import type { PanelBrand, PanelInvitation, PanelOverview, TableAssignment } from '@/types/panel'

/**
 * Estado del panel de un evento. La sesión (token) se guarda solo mientras la pestaña
 * esté abierta (sessionStorage): al cerrar el navegador hay que volver a escribir la clave.
 */
export function usePanel(slug: string) {
  const storageKey = `panel:${slug}`
  const token = ref<string | null>(read())
  const overview = ref<PanelOverview | null>(null)
  /** Cómo se ve el panel; con sesión, el del panel (trae también lo de la imagen para WhatsApp). */
  const brand = ref<PanelBrand | null>(null)
  const loading = ref(false)
  const error = ref('')
  /** "live": el panel está al día con el servidor; "offline": falló la última consulta. */
  const live = ref<'idle' | 'live' | 'offline'>('idle')

  function read(): string | null {
    try {
      return sessionStorage.getItem(storageKey)
    } catch {
      return null
    }
  }
  function save(value: string | null) {
    try {
      if (value) sessionStorage.setItem(storageKey, value)
      else sessionStorage.removeItem(storageKey)
    } catch {
      // Sin almacenamiento (modo privado): la sesión dura lo que la página.
    }
  }

  function logout(message = '') {
    token.value = null
    overview.value = null
    error.value = message
    save(null)
  }

  /** Llama con la sesión; si venció (401), sale del panel con el aviso. */
  async function withSession<T>(call: (token: string) => Promise<T>): Promise<T> {
    if (!token.value) throw new ApiError('Tu sesión terminó. Escribe la clave de nuevo.', 401)
    try {
      return await call(token.value)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout(e.message)
      throw e
    }
  }

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      overview.value = await withSession((t) => panelService.getOverview(slug, t))
      brand.value = overview.value.brand
      error.value = ''
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        error.value = e instanceof Error ? e.message : 'Algo salió mal.'
    } finally {
      loading.value = false
    }
  }

  /** Lanza ApiError si la clave no es correcta (el formulario la muestra). */
  async function login(password: string): Promise<void> {
    const session = await panelService.login(slug, password)
    token.value = session.token
    save(session.token)
    error.value = ''
    await refresh()
  }

  async function create(passes: number, label: string): Promise<PanelInvitation> {
    const invitation = await withSession((t) =>
      panelService.createInvitation(slug, t, passes, label),
    )
    await refresh() // totales al día
    return invitation
  }

  /**
   * ¿Hay algo nuevo? (alguien abrió o confirmó su invitación). Pide solo la huella del
   * evento y, si cambió, vuelve a cargar el panel. Pensado para llamarse cada pocos segundos.
   */
  async function checkForChanges(): Promise<void> {
    if (!token.value) return
    try {
      const version = await withSession((t) => panelService.getVersion(slug, t))
      if (version !== overview.value?.version) await refresh()
      live.value = 'live'
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) live.value = 'offline'
    }
  }

  async function assignTables(assignments: TableAssignment[]): Promise<void> {
    overview.value = await withSession((t) => panelService.assignTables(slug, t, assignments))
  }

  /** Colores y título de la entrada; si no llegan, el panel se ve con sus colores de siempre. */
  async function loadBrand(): Promise<void> {
    if (brand.value) return
    try {
      brand.value = await panelService.getBrand(slug)
    } catch {
      // Sin marca: el panel funciona igual.
    }
  }

  async function changeDeadline(date: string): Promise<void> {
    const rsvp = await withSession((t) => panelService.updateDeadline(slug, t, date))
    if (overview.value) overview.value = { ...overview.value, rsvp }
  }

  return {
    token,
    overview,
    brand,
    loadBrand,
    loading,
    error,
    live,
    login,
    logout,
    refresh,
    checkForChanges,
    create,
    changeDeadline,
    assignTables,
  }
}
