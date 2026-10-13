import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { AudioLike } from '@/services/audioService'
import type { SpotifyIframeApi } from '@/services/spotifyPlayerService'
import { provideMusic, useMusic, type MusicContext } from '../useMusic'

class FakeAudio extends EventTarget implements AudioLike {
  src = ''
  preload = ''
  loop = false
  currentTime = 0
  duration = 90
  paused = true
  async play() {
    this.paused = false
    this.dispatchEvent(new Event('play'))
  }
  pause() {
    this.paused = true
    this.dispatchEvent(new Event('pause'))
  }
  removeAttribute() {
    this.src = ''
  }
  load() {}
}

describe('useMusic', () => {
  it('la portada, el reproductor y el mini-reproductor comparten una sola canción', async () => {
    const fake = new FakeAudio()
    let fromChild: MusicContext | null = null
    const Child = defineComponent({ setup: () => ((fromChild = useMusic()), () => null) })
    const Page = defineComponent({
      setup: () => (
        provideMusic(
          () => '/m.mp3',
          () => fake,
        ),
        () => h(Child)
      ),
    })

    const wrapper = mount(Page)
    await fromChild!.toggle()
    await nextTick()
    expect(fromChild!.state.value).toMatchObject({ available: true, playing: true, started: true })

    wrapper.unmount() // al salir de la invitación la música se detiene
    expect(fake.paused).toBe(true)
    expect(fake.src).toBe('')
  })

  it('con la música en Spotify, el sobre y los controles manejan la playlist', async () => {
    const controller = {
      addListener: vi.fn(),
      loadUri: vi.fn(),
      play: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      destroy: vi.fn(),
    }
    const api: SpotifyIframeApi = { createController: vi.fn((_el, _o, cb) => cb(controller)) }
    let fromChild: MusicContext | null = null
    const Child = defineComponent({ setup: () => ((fromChild = useMusic()), () => null) })
    const Page = defineComponent({
      setup: () => (
        provideMusic(
          () => '/m.mp3',
          () => new FakeAudio(),
          { uri: () => 'spotify:playlist:Ab1', host: () => 'spotify', loadApi: async () => api },
        ),
        () => h(Child)
      ),
    })

    const wrapper = mount(Page)
    expect(fromChild!.source()).toBe('spotify')
    expect(fromChild!.spotifyHost()).toBe('spotify')

    const container = document.createElement('section')
    fromChild!.attachSpotify(container, 352)
    await Promise.resolve()
    // Spotify recibe un elemento propio dentro de la sección (no el que maneja Vue).
    const target = vi.mocked(api.createController).mock.calls[0]![0] as HTMLElement
    expect(target.parentElement).toBe(container)
    expect(controller.loadUri).toHaveBeenCalledWith('spotify:playlist:Ab1')

    await fromChild!.play()
    expect(controller.play).toHaveBeenCalled()
    expect(fromChild!.state.value.canLoop).toBe(false)

    wrapper.unmount()
    expect(controller.destroy).toHaveBeenCalled()
  })

  it('fuera de la invitación no hay música', () => {
    let fromChild: MusicContext | null | undefined
    mount(defineComponent({ setup: () => ((fromChild = useMusic()), () => null) }))
    expect(fromChild).toBeNull()
  })
})
