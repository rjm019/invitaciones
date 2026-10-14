import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ApiError } from '@/services/http'
import type { Design, DesignBuild, DesignPayload } from '@/types/design'

const api = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getDesign: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  discardDraft: vi.fn(),
  restoreVersion: vi.fn(),
  updateSettings: vi.fn(),
  importDesign: vi.fn(),
}))
vi.mock('@/services/managerService', () => api)

import { RETRY_DELAY, SAVE_DELAY, SAVE_MAX_WAIT, useDesignEditor } from '../useDesignEditor'

const design = (titulo = 'Itinerario'): Design => ({
  event: { tema: 'jardin-azul' },
  colors: {},
  fonts: {},
  texts: {},
  page: {},
  sections: [{ id: 'itinerario', fields: { visible: 'SI', titulo }, items: [] }],
})
const titled = (titulo: string) => design(titulo)

const payload = (d = design(), version = 'b-1'): DesignPayload => ({
  slug: 'mis-xv',
  design: d,
  version,
  source: 'draft',
  has_draft: true,
  pending: true,
  changes: [],
  config: { theme: 'jardin-azul' } as DesignPayload['config'],
  issues: [],
  brand: { title: 'XV de Ana', theme: 'jardin-azul', palette: {}, fonts: {} },
  warnings: [],
  settings: {
    published: false,
    template: false,
    panel_password: null,
    owner_deadline: null,
    deadline_changes: 0,
  },
  conversion: null,
})
const built = (version: string): DesignBuild => ({
  version,
  has_draft: true,
  pending: true,
  changes: [{ type: 'section', key: 'itinerario', change: 'changed' }],
  config: { theme: 'jardin-azul' } as DesignBuild['config'],
  issues: [],
  brand: { title: 'XV de Ana', theme: 'jardin-azul', palette: {}, fonts: {} },
})

/** Una promesa que la prueba resuelve cuando quiere (una petición "en camino"). */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const withSession = <T>(call: (token: string) => Promise<T>) => call('tok')
let wrapper: VueWrapper | null = null

async function open() {
  let editor!: ReturnType<typeof useDesignEditor>
  wrapper = mount(
    defineComponent({
      setup() {
        editor = useDesignEditor('mis-xv', withSession)
        return () => null
      },
    }),
  )
  await editor.load()
  return editor
}

const savedTitles = () =>
  api.saveDraft.mock.calls.map(([, , d]) => (d as Design).sections[0].fields.titulo)

