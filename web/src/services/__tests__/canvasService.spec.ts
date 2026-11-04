import { describe, expect, it } from 'vitest'
import {
  canvasColor,
  existingStyle,
  freeElements,
  freeVars,
  hasCanvas,
  parseTarget,
  percentToPx,
  resolveCanvas,
  targetElements,
  targetName,
} from '../canvasService'
import type { CanvasElement } from '@/types/event'

describe('canvasService', () => {
  it('entiende los objetivos y los vuelve a nombrar', () => {
    expect(parseTarget('texto:title:0')).toEqual({ kind: 'text', block: 'title', index: 0 })
    expect(parseTarget('imagen:12')).toEqual({ kind: 'image', index: 12 })
    expect(parseTarget('texto:title')).toBeNull()
    expect(parseTarget('foto:1')).toBeNull()
    expect(parseTarget(undefined)).toBeNull()
    expect(targetName({ kind: 'text', block: 'time', index: 3 })).toBe('texto:time:3')
    expect(targetName({ kind: 'image', index: 1 })).toBe('imagen:1')
  })

  it('manda el celular y en escritorio cada valor propio lo pisa, el resto hereda', () => {
    const element: CanvasElement = {
      id: 'lienzo-1',
      target: 'texto:title:0',
      x: 10,
      y: 5,
      rotation: 15,
      opacity: 80,
      flip_h: true,
      layer: 2,
      desktop: { x: 40, hidden: true },
    }
    expect(resolveCanvas(element, false)).toEqual({
      x: 10,
      y: 5,
      width: null,
      height: null,
      rotation: 15,
      scale: 1,
      scaleY: null,
      opacity: 80,
      hidden: false,
      removed: false,
      flipH: true,
      flipV: false,
      layer: 2,
    })
    expect(resolveCanvas(element, true)).toMatchObject({
      x: 40,
      y: 5,
      rotation: 15,
      opacity: 80,
      hidden: true,
    })
    // Un elemento sin nada no toca nada.
    expect(resolveCanvas({ id: 'lienzo-2' }, true)).toMatchObject({
      x: 0,
      y: 0,
      scale: 1,
      opacity: null,
      hidden: false,
    })
  })

  it('un desplazamiento en % del contenedor se vuelve px proporcionales a su ancho', () => {
    expect(percentToPx(10, 400)).toBe(40)
    expect(percentToPx(-12.5, 390)).toBe(-48.75)
    const r = resolveCanvas({ id: 'a', target: 'imagen:0', x: 10, y: -5 }, false)
    expect(existingStyle(r, 400)).toEqual({ translate: '40px -20px' })
    expect(existingStyle(r, 800)).toEqual({ translate: '80px -40px' })
  })

  it('usa solo propiedades individuales (nunca transform) y solo las que cambian algo', () => {
    expect(existingStyle(resolveCanvas({ id: 'a', target: 'imagen:0' }, false), 400)).toEqual({})
    const style = existingStyle(
      resolveCanvas(
        {
          id: 'a',
          target: 'imagen:0',
          rotation: -20,
          scale: 1.5,
          flip_h: true,
          flip_v: true,
          opacity: 50,
          hidden: true,
        },
        false,
      ),
      400,
    )
    expect(style).toEqual({
      rotate: '-20deg',
      scale: '-1.5 -1.5',
      opacity: '0.5',
      visibility: 'hidden',
    })
    expect(Object.keys(style)).not.toContain('transform')
    expect(
      existingStyle(resolveCanvas({ id: 'a', target: 'imagen:0', flip_v: true }, false), 400),
    ).toEqual({ scale: '1 -1' })
  })

  it('separa los libres de los que acomodan algo existente y ordena las capas', () => {
    const canvas: CanvasElement[] = [
      { id: 'lienzo-1', target: 'texto:title:0' },
      { id: 'lienzo-2', kind: 'text', text: 'Arriba', layer: 5 },
      { id: 'lienzo-3', kind: 'shape', shape: 'line' },
      { id: 'lienzo-4', kind: 'image', image: 'a.webp', layer: -1 },
      { id: 'lienzo-5', target: 'objetivo-malo' },
    ]
    expect(freeElements(canvas).map((e) => e.id)).toEqual(['lienzo-4', 'lienzo-3', 'lienzo-2'])
    expect(targetElements(canvas).map((e) => e.id)).toEqual(['lienzo-1'])
    expect(hasCanvas(canvas)).toBe(true)
    expect(hasCanvas([])).toBe(false)
    expect(hasCanvas(undefined)).toBe(false)
  })

  it('los colores son hex tal cual o tokens de la paleta', () => {
    expect(canvasColor('#ABCDEF')).toBe('#ABCDEF')
    expect(canvasColor('accent-strong')).toBe('var(--color-accent-strong)')
    expect(canvasColor(undefined)).toBeUndefined()
  })

  it('las variables de un elemento libre llevan su posición, giro, volteo y aspecto', () => {
    const element: CanvasElement = {
      id: 'lienzo-1',
      kind: 'text',
      text: 'Hola',
      x: 12,
      y: 30,
      width: 40,
      rotation: 8,
      scale: 2,
      flip_h: true,
      font: 'Great Vibes',
      size: 6,
      align: 'left',
      color: 'accent',
      opacity: 25,
      layer: 3,
      desktop: { x: 60, width: 20, opacity: 100 },
    }
    expect(freeVars(element, false)).toEqual({
      '--cv-x': '12',
      '--cv-y': '30',
      '--cv-w': '40',
      '--cv-rotate': '8deg',
      '--cv-scale-x': '-2',
      '--cv-scale-y': '2',
      '--cv-layer': '3',
      '--cv-opacity': '0.25',
      '--cv-size': '6',
      '--cv-color': 'var(--color-accent)',
      '--cv-font': "'Great Vibes', var(--font-serif)",
      '--cv-align': 'left',
    })
    expect(freeVars(element, true)).toMatchObject({
      '--cv-x': '60',
      '--cv-w': '20',
      '--cv-y': '30',
      '--cv-opacity': '1',
    })
    // Sin ancho propio, cada tipo trae el suyo.
    expect(freeVars({ id: 'a', kind: 'image' }, false)['--cv-w']).toBe('30')
    expect(freeVars({ id: 'a', kind: 'text' }, false)['--cv-w']).toBe('50')
  })

  it('el alto y la escala vertical se resuelven, y quitado solo deja display: none', () => {
    const el: CanvasElement = { id: 'lienzo-1', target: 'imagen:0', scale: 1.5, scale_y: 0.8, desktop: { scale_y: 1, removed: true } }
    expect(resolveCanvas(el, false)).toMatchObject({ scale: 1.5, scaleY: 0.8, removed: false })
    expect(resolveCanvas(el, true)).toMatchObject({ scaleY: 1, removed: true })
    expect(existingStyle(resolveCanvas(el, false), 400).scale).toBe('1.5 0.8')
    expect(existingStyle({ ...resolveCanvas(el, false), flipV: true }, 400).scale).toBe('1.5 -0.8')
    expect(existingStyle(resolveCanvas({ id: 'a', target: 'imagen:0', scale: 2 }, false), 400).scale).toBe('2 2')
    expect(existingStyle(resolveCanvas(el, true), 400)).toEqual({ display: 'none' })
  })

  it('el alto solo viaja en imagen y forma libres (no en texto ni en línea)', () => {
    const vars = (element: CanvasElement) => freeVars({ ...element, height: 12 }, false)
    expect(vars({ id: 'a', kind: 'image', image: 'a.webp' })['--cv-h']).toBe('12')
    expect(vars({ id: 'b', kind: 'shape', shape: 'rectangle' })['--cv-h']).toBe('12')
    expect(vars({ id: 'c', kind: 'shape', shape: 'line' })['--cv-h']).toBeUndefined()
    expect(vars({ id: 'd', kind: 'text', text: 'x' })['--cv-h']).toBeUndefined()
    expect(freeVars({ id: 'e', kind: 'image', image: 'a.webp' }, false)['--cv-h']).toBeUndefined()
  })
})
