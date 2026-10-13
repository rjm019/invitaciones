/**
 * Reproductor de la música del evento, sin Vue y sin tocar el DOM global: el elemento
 * de audio llega por `create` (en la página, () => new Audio()). Se crea hasta el primer
 * play, así la canción no se descarga si nadie la escucha.
 */

/** Lo que el servicio usa de HTMLAudioElement (permite probarlo con un falso). */
export interface AudioLike extends EventTarget {
  src: string
  preload: string
  loop: boolean
  currentTime: number
  readonly duration: number
  readonly paused: boolean
  play(): Promise<void>
  pause(): void
  removeAttribute(name: string): void
  load(): void
}

export interface AudioState {
  /** Hay canción configurada en el layout. */
  available: boolean
  playing: boolean
  /** Ya sonó alguna vez (el mini-reproductor solo aparece después). */
  started: boolean
  loop: boolean
  /** Se puede repetir la canción (Spotify no lo permite desde fuera de su reproductor). */
  canLoop: boolean
  current: number
  duration: number
  error: string | null
}

export interface AudioPlayer {
  state(): AudioState
  subscribe(listener: (state: AudioState) => void): () => void
  play(): Promise<void>
  pause(): void
  toggle(): Promise<void>
  /** Ir a un segundo (se limita a la duración). */
  seek(seconds: number): void
  /** Adelantar o regresar (±10 s en los botones). */
  skip(delta: number): void
  setLoop(loop: boolean): void
  destroy(): void
}

const EVENTS = [
  'play',
  'pause',
  'ended',
  'timeupdate',
  'durationchange',
  'loadedmetadata',
  'error',
] as const

export function createAudioPlayer(src: string | null, create: () => AudioLike): AudioPlayer {
  let audio: AudioLike | null = null
  let state: AudioState = {
    available: !!src,
    playing: false,
    started: false,
    loop: true,
    canLoop: true,
    current: 0,
    duration: 0,
    error: null,
  }
  const listeners = new Set<(state: AudioState) => void>()

  const set = (patch: Partial<AudioState>) => {
    state = { ...state, ...patch }
    listeners.forEach((l) => l(state))
  }

  const sync = (e: Event) => {
    if (!audio) return
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0
    set({
      playing: !audio.paused && e.type !== 'ended',
      current: audio.currentTime,
      duration,
      ...(e.type === 'play' ? { started: true, error: null } : {}),
      ...(e.type === 'error' ? { playing: false, error: 'No se pudo cargar la música.' } : {}),
    })
  }

  const element = (): AudioLike | null => {
    if (!src) return null
    if (!audio) {
      audio = create()
      audio.preload = 'auto'
      audio.loop = state.loop
      EVENTS.forEach((name) => audio!.addEventListener(name, sync))
      audio.src = src
    }
    return audio
  }

  return {
    state: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    async play() {
      const el = element()
      if (!el) return
      try {
        await el.play()
      } catch {
        // El navegador bloquea el audio sin un toque: se queda en pausa sin marcar error.
        set({ playing: false })
      }
    },
    pause() {
      audio?.pause()
    },
    async toggle() {
      if (state.playing) this.pause()
      else await this.play()
    },
    seek(seconds) {
      const el = element()
      if (!el) return
      const max = state.duration || Number.POSITIVE_INFINITY
      el.currentTime = Math.min(Math.max(0, seconds), max)
      set({ current: el.currentTime })
    },
    skip(delta) {
      this.seek(state.current + delta)
    },
    setLoop(loop) {
      if (audio) audio.loop = loop
      set({ loop })
    },
    destroy() {
      if (audio) {
        audio.pause()
        EVENTS.forEach((name) => audio!.removeEventListener(name, sync))
        audio.removeAttribute('src')
        audio.load()
        audio = null
      }
      listeners.clear()
    },
  }
}

/** 75.4 → "1:15" */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
