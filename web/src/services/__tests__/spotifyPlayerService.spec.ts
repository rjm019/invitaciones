import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BLOCKED_AFTER_MS,
  BLOCKED_MESSAGE,
  createSpotifyPlayer,
  type SpotifyController,
  type SpotifyIframeApi,
} from '../spotifyPlayerService'

/** Imita el controlador de Spotify: guarda los comandos y deja disparar sus eventos. */
function fakeSpotify() {
  const handlers: Record<string, ((e: { data?: unknown }) => void)[]> = {}
  const attributes: Record<string, string> = {}
  const controller = {
    iframeElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) },
    addListener: (event: string, handler: (e: { data?: unknown }) => void) =>
      (handlers[event] ??= []).push(handler),
    loadUri: vi.fn(),
    play: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    destroy: vi.fn(),
  } satisfies SpotifyController
  const api: SpotifyIframeApi = { createController: vi.fn((_el, _opts, cb) => cb(controller)) }
  const emit = (event: string, data?: unknown) => handlers[event]?.forEach((h) => h({ data }))
  return { api, controller, attributes, emit }
}

afterEach(() => vi.useRealTimers())

describe('createSpotifyPlayer', () => {
  it('crea el reproductor oscuro con la playlist y lo carga sin esperar al scroll', async () => {
    const { api, controller, attributes } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    const host = {}
    player.attach(host, 352)
    player.attach(host, 352) // el mismo lugar: no se vuelve a crear
    await Promise.resolve()

    expect(api.createController).toHaveBeenCalledTimes(1)
    expect(api.createController).toHaveBeenCalledWith(
      host,
      { width: '100%', height: '352', theme: 'dark' },
      expect.any(Function),
    )
    expect(attributes.loading).toBe('eager')
    expect(controller.loadUri).toHaveBeenCalledWith('spotify:playlist:Ab1')
    expect(player.state()).toMatchObject({ available: true, canLoop: false, playing: false })
  })

  it('avisa cuando empieza otra canción, no en cada avance del tiempo', async () => {
    const { api, emit } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    const changed = vi.fn()
    const stop = player.onTrackChange(changed)
    player.attach({}, 352)
    await Promise.resolve()

    emit('playback_update', { isPaused: false, position: 0, playingURI: '' })
    emit('playback_update', { isPaused: false, position: 0, playingURI: 'spotify:track:A' })
    emit('playback_update', { isPaused: false, position: 900, playingURI: 'spotify:track:A' })
    expect(changed).toHaveBeenCalledTimes(1)
    emit('playback_update', { isPaused: false, position: 0, playingURI: 'spotify:track:B' })
    expect(changed).toHaveBeenCalledTimes(2)

    stop()
    emit('playback_update', { isPaused: false, position: 0, playingURI: 'spotify:track:C' })
    expect(changed).toHaveBeenCalledTimes(2)
  })

  it('el play del sobre llega aunque Spotify todavía no cargue', async () => {
    const { api, controller } = fakeSpotify()
    let ready!: (value: SpotifyIframeApi) => void
    const player = createSpotifyPlayer(
      'spotify:playlist:Ab1',
      () => new Promise((r) => (ready = r)),
    )
    player.attach({}, 352)
    await player.play() // se abre el sobre antes de que llegue la API
    ready(api)
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.play).toHaveBeenCalledTimes(1)
  })

  it('sigue lo que hace Spotify: sonando, tiempo y duración', async () => {
    const { api, controller, emit } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    player.attach({}, 352)
    await Promise.resolve()

    await player.play()
    expect(controller.play).toHaveBeenCalledTimes(1)
    emit('playback_update', { isPaused: false, position: 15_000, duration: 30_000 })
    expect(player.state()).toMatchObject({
      playing: true,
      started: true,
      current: 15,
      duration: 30,
    })

    await player.toggle()
    expect(controller.pause).toHaveBeenCalled()
    emit('playback_update', { isPaused: true, position: 16_000, duration: 30_000 })
    await player.toggle()
    expect(controller.resume).toHaveBeenCalled() // ya había sonado: continúa, no empieza de cero

    player.skip(10)
    expect(controller.seek).toHaveBeenLastCalledWith(26)
    player.seek(99)
    expect(controller.seek).toHaveBeenLastCalledWith(30)
    player.setLoop(true)
    expect(player.state().loop).toBe(false)
  })

  it('si el navegador bloquea el play (iPhone), pide tocar el reproductor', async () => {
    vi.useFakeTimers()
    const { api, emit } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    player.attach({}, 352)
    await Promise.resolve()

    await player.play()
    await vi.advanceTimersByTimeAsync(BLOCKED_AFTER_MS)
    expect(player.state().error).toBe(BLOCKED_MESSAGE)

    emit('playback_update', { isPaused: false, position: 0, duration: 30_000 })
    expect(player.state().error).toBeNull()
  })

  it('si Spotify no carga, la música queda apagada con un aviso', async () => {
    const player = createSpotifyPlayer('spotify:playlist:Ab1', () => Promise.reject(new Error('x')))
    player.attach({}, 352)
    await Promise.resolve()
    await Promise.resolve()
    expect(player.state()).toMatchObject({ available: false })
    expect(player.state().error).toContain('Spotify')
  })

  it('si la sección se vuelve a montar, el reproductor se muda y sigue sonando', async () => {
    const { api, controller } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    player.attach({}, 352)
    await Promise.resolve()
    await player.play()

    const nuevo = {}
    player.attach(nuevo, 352)
    expect(controller.destroy).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(vi.mocked(api.createController).mock.calls[1]![0]).toBe(nuevo)
    expect(controller.play).toHaveBeenCalledTimes(2)
  })

  it('al salir de la invitación se quita el reproductor', async () => {
    const { api, controller } = fakeSpotify()
    const player = createSpotifyPlayer('spotify:playlist:Ab1', async () => api)
    player.attach({}, 352)
    await Promise.resolve()
    player.destroy()
    expect(controller.destroy).toHaveBeenCalled()
  })
})
