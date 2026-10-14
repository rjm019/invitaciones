import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/http'
import type { MediaFile } from '@/types/design'

const api = vi.hoisted(() => ({ listMedia: vi.fn(), uploadMedia: vi.fn(), deleteMedia: vi.fn() }))
vi.mock('@/services/managerService', () => api)

import { useMediaLibrary } from '../useMediaLibrary'

const file = (name: string, bytes: number, kind: MediaFile['kind'] = 'image'): MediaFile => ({
  name,
  url: `/media/mis-xv/${name}`,
  kind,
  bytes,
  width: null,
  height: null,
  modified: 0,
  used_in: [],
})
const withSession = <T>(call: (token: string) => Promise<T>) => call('tok')

describe('useMediaLibrary', () => {
  beforeEach(() => Object.values(api).forEach((m) => m.mockReset()))

  it('carga la biblioteca con el espacio que ocupa', async () => {
    api.listMedia.mockResolvedValue({ files: [file('sobre-1a2b.webp', 2000)], total_bytes: 2000 })
    const library = useMediaLibrary('mis-xv', withSession)
    await library.refresh()
    expect(api.listMedia).toHaveBeenCalledWith('tok', 'mis-xv')
    expect(library.files.value.map((f) => f.name)).toEqual(['sobre-1a2b.webp'])
    expect(library.totalBytes.value).toBe(2000)
    expect(library.loading.value).toBe(false)
  })

  it('si no carga, dice por qué', async () => {
    api.listMedia.mockRejectedValue(new ApiError('Sin conexión.', 0))
    const library = useMediaLibrary('mis-xv', withSession)
    await library.refresh()
    expect(library.error.value).toBe('Sin conexión.')
  })

  it('sube un archivo con su avance y lo deja al principio', async () => {
    api.listMedia.mockResolvedValue({ files: [file('viejo.webp', 100)], total_bytes: 100 })
    const library = useMediaLibrary('mis-xv', withSession)
    await library.refresh()

    let progress: number[] = []
    api.uploadMedia.mockImplementation(async (_t, _s, _blob, _name, options) => {
      options.onProgress(0.5)
      progress = library.uploads.value.map((u) => u.progress)
      return file('cancion-9f8e.mp3', 900, 'audio')
    })
    const mp3 = new File(['id3'], 'canción.mp3', { type: 'audio/mpeg' })
    const stored = await library.upload(mp3, { purpose: 'foto' })

    expect(stored.name).toBe('cancion-9f8e.mp3')
    expect(api.uploadMedia).toHaveBeenCalledWith(
      'tok',
      'mis-xv',
      mp3,
      'canción.mp3',
      expect.objectContaining({ purpose: 'foto' }),
    )
    expect(progress).toEqual([0.5])
    expect(library.uploads.value).toEqual([])
    expect(library.files.value.map((f) => f.name)).toEqual(['cancion-9f8e.mp3', 'viejo.webp'])
    expect(library.totalBytes.value).toBe(1000)
  })

  it('si una subida falla, se queda en la lista con el motivo hasta cerrarla', async () => {
    api.uploadMedia.mockRejectedValue(new ApiError('Ese archivo no es una imagen.', 422))
    const library = useMediaLibrary('mis-xv', withSession)
    await expect(
      library.upload(new File(['x'], 'foto.gif', { type: 'image/gif' })),
    ).rejects.toThrow()

    expect(library.uploads.value).toMatchObject([
      { name: 'foto.gif', error: 'Ese archivo no es una imagen.' },
    ])
    library.dismissUpload(library.uploads.value[0].id)
    expect(library.uploads.value).toEqual([])
  })

  it('una HEIC que el navegador no puede convertir no se sube y dice qué hacer', async () => {
    const library = useMediaLibrary('mis-xv', withSession)
    const heic = new File(['ftypheic'], 'IMG_0012.HEIC', { type: '' })
    await expect(library.upload(heic)).rejects.toThrow('Safari')
    expect(api.uploadMedia).not.toHaveBeenCalled()
    expect(library.uploads.value[0].error).toContain('HEIC')
  })

  it('borra lo que nadie usa; lo que sí se usa se queda', async () => {
    api.listMedia.mockResolvedValue({
      files: [file('a.webp', 100), file('b.webp', 50)],
      total_bytes: 150,
    })
    const library = useMediaLibrary('mis-xv', withSession)
    await library.refresh()

    await library.remove('a.webp')
    expect(api.deleteMedia).toHaveBeenCalledWith('tok', 'mis-xv', 'a.webp')
    expect(library.files.value.map((f) => f.name)).toEqual(['b.webp'])
    expect(library.totalBytes.value).toBe(50)

    api.deleteMedia.mockRejectedValue(
      new ApiError('Se usa en la portada.', 409, [], { used_in: [] }),
    )
    await expect(library.remove('b.webp')).rejects.toMatchObject({ status: 409 })
    expect(library.files.value.map((f) => f.name)).toEqual(['b.webp'])
  })
})