describe('useDesignEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.values(api).forEach((m) => m.mockReset())
    api.getCatalog.mockResolvedValue({ version: 1, sections: [] })
    api.getDesign.mockResolvedValue(payload())
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.useRealTimers()
  })

  it('abre la invitación con su catálogo, su versión y lo que hay que revisar', async () => {
    const editor = await open()
    expect(api.getDesign).toHaveBeenCalledWith('tok', 'mis-xv')
    expect(editor.status.value).toBe('saved')
    expect(editor.design.value).toEqual(design())
    expect(editor.version.value).toBe('b-1')
    expect(editor.brand.value?.title).toBe('XV de Ana')
    expect(editor.canUndo.value).toBe(false)
  })

  it('si no abre, dice por qué', async () => {
    api.getDesign.mockRejectedValue(new ApiError('Evento no encontrado.', 404))
    const editor = await open()
    expect(editor.status.value).toBe('error')
    expect(editor.error.value).toBe('Evento no encontrado.')
  })

  it('guarda un momento después de la última tecla, con la versión que tiene', async () => {
    api.saveDraft.mockResolvedValue(built('b-2'))
    const editor = await open()

    editor.update(titled('I'), 'itinerario:titulo')
    await vi.advanceTimersByTimeAsync(SAVE_DELAY - 50)
    editor.update(titled('It'), 'itinerario:titulo')
    await vi.advanceTimersByTimeAsync(SAVE_DELAY - 50)
    expect(api.saveDraft).not.toHaveBeenCalled()
    expect(editor.status.value).toBe('dirty')

    await vi.advanceTimersByTimeAsync(50)
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(api.saveDraft).toHaveBeenCalledWith('tok', 'mis-xv', titled('It'), 'b-1')
    await flushPromises()
    expect(editor.status.value).toBe('saved')
    expect(editor.version.value).toBe('b-2')
    expect(editor.changes.value).toHaveLength(1)
  })

  it('si se escribe sin parar, guarda de todos modos cada poco', async () => {
    api.saveDraft.mockResolvedValue(built('b-2'))
    const editor = await open()
    for (let t = 0; t < SAVE_MAX_WAIT; t += SAVE_DELAY / 2) {
      editor.update(titled(`Texto ${t}`), 'itinerario:titulo')
      await vi.advanceTimersByTimeAsync(SAVE_DELAY / 2)
    }
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('manda una petición a la vez; lo que cambió mientras tanto se guarda al terminar', async () => {
    const first = deferred<DesignBuild>()
    api.saveDraft.mockReturnValueOnce(first.promise).mockResolvedValueOnce(built('b-3'))
    const editor = await open()

    editor.update(titled('Uno'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    editor.update(titled('Dos'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY * 3)
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    // Lo último aún no se guarda: la barra lo dice así.
    expect(editor.status.value).toBe('dirty')

    first.resolve(built('b-2'))
    await flushPromises()
    expect(savedTitles()).toEqual(['Uno', 'Dos'])
    expect(api.saveDraft.mock.calls[1][3]).toBe('b-2')
    await flushPromises()
    expect(editor.status.value).toBe('saved')
    expect(editor.version.value).toBe('b-3')
  })

  it('no guarda si quedó igual que en el servidor', async () => {
    const editor = await open()
    editor.update(titled('Otro'))
    editor.update(design())
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT)
    expect(api.saveDraft).not.toHaveBeenCalled()
    expect(editor.status.value).toBe('saved')
  })

  it('deshacer y rehacer también se guardan', async () => {
    api.saveDraft.mockResolvedValue(built('b-2'))
    const editor = await open()
    editor.update(titled('Nuevo'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()

    editor.undo()
    expect(editor.design.value).toEqual(design())
    expect(editor.canRedo.value).toBe(true)
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    editor.redo()
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()
    expect(savedTitles()).toEqual(['Nuevo', 'Itinerario', 'Nuevo'])
  })

  it('409: se detiene y pregunta; "conservar la mía" guarda encima de la otra', async () => {
    api.saveDraft
      .mockRejectedValueOnce(
        new ApiError('Cambió en otra ventana.', 409, [], {
          version: 'b-9',
          design: titled('Otra'),
        }),
      )
      .mockResolvedValueOnce(built('b-10'))
    const editor = await open()

    editor.update(titled('Mía'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()
    expect(editor.status.value).toBe('conflict')
    expect(editor.conflict.value?.version).toBe('b-9')

    // Mientras no elija, nada se guarda ni se tapa el aviso.
    editor.update(titled('Mía 2'))
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT)
    expect(editor.status.value).toBe('conflict')
    expect(api.saveDraft).toHaveBeenCalledTimes(1)

    await editor.keepMine()
    expect(api.saveDraft).toHaveBeenLastCalledWith('tok', 'mis-xv', titled('Mía 2'), 'b-9')
    expect(editor.status.value).toBe('saved')
    expect(editor.version.value).toBe('b-10')
  })

  it('409: "cargar la más reciente" trae lo de la otra ventana', async () => {
    api.saveDraft.mockRejectedValueOnce(
      new ApiError('Cambió en otra ventana.', 409, [], { version: 'b-9', design: titled('Otra') }),
    )
    const editor = await open()
    editor.update(titled('Mía'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()

    api.getDesign.mockResolvedValue(payload(titled('Otra'), 'b-9'))
    await editor.takeTheirs()
    expect(editor.status.value).toBe('saved')
    expect(editor.design.value).toEqual(titled('Otra'))
    expect(editor.version.value).toBe('b-9')
    expect(editor.canUndo.value).toBe(false)
  })

  it('sin conexión, avisa y vuelve a intentar solo', async () => {
    api.saveDraft
      .mockRejectedValueOnce(new ApiError('Sin conexión.', 0))
      .mockResolvedValueOnce(built('b-2'))
    const editor = await open()
    editor.update(titled('Nuevo'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()
    expect(editor.status.value).toBe('offline')

    await vi.advanceTimersByTimeAsync(RETRY_DELAY)
    await flushPromises()
    expect(api.saveDraft).toHaveBeenCalledTimes(2)
    expect(editor.status.value).toBe('saved')
  })

  it('un error que no es pasajero (422) no se reintenta', async () => {
    api.saveDraft.mockRejectedValue(new ApiError('La invitación tiene un error.', 422))
    const editor = await open()
    editor.update(titled('Nuevo'))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY + RETRY_DELAY * 2)
    await flushPromises()
    expect(editor.status.value).toBe('error')
    expect(editor.error.value).toBe('La invitación tiene un error.')
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('al publicar, primero guarda lo pendiente y publica esa versión', async () => {
    api.saveDraft.mockResolvedValue(built('b-2'))
    api.publish.mockResolvedValue({
      published_at: '2026-10-14T12:00:00Z',
      migrated: false,
      version: 'p-2',
    })
    const editor = await open()
    editor.update(titled('Último'))

    api.getDesign.mockResolvedValue({
      ...payload(titled('Último'), 'p-2'),
      source: 'live',
      pending: false,
    })
    const publishing = editor.publish(true)
    await vi.advanceTimersByTimeAsync(0)
    await publishing
    expect(savedTitles()).toEqual(['Último'])
    expect(api.publish).toHaveBeenCalledWith('tok', 'mis-xv', 'b-2', true)
    expect(editor.source.value).toBe('live')
    expect(editor.pending.value).toBe(false)
  })

  it('al salir del editor no queda nada esperando para guardar', async () => {
    const editor = await open()
    editor.update(titled('Nuevo'))
    wrapper!.unmount()
    wrapper = null
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT)
    expect(api.saveDraft).not.toHaveBeenCalled()
  })
})
