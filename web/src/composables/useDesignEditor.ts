import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  canRedo,
  canUndo,
  createHistory,
  record,
  redo as redoHistory,
  undo as undoHistory,
  type History,
} from '@/services/designHistoryService'
import { sameDesign } from '@/services/designService'
import { ApiError } from '@/services/http'
import * as managerService from '@/services/managerService'
import { needsServer } from '@/services/previewPatchService'
import type {
  Catalog,
  Design,
  DesignBuild,
  DesignChange,
  DesignIssue,
  DesignPayload,
  ManagerSettings,
  SettingsChange,
} from '@/types/design'
import type { EventConfig } from '@/types/event'
import type { PanelBrand } from '@/types/panel'

export type SaveStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'offline' | 'error' | 'conflict'

type WithSession = <T>(call: (token: string) => Promise<T>) => Promise<T>

/**
 * Pausa después de la última tecla antes de guardar, y espera máxima mientras se escribe.
 * Si la vista previa necesita al servidor para mostrar el cambio (una lista, una imagen, una
 * sección nueva…), se guarda pronto; si ya lo muestra sola (estilo y textos tal cual), con
 * calma: así escribir un párrafo no manda una petición cada segundo.
 */
export const SAVE_DELAY = 400
export const SAVE_MAX_WAIT = 2000
export const CALM_DELAY = 1000
export const CALM_MAX_WAIT = 5000
export const RETRY_DELAY = 4000

/** El catálogo solo cambia con una versión nueva del sistema: se pide una vez por página. */
let catalogRequest: Promise<Catalog> | null = null

/** Olvida el catálogo ya pedido (para las pruebas). */
export function forgetCatalog(): void {
  catalogRequest = null
}

/**
 * El editor de una invitación: lo que la persona tiene enfrente (con deshacer y rehacer),
 * el autoguardado del borrador (una petición a la vez; si algo cambió mientras tanto, se
 * guarda otra vez al terminar), la config que el servidor arma para la vista previa y lo
 * que hay que revisar. Si otra ventana guardó antes (409), se detiene y pregunta.
 */
