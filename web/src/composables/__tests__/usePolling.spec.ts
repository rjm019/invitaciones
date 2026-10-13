import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { usePolling } from '../usePolling'

afterEach(() => vi.useRealTimers())

const mountWith = (task: () => Promise<void> | void, enabled = () => true) =>
  mount(defineComponent({ setup: () => (usePolling(task, 5000, enabled), () => null) }))

describe('usePolling', () => {
  it('pregunta cada 5 s y deja de hacerlo al salir del panel', async () => {
    vi.useFakeTimers()
    const task = vi.fn()
    const wrapper = mountWith(task)
    await vi.advanceTimersByTimeAsync(15000)
    expect(task).toHaveBeenCalledTimes(3)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(15000)
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('no corre si está apagado (sin sesión) y al volver a la pestaña pregunta de inmediato', async () => {
    vi.useFakeTimers()
    const task = vi.fn()
    let on = false
    const wrapper = mountWith(task, () => on)
    await vi.advanceTimersByTimeAsync(10000)
    expect(task).not.toHaveBeenCalled()

    on = true
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(0)
    expect(task).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('nunca se encima: si la consulta anterior no termina, se salta la siguiente', async () => {
    vi.useFakeTimers()
    let release: () => void = () => {}
    const task = vi.fn(() => new Promise<void>((r) => (release = r)))
    const wrapper = mountWith(task)
    await vi.advanceTimersByTimeAsync(15000)
    expect(task).toHaveBeenCalledTimes(1)
    release()
    await vi.advanceTimersByTimeAsync(5000)
    expect(task).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
