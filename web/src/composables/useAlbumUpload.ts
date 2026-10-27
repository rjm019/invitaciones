import { onBeforeUnmount, ref } from 'vue'
import { ApiError } from '@/services/http'
import {
  ALBUM_MAX_BYTES,
  ALBUM_QUALITY,
  albumErrorMessage,
  albumFileName,
  albumTarget,
  isImageFile,
} from '@/services/albumService'
import { isHeic } from '@/services/imageResizeService'
import { motionScale } from './useMotionScale'

export interface UploadEntry {
  id: number
  name: string
  /** 0 a 1. */
  progress: number
  error: string
  done: boolean
}

const HEIC_MESSAGE =
  'Tu navegador no pudo leer esa foto (HEIC). Tómala de nuevo como JPG o elige otra.'

/**
 * Reduce la foto en el celular antes de subirla: 1600 px de lado mayor y JPEG 0.85 (una foto
 * HEIC sale como JPEG; el navegador ya aplica la rotación de la cámara). Así una foto de 4 MB
 * sube en ~350 KB con datos móviles y el servidor solo re-codifica algo chico.
 */
export async function shrinkPhoto(file: File): Promise<{ blob: Blob; name: string }> {
  const original = () => {
    if (isHeic(file)) throw new Error(HEIC_MESSAGE)
    return { blob: file as Blob, name: file.name }
  }
  if (typeof createImageBitmap === 'undefined') return original()
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = albumTarget(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', ALBUM_QUALITY),
    )
    return blob ? { blob, name: albumFileName(file.name) } : original()
  } catch (e) {
    if (e instanceof Error && e.message === HEIC_MESSAGE) throw e
    return original()
  }
}

/**
 * Sube de una en una (cada petición lleva una sola foto) las fotos que el invitado elige,
 * con su progreso y su error en español. En una muestra (`simulate`) no manda nada: reduce la
 * foto, finge el avance y entrega la foto local con `onSimulated`, sin llamar al servidor.
 * Los temporizadores y las direcciones locales se limpian al desmontar.
 */
export function useAlbumUpload(options: {
  upload: (blob: Blob, name: string, onProgress: (fraction: number) => void) => Promise<unknown>
  simulate: () => boolean
  onSimulated?: (src: string) => void
  /** Un lugar menos o una foto ya subida: la sección refresca lo que le quede. */
  onUploaded?: () => void
}) {
  const entries = ref<UploadEntry[]>([])
  const busy = ref(false)
  let next = 1
  let alive = true
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const urls: string[] = []

  function patch(id: number, change: Partial<UploadEntry>) {
    entries.value = entries.value.map((e) => (e.id === id ? { ...e, ...change } : e))
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        resolve()
      }, ms * motionScale())
      timers.add(timer)
    })
  }

  async function sendOne(file: File, id: number): Promise<boolean> {
    try {
      const { blob, name } = await shrinkPhoto(file)
      if (blob.size > ALBUM_MAX_BYTES) throw new Error('La foto pesa más de 8 MB. Elige otra.')
      if (options.simulate()) {
        for (const step of [0.25, 0.6, 1]) {
          await wait(180)
          if (!alive) return false
          patch(id, { progress: step })
        }
        const url = URL.createObjectURL(blob)
        urls.push(url)
        options.onSimulated?.(url)
      } else {
        await options.upload(blob, name, (fraction) => alive && patch(id, { progress: fraction }))
      }
      if (alive) patch(id, { progress: 1, done: true })
      return true
    } catch (e) {
      if (alive) {
        const message =
          e instanceof ApiError
            ? albumErrorMessage(e.status, e.message)
            : e instanceof Error
              ? e.message
              : 'No se pudo subir la foto. Inténtalo de nuevo.'
        patch(id, { error: message })
      }
      // Si el servidor dijo que ya no cabe (o ya terminó), no tiene caso seguir con las demás.
      return !(e instanceof ApiError && [409, 410, 422, 507].includes(e.status))
    }
  }

  /** Sube hasta `room` fotos de las elegidas; el resto se avisa con su propio error. */
  async function add(files: File[], room: number): Promise<void> {
    if (busy.value) return
    busy.value = true
    entries.value = []
    try {
      const chosen = files.slice(0, Math.max(0, room))
      const extra = files.slice(chosen.length)
      const queue = chosen.map((file) => ({ file, id: next++ }))
      entries.value = [
        ...queue.map((q) => ({ id: q.id, name: q.file.name, progress: 0, error: '', done: false })),
        ...extra.map((file) => ({
          id: next++,
          name: file.name,
          progress: 0,
          error: `Solo caben ${room} ${room === 1 ? 'foto' : 'fotos'} en tu invitación: esta no se subió.`,
          done: false,
        })),
      ]
      for (const { file, id } of queue) {
        if (!isImageFile(file)) {
          patch(id, { error: 'Ese archivo no es una foto.' })
          continue
        }
        const goOn = await sendOne(file, id)
        if (!alive) return
        options.onUploaded?.()
        if (!goOn) break
      }
    } finally {
      if (alive) busy.value = false
    }
  }

  onBeforeUnmount(() => {
    alive = false
    timers.forEach(clearTimeout)
    timers.clear()
    urls.forEach((u) => URL.revokeObjectURL(u))
  })

  return { entries, busy, add }
}