export function useDesignEditor(slug: string, withSession: WithSession) {
  const catalog = shallowRef<Catalog | null>(null)
  const history = shallowRef<History<Design> | null>(null)
  const design = computed(() => history.value?.present ?? null)
  const version = ref('')
  const source = ref<DesignPayload['source']>('live')
  const config = shallowRef<EventConfig | null>(null)
  const issues = ref<DesignIssue[]>([])
  const brand = shallowRef<PanelBrand | null>(null)
  const changes = ref<DesignChange[]>([])
  const hasDraft = ref(false)
  const pending = ref(false)
  const settings = ref<ManagerSettings | null>(null)
  const conversion = ref<DesignPayload['conversion']>(null)
  const warnings = ref<string[]>([])
  const status = ref<SaveStatus>('loading')
  const error = ref('')
  const conflict = shallowRef<{ version: string; design: Design } | null>(null)

  /** Lo último que tiene el servidor (para no guardar dos veces lo mismo). */
  let saved: Design | null = null
  let delayTimer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let maxDeadline = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let inFlight: Promise<void> | null = null
  let queued = false

  const describe = (e: unknown) => (e instanceof Error ? e.message : 'Algo salió mal.')

  function applyBuild(build: DesignBuild): void {
    version.value = build.version
    config.value = build.config
    issues.value = build.issues
    brand.value = build.brand
    changes.value = build.changes ?? []
    hasDraft.value = build.has_draft
    pending.value = build.pending
  }

  function apply(payload: DesignPayload): void {
    history.value = createHistory(payload.design)
    saved = payload.design
    applyBuild(payload)
    source.value = payload.source
    settings.value = payload.settings
    conversion.value = payload.conversion
    warnings.value = payload.warnings
    conflict.value = null
    status.value = 'saved'
    error.value = ''
  }

  async function load(): Promise<void> {
    status.value = 'loading'
    error.value = ''
    try {
      catalogRequest ??= withSession((t) => managerService.getCatalog(t)).catch((e) => {
        catalogRequest = null
        throw e
      })
      const [loadedCatalog, payload] = await Promise.all([
        catalog.value ?? catalogRequest,
        withSession((t) => managerService.getDesign(t, slug)),
      ])
      catalog.value = loadedCatalog
      apply(payload)
    } catch (e) {
      status.value = 'error'
      error.value = describe(e)
    }
  }

  function clearTimers(): void {
    clearTimeout(delayTimer)
    clearTimeout(maxTimer)
    clearTimeout(retryTimer)
    maxTimer = undefined
    maxDeadline = 0
  }

  /**
   * Hay algo nuevo que guardar: pronto si la vista previa lo necesita del servidor, con calma
   * si ya lo muestra sola. Con un conflicto abierto se espera a que la persona elija.
   */
  function changed(): void {
    if (status.value === 'conflict') return
    status.value = 'dirty'
    const calm = !!saved && !!design.value && !needsServer(saved, design.value)
    const [delay, maxWait] = calm ? [CALM_DELAY, CALM_MAX_WAIT] : [SAVE_DELAY, SAVE_MAX_WAIT]
    clearTimeout(delayTimer)
    delayTimer = setTimeout(() => void save(), delay)
    const deadline = Date.now() + maxWait
    if (!maxTimer || deadline < maxDeadline) {
      clearTimeout(maxTimer)
      maxDeadline = deadline
      maxTimer = setTimeout(() => void save(), maxWait)
    }
  }

  /** Al cambiar de pestaña o de app (o apagar la pantalla), lo pendiente se guarda ya. */
  function onHidden(): void {
    if (document.visibilityState === 'hidden' && status.value === 'dirty') void save()
  }

  /** Un cambio de la persona. `key` junta en un paso de "deshacer" lo que se escribe seguido. */
  function update(next: Design, key: string | null = null): void {
    if (!history.value) return
    history.value = record(history.value, next, key, Date.now())
    changed()
  }

  async function save(): Promise<void> {
    clearTimers()
    if (inFlight) {
      queued = true
      return inFlight
    }
    const current = design.value
    if (!current || status.value === 'conflict') return
    if (saved && sameDesign(current, saved)) {
      if (status.value === 'dirty') status.value = 'saved'
      return
    }
    status.value = 'saving'
    inFlight = (async () => {
      try {
        const build = await withSession((t) =>
          managerService.saveDraft(t, slug, current, version.value),
        )
        saved = current
        applyBuild(build)
        source.value = 'draft'
        error.value = ''
        status.value = design.value && sameDesign(design.value, current) ? 'saved' : 'dirty'
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const data = e.data as { version?: string; design?: Design } | null
          conflict.value =
            data?.version && data.design ? { version: data.version, design: data.design } : null
          status.value = 'conflict'
          return
        }
        error.value = describe(e)
        status.value = e instanceof ApiError && e.status === 0 ? 'offline' : 'error'
        // Sin conexión (o un error pasajero del servidor): se reintenta solo.
        if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) {
          retryTimer = setTimeout(() => void save(), RETRY_DELAY)
        }
      } finally {
        inFlight = null
        if (queued) {
          queued = false
          void save()
        }
      }
    })()
    return inFlight
  }

  /** Espera a que todo lo pendiente quede guardado (antes de publicar o de salir). */
  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      if (inFlight) await inFlight
      else if (status.value === 'dirty') await save()
      else return
    }
  }

  function undo(): void {
    if (history.value && canUndo(history.value)) {
      history.value = undoHistory(history.value)
      changed()
    }
  }

  function redo(): void {
    if (history.value && canRedo(history.value)) {
      history.value = redoHistory(history.value)
      changed()
    }
  }

  async function reload(): Promise<void> {
    apply(await withSession((t) => managerService.getDesign(t, slug)))
  }

  /** Publica lo guardado; la respuesta ya trae el editor al día (no se vuelve a pedir). */
  async function publish(
    replaceOwnerDeadline = false,
  ): Promise<{ published_at: string; migrated: boolean }> {
    await flush()
    const result = await withSession((t) =>
      managerService.publish(t, slug, version.value, replaceOwnerDeadline),
    )
    apply(result)
    return { published_at: result.published_at, migrated: result.migrated }
  }

  async function discard(): Promise<void> {
    clearTimers()
    if (inFlight) await inFlight
    apply(await withSession((t) => managerService.discardDraft(t, slug)))
  }

  async function restore(id: string): Promise<void> {
    await flush()
    apply(await withSession((t) => managerService.restoreVersion(t, slug, id)))
  }

  /** Conflicto: quedarse con lo que guardó la otra ventana. */
  async function takeTheirs(): Promise<void> {
    await reload()
  }

  /** Conflicto: guardar lo de esta ventana encima. */
  async function keepMine(): Promise<void> {
    if (status.value !== 'conflict') return
    version.value =
      conflict.value?.version ??
      (await withSession((t) => managerService.getDesign(t, slug))).version
    conflict.value = null
    saved = null
    status.value = 'dirty'
    await save()
  }

  async function changeSettings(changes: SettingsChange): Promise<void> {
    settings.value = await withSession((t) => managerService.updateSettings(t, slug, changes))
  }

  async function importFile(file: File): Promise<{ warnings: string[]; media: string[] }> {
    await flush()
    const result = await withSession((t) => managerService.importDesign(t, slug, file))
    apply(result)
    return result.import
  }

  document.addEventListener('visibilitychange', onHidden)
  onBeforeUnmount(() => {
    clearTimers()
    document.removeEventListener('visibilitychange', onHidden)
  })

  return {
    catalog,
    design,
    version,
    source,
    config,
    issues,
    brand,
    changes,
    hasDraft,
    pending,
    settings,
    conversion,
    warnings,
    status,
    error,
    conflict,
    canUndo: computed(() => !!history.value && canUndo(history.value)),
    canRedo: computed(() => !!history.value && canRedo(history.value)),
    load,
    update,
    save,
    flush,
    undo,
    redo,
    reload,
    publish,
    discard,
    restore,
    takeTheirs,
    keepMine,
    changeSettings,
    importFile,
  }
}
