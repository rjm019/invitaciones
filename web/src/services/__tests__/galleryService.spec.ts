import { describe, expect, it } from 'vitest'
import { galleryItems, stepIndex, swipeAction } from '../galleryService'

describe('stepIndex', () => {
  it('avanza y retrocede', () => {
    expect(stepIndex(1, 1, 5)).toBe(2)
    expect(stepIndex(3, -1, 5)).toBe(2)
  })

  it('da la vuelta en los extremos', () => {
    expect(stepIndex(4, 1, 5)).toBe(0)
    expect(stepIndex(0, -1, 5)).toBe(4)
  })

  it('con una sola foto o ninguna se queda en 0', () => {
    expect(stepIndex(0, 1, 1)).toBe(0)
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})

describe('swipeAction', () => {
  it('izquierda es la siguiente y derecha la anterior', () => {
    expect(swipeAction(-120, 10)).toBe('next')
    expect(swipeAction(120, -10)).toBe('prev')
  })

  it('hacia abajo cierra; hacia arriba no hace nada', () => {
    expect(swipeAction(5, 140)).toBe('close')
    expect(swipeAction(5, -140)).toBeNull()
  })

  it('un movimiento corto no cuenta', () => {
    expect(swipeAction(20, 30)).toBeNull()
  })
})

describe('galleryItems', () => {
  const resolve = (file: string) => (file === 'falta.webp' ? null : `/media/${file}`)

  it('las horizontales van a lo ancho y las verticales no, con su proporción', () => {
    const items = galleryItems(
      [
        { photo: 'h.webp', caption: 'A', width: 1200, height: 800 },
        { photo: 'v.webp', caption: '', width: 1200, height: 1800 },
      ],
      resolve,
    )
    expect(items.map((i) => [i.src, i.wide])).toEqual([
      ['/media/h.webp', true],
      ['/media/v.webp', false],
    ])
    expect(items[0].ratio).toBeCloseTo(1.5)
  })

  it('sin medidas, una de cada tres a lo ancho; una foto sola, siempre', () => {
    const three = galleryItems(
      ['a', 'b', 'c'].map((n) => ({ photo: `${n}.webp`, caption: '' })),
      resolve,
    )
    expect(three.map((i) => i.wide)).toEqual([true, false, false])
    const one = galleryItems([{ photo: 'v.webp', caption: '', width: 600, height: 900 }], resolve)
    expect(one[0].wide).toBe(true)
  })

  it('se salta las fotos que no existen', () => {
    expect(galleryItems([{ photo: 'falta.webp', caption: '' }], resolve)).toEqual([])
    expect(galleryItems(undefined, resolve)).toEqual([])
  })
})
