import {
  inject,
  onBeforeUnmount,
  provide,
  readonly,
  ref,
  watch,
  type InjectionKey,
  type Ref,
} from 'vue'
import {
  createAudioPlayer,
  type AudioLike,
  type AudioPlayer,
  type AudioState,
} from '@/services/audioService'
import { SPOTIFY_LOCALE } from '@/services/spotifyService'
import {
  createSpotifyPlayer,
  type SpotifyIframeApi,
  type SpotifyPlayer,
} from '@/services/spotifyPlayerService'

/** De dónde sale la música: un MP3 del evento o la playlist de Spotify. */
export type MusicSource = 'file' | 'spotify'

/** Sección que muestra el reproductor de Spotify cuando la música sale de ahí. */
export type SpotifyHost = 'spotify' | 'music-player'

export interface SpotifyMusicOptions {
  /** URI de la playlist (spotify:playlist:…) si la música sale de Spotify; null = archivo. */
  uri: () => string | null
  host: () => SpotifyHost | null
  loadApi?: () => Promise<SpotifyIframeApi>
}

export interface MusicContext {
  state: Readonly<Ref<AudioState>>
  play: () => Promise<void>
  pause: () => void
  toggle: () => Promise<void>
  seek: (seconds: number) => void
  skip: (delta: number) => void
  setLoop: (loop: boolean) => void
  /** La sección del reproductor está en pantalla (entonces el mini-reproductor se esconde). */
  playerInView: Ref<boolean>
  source: () => MusicSource
  /** Qué sección aloja el reproductor de Spotify (solo con source = spotify). */
  spotifyHost: () => SpotifyHost | null
  /** La sección anfitriona pone aquí el reproductor de Spotify (una sola vez). */
  attachSpotify: (container: HTMLElement, height: number) => void
  /** Avisa cuando Spotify pasa a otra canción (con música de archivo, nunca). */
  onTrackChange: (listener: () => void) => () => void
}

const KEY: InjectionKey<MusicContext> = Symbol('music')

/**
 * Una sola canción para toda la invitación: la portada la inicia al abrir el sobre, el
 * reproductor la controla y el mini-reproductor la sigue. Se detiene al salir de la página.
 */
export function provideMusic(
  src: () => string | null,
  create: () => AudioLike = () => new Audio(),
  spotify?: SpotifyMusicOptions,
): MusicContext {
  let player: AudioPlayer | SpotifyPlayer | null = null
  let unsubscribe: (() => void) | null = null
  const state = ref<AudioState>(createAudioPlayer(null, create).state())
  const spotifyUri = () => spotify?.uri() ?? null
  // Los avisos de canción nueva sobreviven a que el reproductor se vuelva a crear.
  const trackListeners = new Set<() => void>()
  let stopTracks: (() => void) | null = null

  const teardown = () => {
    unsubscribe?.()
    stopTracks?.()
    stopTracks = null
    player?.destroy()
  }
  watch(
    [src, spotifyUri],
    ([url, uri]) => {
      teardown()
      if (uri) {
        const spotifyPlayer = createSpotifyPlayer(uri, spotify?.loadApi ?? loadSpotifyIframeApi)
        stopTracks = spotifyPlayer.onTrackChange(() => trackListeners.forEach((l) => l()))
        player = spotifyPlayer
      } else {
        player = createAudioPlayer(url, create)
      }
      unsubscribe = player.subscribe((s) => (state.value = s))
    },
    { immediate: true },
  )
  onBeforeUnmount(teardown)

  const context: MusicContext = {
    state: readonly(state),
    play: () => player?.play() ?? Promise.resolve(),
    pause: () => player?.pause(),
    toggle: () => player?.toggle() ?? Promise.resolve(),
    seek: (s) => player?.seek(s),
    skip: (d) => player?.skip(d),
    setLoop: (l) => player?.setLoop(l),
    playerInView: ref(false),
    source: () => (spotifyUri() ? 'spotify' : 'file'),
    spotifyHost: () => (spotifyUri() ? (spotify?.host() ?? null) : null),
    attachSpotify(container, height) {
      if (!player || !('attach' in player)) return
      // Spotify reemplaza el elemento por su iframe: se le da uno propio, no el de Vue.
      const target = document.createElement('div')
      container.appendChild(target)
      player.attach(target, height)
    },
    onTrackChange(listener) {
      trackListeners.add(listener)
      return () => trackListeners.delete(listener)
    },
  }
  provide(KEY, context)
  return context
}

/** null fuera de InvitationRenderer. */
export function useMusic(): MusicContext | null {
  return inject(KEY, null)
}

let spotifyApi: Promise<SpotifyIframeApi> | null = null

/** Carga una sola vez la API oficial del reproductor de Spotify. */
export function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  spotifyApi ??= new Promise((resolve, reject) => {
    const w = window as Window & {
      onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void
      SpotifyIframeConfig?: Record<string, string>
    }
    w.SpotifyIframeConfig = { ...w.SpotifyIframeConfig, locale: SPOTIFY_LOCALE }
    w.onSpotifyIframeApiReady = resolve
    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.async = true
    script.onerror = () => {
      spotifyApi = null
      script.remove()
      reject(new Error('No se pudo cargar Spotify'))
    }
    document.head.appendChild(script)
  })
  return spotifyApi
}
