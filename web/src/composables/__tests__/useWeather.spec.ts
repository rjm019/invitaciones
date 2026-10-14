import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { EventWeather } from '@/types/weather'

const { getWeather } = vi.hoisted(() => ({ getWeather: vi.fn() }))
vi.mock('@/services/weatherService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/weatherService')>()),
  getWeather,
}))

import { useWeather } from '../useWeather'

const forecast = { kind: 'forecast', day: { max: 21, min: 8 } } as EventWeather
const typical = { kind: 'typical', day: { max: 20, min: 7 } } as EventWeather

function mountWeather() {
  let api!: ReturnType<typeof useWeather>
  const wrapper = mount(
    defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null)
        api = useWeather(() => 'nat', root)
        return () => h('div', { ref: root })
      },
    }),
  )
  return { wrapper, api: () => api }
}

describe('useWeather', () => {
  beforeEach(() => {
    getWeather.mockReset()
    // Sin IntersectionObserver la sección cuenta como visible desde el inicio.
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('pide el clima al acercarse y renueva el pronóstico cada 15 minutos', async () => {
    getWeather.mockResolvedValue(forecast)
    const { wrapper, api } = mountWeather()
    await flushPromises()
    expect(getWeather).toHaveBeenCalledWith('nat')
    expect(api().status.value).toBe('ready')
    expect(api().weather.value).toEqual(forecast)

    await vi.advanceTimersByTimeAsync(14 * 60 * 1000)
    expect(getWeather).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60 * 1000)
    expect(getWeather).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(getWeather).toHaveBeenCalledTimes(2)
  })

  it('el clima típico no se vuelve a pedir', async () => {
    getWeather.mockResolvedValue(typical)
    mountWeather()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(getWeather).toHaveBeenCalledTimes(1)
  })

  it('si falla una renovación se queda el clima que ya tenía', async () => {
    getWeather.mockResolvedValueOnce(forecast).mockRejectedValue(new Error('sin red'))
    const { api } = mountWeather()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(getWeather).toHaveBeenCalledTimes(2)
    expect(api().weather.value).toEqual(forecast)
    expect(api().status.value).toBe('ready')
  })

  it('si falla la primera vez avisa que no está disponible', async () => {
    getWeather.mockRejectedValue(new Error('sin red'))
    const { api } = mountWeather()
    await flushPromises()
    expect(api().status.value).toBe('error')
  })
})
