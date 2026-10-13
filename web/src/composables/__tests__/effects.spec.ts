import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useInView } from '../useInView'
import { useParallax } from '../useParallax'
import { useScrollLock } from '../useScrollLock'

/** IntersectionObserver falso: las pruebas deciden cuándo "entra" el elemento. */
class FakeObserver {
  static last: FakeObserver
  disconnected = false
  constructor(public callback: IntersectionObserverCallback) {
    FakeObserver.last = this
  }
  observe() {}
  disconnect() {
    this.disconnected = true
  }
  enter(isIntersecting = true) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

afterEach(() => vi.unstubAllGlobals())

function withElement<T>(use: (el: Ref<HTMLElement | null>) => T) {
  let result!: T
  const Comp = defineComponent({
    setup() {
      const el = ref<HTMLElement | null>(null)
      result = use(el)
      return () => h('div', { ref: el })
    },
  })
  return { wrapper: mount(Comp), result: () => result }
}

describe('useInView', () => {
  it('se enciende al entrar y, con once, ya no se apaga ni sigue observando', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const { wrapper, result } = withElement((el) => useInView(el))
    expect(result().value).toBe(false)
    FakeObserver.last.enter()
    expect(result().value).toBe(true)
    expect(FakeObserver.last.disconnected).toBe(true)
    wrapper.unmount()
  })

  it('sin IntersectionObserver (navegador viejo) muestra todo de una vez', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { result } = withElement((el) => useInView(el))
    expect(result().value).toBe(true)
  })
})

describe('useScrollLock', () => {
  it('bloquea y desbloquea el scroll, y lo suelta al desmontar', async () => {
    const locked = ref(true)
    const wrapper = mount(
      defineComponent({ setup: () => (useScrollLock(() => locked.value), () => null) }),
    )
    const has = () => document.documentElement.classList.contains('is-scroll-locked')
    expect(has()).toBe(true)
    locked.value = false
    await nextTick()
    expect(has()).toBe(false)
    locked.value = true
    await nextTick()
    wrapper.unmount()
    expect(has()).toBe(false)
  })
})

describe('useParallax', () => {
  it('mide al entrar a la pantalla y deja de escuchar el scroll al desmontar', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const remove = vi.spyOn(window, 'removeEventListener')
    const { wrapper, result } = withElement((el) => {
      const offset = useParallax(el, 0.06, () => true)
      return { el, offset }
    })
    result().el.value!.getBoundingClientRect = () => ({ top: innerHeight, height: 0 }) as DOMRect
    FakeObserver.last.enter()
    expect(result().offset.value).toBeLessThan(0)
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
