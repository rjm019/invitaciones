import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useAssetsReady, type AssetLoaders, type CriticalAssets } from '../useAssetsReady'

afterEach(() => vi.useRealTimers())

function mountWith(source: Ref<CriticalAssets | null>, loaders: AssetLoaders, timeoutMs = 5000) {
  let ready!: Ref<boolean>
  const wrapper = mount(
    defineComponent({
      setup: () => (
        (ready = useAssetsReady(() => source.value, { loaders, timeoutMs })),
        () => null
      ),
    }),
  )
  return { wrapper, ready: () => ready.value }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('useAssetsReady', () => {
  it('espera al tema y luego a sus imágenes y fuentes', async () => {
    const source = ref<CriticalAssets | null>(null)
    const loaded: string[] = []
    let finishFonts!: () => void
    const loaders: AssetLoaders = {
      image: async (url) => void loaded.push(url),
      fonts: () => new Promise((r) => (finishFonts = r)),
    }
    const { ready } = mountWith(source, loaders)
    await flush()
    expect(ready()).toBe(false)

    source.value = { images: ['/m/sobre.webp', '/m/papel.webp'], fonts: ['Pinyon Script'] }
    await nextTick()
    await flush()
    expect(loaded).toEqual(['/m/sobre.webp', '/m/papel.webp'])
    expect(ready()).toBe(false) // faltan las fuentes

    finishFonts()
    await flush()
    expect(ready()).toBe(true)
  })

  it('si algo tarda demasiado, la invitación se muestra igual', async () => {
    vi.useFakeTimers()
    const source = ref<CriticalAssets | null>({ images: ['/m/lenta.webp'], fonts: [] })
    const never = () => new Promise<void>(() => {})
    const { ready } = mountWith(source, { image: never, fonts: never }, 3000)
    await vi.advanceTimersByTimeAsync(2999)
    expect(ready()).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(ready()).toBe(true)
  })

  it('al salir de la página no quedan temporizadores', async () => {
    vi.useFakeTimers()
    const source = ref<CriticalAssets | null>({ images: [], fonts: [] })
    const never = () => new Promise<void>(() => {})
    const { wrapper } = mountWith(source, { image: never, fonts: never })
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
