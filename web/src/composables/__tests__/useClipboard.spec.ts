import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useClipboard } from '../useClipboard'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useClipboard', () => {
  it('copia, avisa "copiado" un momento y limpia su temporizador al desmontar', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    let clip!: ReturnType<typeof useClipboard>
    const wrapper = mount(
      defineComponent({ setup: () => ((clip = useClipboard(2000)), () => null) }),
    )

    await expect(clip.copy('https://x/i/Abc', 'inv-1')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x/i/Abc')
    expect(clip.copied.value).toBe('inv-1')
    vi.advanceTimersByTime(2000)
    expect(clip.copied.value).toBeNull()
    wrapper.unmount()
  })

  it('si el navegador no deja copiar, avisa con false', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    })
    document.execCommand = vi.fn(() => false)
    let clip!: ReturnType<typeof useClipboard>
    mount(defineComponent({ setup: () => ((clip = useClipboard()), () => null) }))
    await expect(clip.copy('x')).resolves.toBe(false)
    expect(clip.copied.value).toBeNull()
  })
})
