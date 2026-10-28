import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useElementWidth } from '../useElementWidth'

let callback: ResizeObserverCallback | null = null
const disconnect = vi.fn()

class FakeObserver {
  constructor(cb: ResizeObserverCallback) {
    callback = cb
  }
  observe() {}
  disconnect() {
    disconnect()
  }
}

const Probe = defineComponent({
  setup() {
    const el = ref<HTMLElement | null>(null)
    const width = useElementWidth(el)
    return () => h('div', { ref: el, 'data-w': String(width.value) })
  },
})

describe('useElementWidth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    callback = null
  })

  it('da 0 sin ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    expect(mount(Probe).attributes('data-w')).toBe('0')
  })

  it('sigue el ancho medido y se desconecta al desmontar', async () => {
    vi.stubGlobal('ResizeObserver', FakeObserver)
    const wrapper = mount(Probe)
    callback?.([{ contentRect: { width: 72.4 } } as ResizeObserverEntry], {} as ResizeObserver)
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('data-w')).toBe('72')
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
