import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  BURST_MS,
  provideCelebration,
  useCelebration,
  type CelebrationContext,
} from '../useCelebration'

afterEach(() => {
  vi.useRealTimers()
  document.documentElement.style.removeProperty('--motion-scale')
})

function mountPage(reduced = false) {
  let fromChild: CelebrationContext | null = null
  const Child = defineComponent({ setup: () => ((fromChild = useCelebration()), () => null) })
  const wrapper = mount(
    defineComponent({ setup: () => (provideCelebration(() => reduced), () => h(Child)) }),
  )
  return { wrapper, child: () => fromChild! }
}

describe('useCelebration', () => {
  it('cada celebración lanza una ráfaga que se quita sola al terminar', async () => {
    vi.useFakeTimers()
    const { child } = mountPage()
    child().celebrate()
    child().celebrate()
    expect(child().bursts.value).toHaveLength(2)
    expect(child().bursts.value[0]!.pieces.length).toBeGreaterThan(20)

    await vi.advanceTimersByTimeAsync(BURST_MS)
    expect(child().bursts.value).toHaveLength(0)
  })

  it('al abrir el sobre pueden ser estrellitas en lugar de confeti', () => {
    vi.useFakeTimers()
    const { child } = mountPage()
    child().celebrate('stars')
    child().celebrate()
    const [stars, confetti] = child().bursts.value
    expect(stars!.pieces.every((p) => p.shape === 'star')).toBe(true)
    expect(confetti!.pieces.some((p) => p.shape === 'star')).toBe(false)
  })

  it('si los efectos van más lentos, la ráfaga se queda lo mismo de más', async () => {
    vi.useFakeTimers()
    document.documentElement.style.setProperty('--motion-scale', '1.1')
    const { child } = mountPage()
    child().celebrate()
    await vi.advanceTimersByTimeAsync(BURST_MS)
    expect(child().bursts.value).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(BURST_MS * 0.1)
    expect(child().bursts.value).toHaveLength(0)
  })

  it('con "menos movimiento" no se lanza nada', () => {
    const { child } = mountPage(true)
    child().celebrate()
    expect(child().bursts.value).toHaveLength(0)
  })

  it('al salir de la invitación no quedan temporizadores', async () => {
    vi.useFakeTimers()
    const { wrapper, child } = mountPage()
    child().celebrate()
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fuera de la invitación no hay celebración', () => {
    let ctx: CelebrationContext | null | undefined
    mount(defineComponent({ setup: () => ((ctx = useCelebration()), () => null) }))
    expect(ctx).toBeNull()
  })
})
