import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useEmbedFocus } from '../useEmbedFocus'

afterEach(() => vi.useRealTimers())

function mountFrame(onEnter: () => void) {
  return mount(
    defineComponent({
      setup() {
        const frame = ref<HTMLIFrameElement | null>(null)
        useEmbedFocus(frame, onEnter)
        return () => h('div', [h('iframe', { ref: frame, tabindex: 0 }), h('button', 'otro')])
      },
    }),
    { attachTo: document.body },
  )
}

describe('useEmbedFocus', () => {
  it('avisa cuando el foco se va al iframe (tocar play en Spotify)', async () => {
    vi.useFakeTimers()
    const onEnter = vi.fn()
    const wrapper = mountFrame(onEnter)

    wrapper.find('iframe').element.focus()
    window.dispatchEvent(new Event('blur'))
    await vi.runAllTimersAsync()
    expect(onEnter).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('no avisa si la página pierde el foco por otra cosa, ni después de desmontar', async () => {
    vi.useFakeTimers()
    const onEnter = vi.fn()
    const wrapper = mountFrame(onEnter)

    wrapper.find('button').element.focus()
    window.dispatchEvent(new Event('blur'))
    await vi.runAllTimersAsync()
    expect(onEnter).not.toHaveBeenCalled()

    wrapper.find('iframe').element.focus()
    wrapper.unmount()
    window.dispatchEvent(new Event('blur'))
    await vi.runAllTimersAsync()
    expect(onEnter).not.toHaveBeenCalled()
  })
})
