import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useDragSort } from '../useDragSort'

/** Tres renglones de 40 px uno debajo del otro. */
const ROW = 40
let wrapper: VueWrapper | null = null

function setup() {
  const onMove = vi.fn()
  let sort!: ReturnType<typeof useDragSort>
  wrapper = mount(
    defineComponent({
      setup() {
        const list = ref<HTMLElement | null>(null)
        sort = useDragSort(list, onMove)
        return () =>
          h(
            'ol',
            { ref: list },
            [0, 1, 2].map((i) => h('li', { 'data-sort-index': i }, h('button', `Fila ${i}`))),
          )
      },
    }),
    { attachTo: document.body },
  )
  wrapper.findAll('li').forEach((li, i) => {
    li.element.getBoundingClientRect = () =>
      ({ top: i * ROW, height: ROW, bottom: (i + 1) * ROW }) as DOMRect
  })
  /** Presionar el asa del renglón `i` (como lo haría el navegador). */
  function press(i: number, pointerType = 'mouse', pointerId = 7): void {
    const down = Object.assign(new Event('pointerdown', { cancelable: true }), {
      button: 0,
      pointerType,
      pointerId,
      clientY: i * ROW + ROW / 2,
    })
    Object.defineProperty(down, 'currentTarget', { value: wrapper!.findAll('button')[i].element })
    sort.start(down as unknown as PointerEvent, i)
  }

  function drag(from: number, toY: number): void {
    press(from)
    window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 7, clientY: toY }))
    expect(sort.target.value).not.toBeNull()
    window.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 7, clientY: toY }))
  }

  return { sort, onMove, press, drag }
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('useDragSort', () => {
  it('soltar abajo del último lo manda al final; arriba del primero, al principio', () => {
    const { onMove, drag, sort } = setup()
    drag(0, 3 * ROW - 5)
    expect(onMove).toHaveBeenLastCalledWith(0, 2)
    drag(2, 5)
    expect(onMove).toHaveBeenLastCalledWith(2, 0)
    expect(sort.dragging.value).toBeNull()
    expect(sort.target.value).toBeNull()
  })

  it('soltarlo en su mismo lugar no mueve nada', () => {
    const { onMove, drag } = setup()
    drag(1, ROW + ROW / 2 + 5)
    drag(1, ROW + 5)
    expect(onMove).not.toHaveBeenCalled()
  })

  it('mientras arrastra, dice cuál se mueve, cuánto y dónde caería', () => {
    const { sort, press } = setup()
    press(0, 'touch', 3)
    window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 3, clientY: 70 }))
    expect(sort.dragging.value).toBe(0)
    expect(sort.offset.value).toBe(50)
    expect(sort.target.value).toBe(2)

    // Otro dedo no cuenta; cancelar deja todo como estaba.
    window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 9, clientY: 0 }))
    expect(sort.offset.value).toBe(50)
    window.dispatchEvent(new Event('pointercancel'))
    expect(sort.dragging.value).toBeNull()
  })

  it('con el teclado: Alt + flechas, sin salirse de la lista', () => {
    const { sort, onMove } = setup()
    const key = (key: string, altKey = true) =>
      Object.assign(new KeyboardEvent('keydown', { key, altKey, cancelable: true }))
    sort.keydown(key('ArrowDown'), 0, 3)
    expect(onMove).toHaveBeenLastCalledWith(0, 1)
    sort.keydown(key('ArrowUp'), 2, 3)
    expect(onMove).toHaveBeenLastCalledWith(2, 1)
    sort.keydown(key('ArrowUp'), 0, 3)
    sort.keydown(key('ArrowDown'), 2, 3)
    sort.keydown(key('ArrowDown', false), 0, 3)
    expect(onMove).toHaveBeenCalledTimes(2)
  })
})
