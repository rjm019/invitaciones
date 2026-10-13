import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useSteadyScroll } from '../useSteadyScroll'

afterEach(() => vi.restoreAllMocks())

function mountPage() {
  let hold!: () => void
  const unsubscribe = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        useSteadyScroll((h) => ((hold = h), unsubscribe))
        return () => null
      },
    }),
  )
  return { wrapper, hold: () => hold(), unsubscribe }
}

const moveTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('useSteadyScroll', () => {
  it('si la página se mueve sola después del aviso, regresa a donde estaba', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { hold } = mountPage()
    moveTo(300)
    hold()
    moveTo(4400)
    expect(scrollTo).toHaveBeenCalledWith(window.scrollX, 300)
  })

  it('si el invitado está moviéndose, no se le estorba', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { hold } = mountPage()
    moveTo(300)
    hold()
    window.dispatchEvent(new Event('touchstart'))
    moveTo(900)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('al salir de la invitación deja de escuchar', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { wrapper, hold, unsubscribe } = mountPage()
    wrapper.unmount()
    expect(unsubscribe).toHaveBeenCalled()
    hold()
    moveTo(4400)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
