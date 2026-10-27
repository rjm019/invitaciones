import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { ApiError } from '@/services/http'
import { shrinkPhoto, useAlbumUpload } from '../useAlbumUpload'

const jpg = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })

function setup(options: Parameters<typeof useAlbumUpload>[0]) {
  let api!: ReturnType<typeof useAlbumUpload>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useAlbumUpload(options)
        return () => h('div')
      },
    }),
  )
  return { api, wrapper }
}

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', undefined)
  URL.createObjectURL = vi.fn(() => 'blob:local')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('shrinkPhoto', () => {
  it('sin soporte del navegador sube la foto tal cual', async () => {
    const file = jpg()
    expect(await shrinkPhoto(file)).toEqual({ blob: file, name: 'a.jpg' })
  })

  it('una foto HEIC que el navegador no puede leer da un aviso en español', async () => {
    await expect(shrinkPhoto(new File(['x'], 'IMG.HEIC', { type: 'image/heic' }))).rejects.toThrow(
      /HEIC/,
    )
  })

  it('reduce a 1600 px y siempre sale JPEG', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close }))
    const draw = vi.fn()
    const toBlob = vi.fn((cb: (b: Blob | null) => void, type: string) =>
      cb(new Blob(['y'], { type })),
    )
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: draw }), toBlob }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas as unknown as HTMLElement)
    const out = await shrinkPhoto(jpg('IMG_1.heic'))
    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85)
    expect(out.name).toBe('IMG_1.jpg')
    expect(close).toHaveBeenCalled()
  })
})

describe('useAlbumUpload', () => {
  it('sube de una en una y solo las que caben', async () => {
    const upload = vi.fn(async () => undefined)
    const { api } = setup({ upload, simulate: () => false })
    await api.add([jpg('1.jpg'), jpg('2.jpg'), jpg('3.jpg')], 2)
    expect(upload).toHaveBeenCalledTimes(2)
    expect(api.entries.value.filter((e) => e.done)).toHaveLength(2)
    expect(api.entries.value[2]?.error).toMatch(/Solo caben 2 fotos/)
  })

  it('si la API dice que ya no cabe, muestra su mensaje y no sigue', async () => {
    const upload = vi.fn().mockRejectedValue(new ApiError('El álbum ya está lleno.', 507))
    const { api } = setup({ upload, simulate: () => false })
    await api.add([jpg('1.jpg'), jpg('2.jpg')], 2)
    expect(upload).toHaveBeenCalledTimes(1)
    expect(api.entries.value[0]?.error).toBe('El álbum ya está lleno.')
    expect(api.busy.value).toBe(false)
  })

  it('un archivo que no es foto no se manda', async () => {
    const upload = vi.fn(async () => undefined)
    const { api } = setup({ upload, simulate: () => false })
    await api.add([new File(['x'], 'nota.pdf', { type: 'application/pdf' })], 2)
    expect(upload).not.toHaveBeenCalled()
    expect(api.entries.value[0]?.error).toBe('Ese archivo no es una foto.')
  })

  it('en una muestra no llama al servidor y entrega la foto local; al desmontar limpia', async () => {
    vi.useFakeTimers()
    const upload = vi.fn()
    const onSimulated = vi.fn()
    const { api, wrapper } = setup({ upload, simulate: () => true, onSimulated })
    const done = api.add([jpg()], 2)
    await vi.advanceTimersByTimeAsync(2000)
    await done
    await flushPromises()
    expect(upload).not.toHaveBeenCalled()
    expect(onSimulated).toHaveBeenCalledWith('blob:local')
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local')
    vi.useRealTimers()
  })
})
