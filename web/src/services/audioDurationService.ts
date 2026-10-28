/**
 * Duración de una canción y revisión del segundo de inicio, sin Vue. El elemento de audio
 * llega por `create` (en la página, () => new Audio()) para poder probarlo con un falso.
 */

export interface DurationAudio extends EventTarget {
  src: string
  preload: string
  readonly duration: number
  removeAttribute(name: string): void
  load(): void
}

/** Lo más lejos que puede estar el inicio (lo mismo que acepta el servidor). */
export const MAX_AUDIO_START = 36000

/**
 * Lee la duración (segundos) de la canción desde sus metadatos, sin descargarla completa.
 * Devuelve null si no se puede saber (archivo inválido, sin red o tarda demasiado).
 */
export function readAudioDuration(
  url: string,
  create: () => DurationAudio = () => new Audio(),
  timeoutMs = 8000,
): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = create()
    let timer: ReturnType<typeof setTimeout> | null = null
    const finish = (value: number | null) => {
      if (timer) clearTimeout(timer)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('error', onError)
      audio.removeAttribute('src')
      audio.load()
      resolve(value)
    }
    const onMeta = () =>
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null)
    const onError = () => finish(null)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('error', onError)
    timer = setTimeout(() => finish(null), timeoutMs)
    audio.preload = 'metadata'
    audio.src = url
  })
}

/** El último segundo válido para empezar: la canción debe durar más que el inicio. */
export function maxAudioStart(duration: number | null): number {
  if (duration === null || !Number.isFinite(duration)) return MAX_AUDIO_START
  return Math.max(0, Math.min(MAX_AUDIO_START, Math.floor(duration) - 1))
}

/** 75.4 → "1:15" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Mensaje en español si el inicio no sirve; null si está bien (o vacío). */
export function audioStartError(raw: string, duration: number | null): string | null {
  const text = raw.trim()
  if (text === '') return null
  if (!/^\d+$/.test(text)) return 'Escribe un número entero de segundos, de 0 en adelante.'
  const value = Number(text)
  if (value > MAX_AUDIO_START) return `El inicio no puede pasar de ${MAX_AUDIO_START} segundos.`
  if (duration !== null && value > maxAudioStart(duration)) {
    return `La canción dura ${clock(duration)}; el inicio debe ser menor.`
  }
  return null
}
