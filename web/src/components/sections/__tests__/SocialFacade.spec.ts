import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { provideMusic, type MusicContext } from '@/composables/useMusic'
import type { EventConfig, ResolvedSection } from '@/types/event'
import SocialPostSection from '../SocialPostSection.vue'
import VideoSection from '../VideoSection.vue'

/** Todo lo que una invitación podría pedir a las redes: iframes, scripts y su `blockquote`. */
function thirdParty(root: ParentNode = document): { iframes: number; scripts: number } {
  return {
    iframes: root.querySelectorAll('iframe').length,
    scripts: root.querySelectorAll('script[src]').length,
  }
}

function section(extra: Partial<ResolvedSection>): ResolvedSection {
  return {
    type: 'video',
    effects: [],
    visible: true,
    id: 'video',
    decor: {},
    panel: true,
    desktop: 'full',
    ...extra,
  } as ResolvedSection
}

function render(component: typeof VideoSection | typeof SocialPostSection, s: ResolvedSection) {
  let music!: MusicContext
  const wrapper = mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({}) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        music = provideMusic(() => null)
        vi.spyOn(music, 'pause')
        return () => h(component, { section: s })
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, music }
}

const youtube = section({
  video: {
    source: 'youtube',
    format: 'horizontal',
    network: 'youtube',
    kind: 'video',
    id: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embed: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  },
})

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('script').forEach((s) => s.remove())
})

describe('fachada de video y publicaciones', () => {
  it('al montar YouTube no hay iframes, scripts ni imágenes de terceros', () => {
    const { wrapper } = render(VideoSection, youtube)
    expect(thirdParty()).toEqual({ iframes: 0, scripts: 0 })
    // Ni siquiera la miniatura de YouTube: sin `poster` es un fondo con ícono.
    expect(document.body.innerHTML).not.toMatch(
      /ytimg|youtube|instagram|facebook|fbcdn|cdninstagram/i,
    )
    expect(wrapper.find('button.player__play').exists()).toBe(true)
  })

  it('con poster propio, solo carga esa imagen', () => {
    const poster = 'https://ejemplo.test/media/x/poster.webp'
    const { wrapper } = render(VideoSection, section({ video: { ...youtube.video!, poster } }))
    expect(wrapper.findAll('img').map((i) => i.attributes('src'))).toEqual([poster])
    expect(thirdParty()).toEqual({ iframes: 0, scripts: 0 })
  })

  it('al tocar play carga el iframe sin cookies y pausa la música', async () => {
    const { wrapper, music } = render(VideoSection, youtube)
    await wrapper.find('button.player__play').trigger('click')
    const frame = wrapper.find('iframe')
    expect(frame.attributes('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1',
    )
    expect(music.pause).toHaveBeenCalledTimes(1)
  })

  const reel = section({
    type: 'social-post',
    post: {
      network: 'instagram',
      kind: 'reel',
      id: 'C8abcDEF123',
      url: 'https://www.instagram.com/reel/C8abcDEF123/',
      embed: null,
    },
  })

  it('Instagram: al montar no hay script; al tocar se pide embed.js', async () => {
    const { wrapper, music } = render(SocialPostSection, reel)
    expect(thirdParty()).toEqual({ iframes: 0, scripts: 0 })
    expect(document.querySelector('blockquote')).toBeNull()

    await wrapper.find('button.player__play').trigger('click')
    expect(document.querySelector('script[src]')?.getAttribute('src')).toBe(
      'https://www.instagram.com/embed.js',
    )
    expect(music.pause).toHaveBeenCalled()
  })

  it('Instagram con su script ya cargado: arma el blockquote oficial y lo procesa', async () => {
    const process = vi.fn()
    Object.assign(window, { instgrm: { Embeds: { process } } })
    try {
      const { wrapper } = render(SocialPostSection, reel)
      await wrapper.find('button.player__play').trigger('click')
      await flushPromises()
      expect(
        document
          .querySelector('blockquote.instagram-media')
          ?.getAttribute('data-instgrm-permalink'),
      ).toBe('https://www.instagram.com/reel/C8abcDEF123/')
      expect(process).toHaveBeenCalledTimes(1)
    } finally {
      Reflect.deleteProperty(window, 'instgrm')
    }
  })

  it('si la red falla, queda el botón "Ver en Instagram"', async () => {
    const post = section({
      type: 'social-post',
      post: {
        network: 'instagram',
        kind: 'post',
        id: 'Cabc_12-x',
        url: 'https://www.instagram.com/p/Cabc_12-x/',
        embed: null,
      },
    })
    const { wrapper } = render(SocialPostSection, post)
    await wrapper.find('button.player__play').trigger('click')
    await flushPromises()
    document.querySelector('script[src]')?.dispatchEvent(new Event('error'))
    await flushPromises()
    const link = wrapper.find('a.player__open')
    expect(link.text()).toContain('Ver en Instagram')
    expect(link.attributes('href')).toBe('https://www.instagram.com/p/Cabc_12-x/')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('un enlace que no pasa la validación nunca llega a un iframe', async () => {
    const evil = section({
      video: {
        source: 'youtube',
        format: 'horizontal',
        network: 'youtube',
        kind: 'video',
        id: 'x',
        url: 'javascript:alert(1)',
        embed: 'javascript:alert(1)',
      },
    })
    const { wrapper } = render(VideoSection, evil)
    await wrapper.find('button.player__play').trigger('click')
    expect(thirdParty()).toEqual({ iframes: 0, scripts: 0 })
    expect(wrapper.find('a.player__open').exists()).toBe(false)
  })

  it('un MP4 propio no toca ninguna red: <video> hasta el toque', async () => {
    const file = section({
      video: { source: 'file', format: 'vertical', file: 'https://ejemplo.test/media/x/baile.mp4' },
    })
    const { wrapper, music } = render(VideoSection, file)
    expect(wrapper.find('video').exists()).toBe(false)
    await wrapper.find('button.player__play').trigger('click')
    expect(wrapper.find('video').attributes('src')).toBe('https://ejemplo.test/media/x/baile.mp4')
    expect(music.pause).toHaveBeenCalled()
    expect(thirdParty()).toEqual({ iframes: 0, scripts: 0 })
  })
})
