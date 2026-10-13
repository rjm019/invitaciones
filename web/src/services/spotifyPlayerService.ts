import type { AudioPlayer, AudioState } from './audioService'

/**
 * La música del evento sonando desde una playlist de Spotify, con la API oficial del
 * reproductor incrustado (open.spotify.com/embed/iframe-api/v1). Cumple la misma interfaz
 * que el reproductor de archivo: la portada la inicia al abrir el sobre y los controles
 * dorados y el mini-reproductor la manejan igual.
 *
 * Sin Vue ni DOM global: la API llega por `loadApi` y el lugar del reproductor, por `attach`.
 */

/** Lo que se usa del controlador que crea la API de Spotify. */
export interface SpotifyController {
  iframeElement?: { setAttribute(name: string, value: string): void }
  addListener(event: string, handler: (e: { data?: unknown }) => void): unknown
  loadUri(uri: string): void
  play(): void
  resume(): void
  pause(): void
  seek(seconds: number): void
  destroy(): void
}

export interface SpotifyIframeApi {
  createController(
    element: unknown,
    options: { width?: string; height?: string; theme?: 'dark' },
    onCreate: (controller: SpotifyController) => void,
  ): void
}

/** Lo que manda el reproductor de Spotify en cada cambio (tiempos en milisegundos). */
interface PlaybackUpdate {
  isPaused?: boolean
  isBuffering?: boolean
  position?: number
  duration?: number
  /** Canción que suena (spotify:track:…). */
  playingURI?: string
}

export interface SpotifyPlayer extends AudioPlayer {
  /**
   * Pone el reproductor de Spotify en `element` (lo reemplaza por el iframe). Si se llama
   * con otro elemento, el reproductor se muda ahí.
   */
  attach(element: unknown, height: number): void
  /**
   * Avisa cada vez que empieza otra canción. Spotify mueve su lista hasta la canción nueva
   * y eso arrastra la página entera hasta el reproductor; con este aviso se puede evitar.
   */
  onTrackChange(listener: () => void): () => void
}

/** Si al pedir play no empieza a sonar en este tiempo, el navegador lo bloqueó (iPhone). */
export const BLOCKED_AFTER_MS = 6000
export const BLOCKED_MESSAGE = 'Toca ▶ en el reproductor de Spotify para escuchar la música.'
const LOAD_ERROR = 'No se pudo cargar la playlist de Spotify.'

export function createSpotifyPlayer(
  uri: string,
  loadApi: () => Promise<SpotifyIframeApi>,
): SpotifyPlayer {
  let controller: SpotifyController | null = null
  let host: unknown = null
  // Cada attach nuevo invalida al anterior (por si la sección se vuelve a montar).
  let generation = 0
  let wantsToPlay = false
  let blockedTimer: ReturnType<typeof setTimeout> | undefined
  let state: AudioState = {
    available: true,
    playing: false,
    started: false,
    loop: false,
    canLoop: false,
    current: 0,
    duration: 0,
    error: null,
  }
  const listeners = new Set<(state: AudioState) => void>()
  const trackListeners = new Set<() => void>()
  let track = ''

  const set = (patch: Partial<AudioState>) => {
    state = { ...state, ...patch }
    listeners.forEach((l) => l(state))
  }

  const onUpdate = (data: unknown) => {
    const update = (data ?? {}) as PlaybackUpdate
    const playing = update.isPaused === false
    if (update.playingURI && update.playingURI !== track) {
      track = update.playingURI
      trackListeners.forEach((l) => l())
    }
    if (playing) clearTimeout(blockedTimer)
    set({
      playing,
      current: (update.position ?? 0) / 1000,
      duration: (update.duration ?? 0) / 1000,
      ...(playing ? { started: true, error: null } : {}),
    })
  }

  const player: SpotifyPlayer = {
    state: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    onTrackChange(listener) {
      trackListeners.add(listener)
      return () => trackListeners.delete(listener)
    },
    attach(element, height) {
      if (element === host) return
      host = element
      const current = ++generation
      // Si la sección se volvió a montar, el reproductor se muda a su nuevo lugar.
      controller?.destroy()
      controller = null
      loadApi()
        .then((api) =>
          api.createController(
            element,
            { width: '100%', height: String(height), theme: 'dark' },
            (c) => {
              if (current !== generation) return c.destroy()
              controller = c
              // Spotify lo crea con loading="lazy": si la playlist está abajo, no cargaría a
              // tiempo para sonar al abrir el sobre.
              c.iframeElement?.setAttribute('loading', 'eager')
              c.addListener('playback_update', (e) => onUpdate(e.data))
              c.addListener('playback_started', () =>
                set({ playing: true, started: true, error: null }),
              )
              c.addListener('error', () => set({ playing: false, error: LOAD_ERROR }))
              c.loadUri(uri)
              // Si ya pidieron play (se abrió el sobre antes de que cargara), Spotify lo
              // guarda en cola y lo manda en cuanto el reproductor está listo.
              if (wantsToPlay) c.play()
            },
          ),
        )
        .catch(() => set({ available: false, error: LOAD_ERROR }))
    },
    async play() {
      wantsToPlay = true
      if (controller) {
        if (state.started) controller.resume()
        else controller.play()
      }
      clearTimeout(blockedTimer)
      blockedTimer = setTimeout(() => {
        if (!state.playing && wantsToPlay) set({ error: BLOCKED_MESSAGE })
      }, BLOCKED_AFTER_MS)
    },
    pause() {
      wantsToPlay = false
      clearTimeout(blockedTimer)
      controller?.pause()
    },
    async toggle() {
      if (state.playing) player.pause()
      else await player.play()
    },
    seek(seconds) {
      if (!controller) return
      const max = state.duration || Number.POSITIVE_INFINITY
      const at = Math.min(Math.max(0, seconds), max)
      controller.seek(at)
      set({ current: at })
    },
    skip(delta) {
      player.seek(state.current + delta)
    },
    setLoop() {
      // Spotify no deja repetir desde fuera de su reproductor; el botón queda apagado.
    },
    destroy() {
      clearTimeout(blockedTimer)
      generation++
      controller?.destroy()
      controller = null
      listeners.clear()
      trackListeners.clear()
    },
  }
  return player
}
