import { ref } from 'vue'
import {
  isHeic,
  needsResize,
  outputName,
  outputType,
  targetSize,
} from '@/services/imageResizeService'
import * as managerService from '@/services/managerService'
import type { MediaFile } from '@/types/design'

type WithSession = <T>(call: (token: string) => Promise<T>) => Promise<T>

const HEIC_MESSAGE =
  'Esta foto es HEIC (del iPhone) y este navegador no la puede convertir. Súbela desde Safari o guárdala como JPG.'

export interface Upload {
  id: number
  name: string
  progress: number
  error: string | null
}

/**
 * Imágenes y audio de una invitación. Antes de subir una foto grande (o HEIC del iPhone)
 * la reduce en el navegador: sube más rápido y llega derecha.
 */
export function useMediaLibrary(slug: string, withSession: WithSession) {
  const files = ref<MediaFile[]>([])
  const totalBytes = ref(0)
  const loading = ref(false)
  const error = ref('')
  const uploads = ref<Upload[]>([])
  let nextUpload = 1

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      const library = await withSession((t) => managerService.listMedia(t, slug))
      files.value = library.files
      totalBytes.value = library.total_bytes
      error.value = ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar la biblioteca.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Una foto lista para subir: reducida si hace falta (si el navegador no puede, la original).
   * Una HEIC que el navegador no sabe abrir no se sube: el servidor no la aceptaría.
   */
  async function prepare(file: File): Promise<{ blob: Blob; name: string }> {
    const heic = isHeic(file)
    const original = () => {
      if (heic) throw new Error(HEIC_MESSAGE)
      return { blob: file as Blob, name: file.name }
    }
    if (
      (!heic && !file.type.startsWith('image/')) ||
      file.type === 'image/gif' ||
      typeof createImageBitmap === 'undefined'
    ) {
      return original()
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      if (!needsResize(file, bitmap.width, bitmap.height)) {
        bitmap.close()
        return { blob: file, name: file.name }
      }
      const size = targetSize(bitmap.width, bitmap.height)
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height)
      bitmap.close()
      const type = outputType(file.type)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
      return blob ? { blob, name: outputName(file.name, type) } : original()
    } catch {
      return original()
    }
  }

  /** Sube un archivo y lo deja al principio de la lista. Lanza ApiError con el motivo. */
  async function upload(
    file: File,
    options: { purpose?: 'fondo' | 'foto' | 'adorno'; trim?: boolean } = {},
  ): Promise<MediaFile> {
    const entry: Upload = { id: nextUpload++, name: file.name, progress: 0, error: null }
    uploads.value = [...uploads.value, entry]
    const track = (patch: Partial<Upload>) => {
      uploads.value = uploads.value.map((u) => (u.id === entry.id ? { ...u, ...patch } : u))
    }
    try {
      const ready = await prepare(file)
      const stored = await withSession((t) =>
        managerService.uploadMedia(t, slug, ready.blob, ready.name, {
          ...options,
          onProgress: (fraction) => track({ progress: fraction }),
        }),
      )
      files.value = [stored, ...files.value]
      totalBytes.value += stored.bytes
      uploads.value = uploads.value.filter((u) => u.id !== entry.id)
      return stored
    } catch (e) {
      track({ error: e instanceof Error ? e.message : 'No se pudo subir.' })
      throw e
    }
  }

  function dismissUpload(id: number): void {
    uploads.value = uploads.value.filter((u) => u.id !== id)
  }

  /**
   * Borra un archivo que nadie usa. Si la invitación lo usa, lanza ApiError 409 (su
   * `data.used_in` dice dónde).
   */
  async function remove(name: string): Promise<void> {
    await withSession((t) => managerService.deleteMedia(t, slug, name))
    const gone = files.value.find((f) => f.name === name)
    files.value = files.value.filter((f) => f.name !== name)
    if (gone) totalBytes.value -= gone.bytes
  }

  return { files, totalBytes, loading, error, uploads, refresh, upload, dismissUpload, remove }
}
