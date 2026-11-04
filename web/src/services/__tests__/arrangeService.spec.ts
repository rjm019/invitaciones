import { describe, expect, it } from 'vitest'
import {
  addElement,
  alignDeltas,
  anchorTextCenter,
  applyChanges,
  distributeDeltas,
  duplicateElements,
  elementValues,
  listLayers,
  moveBy,
  normalizeAngle,
  removeElements,
  resetPlace,
  restack,
  rowIndex,
  setProperty,
  setRemoved,
  unionBox,
  valuesFromBox,
  type GestureStart,
} from '../arrangeService'
import type { DesignValues } from '@/types/design'
import type { ArrangeMeasure } from '../previewProtocol'

const free = (extra: DesignValues = {}): DesignValues => ({
  tipo: 'texto',
  texto: 'Hola',
  x: '10',
  y: '20',
  ancho: '40',
  ...extra,
})

describe('arrangeService: filas', () => {
  it('encuentra los elementos por su objetivo o por su lugar en la lista', () => {
    const canvas = [{ objetivo: 'texto:title:0', x: '1' }, free()]
    expect(rowIndex(canvas, 'texto:title:0')).toBe(0)
    expect(rowIndex(canvas, 'lienzo-2')).toBe(1)
    expect(rowIndex(canvas, 'lienzo-1')).toBe(-1)
    expect(rowIndex(canvas, 'imagen:0')).toBe(-1)
  })

  it('crea la fila de un bloque que ya existe al moverlo y redondea y limita los valores', () => {
    const out = applyChanges(
      [],
      [{ ref: 'texto:title:0', values: { x: 12.3456, y: 5000, rotation: -12.5, scale: 9 } }],
      false,
    )
    expect(out).toEqual([
      { objetivo: 'texto:title:0', x: '12.35', y: '2000', rotacion: '-12.5', escala: '5' },
    ])
  })

  it('en computadora escribe las columnas e_ y no toca las del celular', () => {
    const out = applyChanges([free()], [{ ref: 'lienzo-1', values: { x: 30, width: 55 } }], true)
    expect(out[0]).toMatchObject({ x: '10', ancho: '40', e_x: '30', e_ancho: '55' })
    const values = elementValues(out, 'lienzo-1', true)!
    expect(values.x).toBe(30)
    expect(values.y).toBe(20) // hereda del celular
    expect(elementValues(out, 'lienzo-1', false)!.x).toBe(10)
  })

  it('lo que no cambió y no está escrito no se escribe', () => {
    const out = applyChanges(
      [],
      [{ ref: 'texto:title:0', values: { x: 0, y: 4, rotation: 0, scale: 1 } }],
      true,
    )
    expect(out).toEqual([{ objetivo: 'texto:title:0', e_y: '4' }])
    // Pero un valor ya escrito sí se actualiza, aunque vuelva al de fábrica.
    expect(applyChanges(out, [{ ref: 'texto:title:0', values: { y: 0 } }], true)[0].e_y).toBe('0')
  })

  it('no inventa elementos libres que no existen', () => {
    expect(applyChanges([], [{ ref: 'lienzo-3', values: { x: 1 } }], false)).toEqual([])
  })

  it('opacidad, ocultar, voltear y bloquear', () => {
    let canvas = setProperty([free()], 'lienzo-1', 'opacity', 40, false)
    canvas = setProperty(canvas, 'lienzo-1', 'flipH', true, false)
    canvas = setProperty(canvas, 'lienzo-1', 'locked', true, false)
    canvas = setProperty(canvas, 'lienzo-1', 'hidden', true, true)
    expect(canvas[0]).toMatchObject({
      opacidad: '40',
      voltear_h: 'SI',
      bloqueado: 'SI',
      e_oculto: 'SI',
    })
    const v = elementValues(canvas, 'lienzo-1', true)!
    expect(v).toMatchObject({ opacity: 40, flipH: true, locked: true, hidden: true })
    expect(elementValues(canvas, 'lienzo-1', false)!.hidden).toBe(false)
    canvas = setProperty(canvas, 'lienzo-1', 'opacity', 100, false)
    expect(canvas[0].opacidad).toBeUndefined()
  })

  it('«volver a su lugar» quita lo de esta pantalla y la fila si no queda nada', () => {
    const canvas = [{ objetivo: 'texto:title:0', x: '4', e_x: '9' }, free()]
    const desktop = resetPlace(canvas, 'texto:title:0', true)
    expect(desktop[0]).toEqual({ objetivo: 'texto:title:0', x: '4' })
    expect(resetPlace(desktop, 'texto:title:0', false)).toHaveLength(1)
    expect(resetPlace(canvas, 'lienzo-9', false)).toBe(canvas)
  })

  it('quita solo los elementos libres', () => {
    const canvas = [{ objetivo: 'imagen:0', x: '1' }, free(), free({ texto: 'Otro' })]
    const out = removeElements(canvas, ['lienzo-2', 'imagen:0'])
    expect(out).toHaveLength(2)
    expect(out[1].texto).toBe('Otro')
  })

  it('duplica un libre corrido y encima de los demás', () => {
    const canvas = [free({ capa: '3' }), free({ capa: '1' })]
    const out = duplicateElements(canvas, ['lienzo-2', 'texto:title:0'])
    expect(out.refs).toEqual(['lienzo-3'])
    expect(out.canvas[2]).toMatchObject({ x: '13', y: '23', capa: '4' })
  })

  it('agrega elementos nuevos arriba y respeta el máximo', () => {
    const a = addElement([free({ capa: '2' })], { kind: 'shape', shape: 'circle' })!
    expect(a.ref).toBe('lienzo-2')
    expect(a.canvas[1]).toMatchObject({ tipo: 'forma', forma: 'circulo', capa: '3' })
    expect(addElement([], { kind: 'image', file: 'foto.jpg' })!.canvas[0].imagen).toBe('foto.jpg')
    const full = Array.from({ length: 60 }, () => free())
    expect(addElement(full, { kind: 'text' })).toBeNull()
  })

  it('lista las capas de arriba hacia abajo y luego los bloques acomodados', () => {
    const canvas = [
      { objetivo: 'texto:title:0', x: '1' },
      free({ capa: '1', texto: 'Abajo' }),
      free({ capa: '2', texto: 'Arriba' }),
    ]
    expect(listLayers(canvas).map((l) => [l.ref, l.label])).toEqual([
      ['lienzo-3', 'Arriba'],
      ['lienzo-2', 'Abajo'],
      ['texto:title:0', 'Texto «title»'],
    ])
  })
})

describe('arrangeService: capas', () => {
  const stack = () => [free({ texto: 'A' }), free({ texto: 'B' }), free({ texto: 'C' })]
  const order = (canvas: DesignValues[]) =>
    listLayers(canvas)
      .reverse()
      .map((l) => l.label)
      .join('')

  it('al frente, atrás y un paso', () => {
    expect(order(restack(stack(), ['lienzo-1'], 'front'))).toBe('BCA')
    expect(order(restack(stack(), ['lienzo-3'], 'back'))).toBe('CAB')
    expect(order(restack(stack(), ['lienzo-1'], 'forward'))).toBe('BAC')
    expect(order(restack(stack(), ['lienzo-3'], 'backward'))).toBe('ACB')
    expect(order(restack(stack(), ['lienzo-3'], 'forward'))).toBe('ABC')
  })

  it('numera las capas 1, 2, 3 de abajo hacia arriba', () => {
    const out = restack(stack(), ['lienzo-1'], 'front')
    expect(out.map((r) => r.capa)).toEqual(['3', '1', '2'])
  })
})

describe('arrangeService: alinear y repartir', () => {
  const m = (x: number, y: number, width: number, height: number): ArrangeMeasure => ({
    x,
    y,
    width,
    height,
    w: width,
    h: height,
  })
  const measures = { a: m(10, 10, 20, 20), b: m(50, 30, 40, 10), c: m(120, 5, 20, 40) }

  it('alinea a la sección', () => {
    const area = { x: 0, y: 0, width: 200, height: 100 }
    expect(alignDeltas(['a', 'b'], measures, 'left', area)).toEqual({
      a: { dx: -10, dy: 0 },
      b: { dx: -50, dy: 0 },
    })
    expect(alignDeltas(['a'], measures, 'hcenter', area).a.dx).toBe(80)
    expect(alignDeltas(['b'], measures, 'right', area).b.dx).toBe(110)
    expect(alignDeltas(['a'], measures, 'vcenter', area).a.dy).toBe(30)
    expect(alignDeltas(['a'], measures, 'bottom', area).a.dy).toBe(70)
    expect(alignDeltas(['a'], measures, 'top', area).a.dy).toBe(-10)
  })

  it('alinea entre los elegidos con la caja que los envuelve', () => {
    const box = unionBox(['a', 'b', 'c'], measures)!
    expect(box).toEqual({ x: 10, y: 5, width: 130, height: 40 })
    expect(alignDeltas(['a', 'b', 'c'], measures, 'top', box).c.dy).toBe(0)
    expect(alignDeltas(['a', 'b', 'c'], measures, 'top', box).a.dy).toBe(-5)
  })

  it('reparte con el mismo espacio y deja quietos los extremos', () => {
    const out = distributeDeltas(['c', 'a', 'b'], measures, 'h')
    // espacio = (140 - 10 - 80) / 2 = 25
    expect(out.a.dx).toBe(0)
    expect(out.b.dx).toBe(5) // 10+20+25 = 55
    expect(out.c.dx).toBe(0)
    expect(distributeDeltas(['a', 'b'], measures, 'h')).toEqual({})
  })

  it('convierte los px en % del ancho del contenido al mover', () => {
    const out = moveBy([free()], { 'lienzo-1': { dx: 39, dy: -13 } }, 390, false)
    expect(out[0]).toMatchObject({ x: '20', y: '16.67' })
    expect(moveBy([free()], { 'lienzo-1': { dx: 5, dy: 0 } }, 0, false)[0].x).toBe('10')
  })
})

describe('arrangeService: del ratón a los valores', () => {
  const frame = { left: 100, top: 50, width: 400 }
  const box = { cx: 300, cy: 200, width: 100, height: 40, rotation: 0 }

  it('normaliza el giro entre -180 y 180', () => {
    expect(normalizeAngle(190)).toBe(-170)
    expect(normalizeAngle(-190)).toBe(170)
    expect(normalizeAngle(180)).toBe(180)
    expect(normalizeAngle(15)).toBe(15)
  })

  it('un bloque que ya existe se desplaza, gira y cambia de escala', () => {
    const start: GestureStart = { free: false, x: 2, y: 0, rotation: 0, scale: 1, scaleY: 1, box }
    const out = valuesFromBox(start, { ...box, cx: 340, cy: 180, width: 150, rotation: 30 }, frame)
    expect(out.x).toBeCloseTo(12) // 2 + 40/400*100
    expect(out.y).toBeCloseTo(-5)
    expect(out.scale).toBeCloseTo(1.5)
    expect(out.rotation).toBe(30)
    expect(out.width).toBeUndefined()
  })

  it('uno libre toma su esquina y su ancho, descontando su escala', () => {
    const start: GestureStart = { free: true, x: 0, y: 0, rotation: 0, scale: 2, scaleY: 2, box }
    const out = valuesFromBox(start, { cx: 300, cy: 200, width: 200, height: 80, rotation: 0 }, frame)
    // ancho de diseño = 200 / 2 = 100 px = 25 %; esquina = (300-50-100, 200-20-50) = (150,130) px
    expect(out.width).toBeCloseTo(25)
    expect(out.x).toBeCloseTo(37.5)
    expect(out.y).toBeCloseTo(32.5)
  })

  it('sin ancho medido no cambia nada', () => {
    const start: GestureStart = { free: false, x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, box }
    expect(valuesFromBox(start, box, { left: 0, top: 0, width: 0 })).toEqual({})
  })
})

describe('arrangeService: deformar, quitar y copiar bloques de la sección', () => {
  const frame = { left: 100, top: 50, width: 400 }
  const box = { cx: 300, cy: 200, width: 100, height: 40, rotation: 0 }

  it('un lado estira un solo eje y una esquina conserva la proporción', () => {
    const start: GestureStart = { free: false, x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, box }
    const side = valuesFromBox(start, { ...box, width: 150 }, frame)
    expect(side.scale).toBeCloseTo(1.5)
    expect(side.scale_y).toBeCloseTo(1)
    const corner = valuesFromBox(start, { ...box, width: 200, height: 80 }, frame)
    expect(corner.scale).toBeCloseTo(2)
    expect(corner.scale_y).toBeCloseTo(2)
  })

  it('una imagen agregada estirada guarda su alto; en proporción, no', () => {
    const start: GestureStart = { free: true, kind: 'image', x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, box }
    expect(valuesFromBox(start, { ...box, width: 200, height: 40 }, frame).height).toBeCloseTo(10)
    expect(valuesFromBox(start, { ...box, width: 200, height: 80 }, frame).height).toBeUndefined()
    expect(valuesFromBox({ ...start, sized: true }, { ...box, width: 200, height: 80 }, frame).height).toBeCloseTo(20)
  })

  it('un texto agregado: la esquina cambia letra y ancho; el alto lo da el texto', () => {
    const start: GestureStart = { free: true, kind: 'text', x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, size: 6, box }
    const out = valuesFromBox(start, { cx: 350, cy: 220, width: 200, height: 80, rotation: 0 }, frame, {
      direction: [1, 1],
      writeSize: true,
      textHeight: 70,
    })
    expect(out.size).toBeCloseTo(12)
    expect(out.width).toBeCloseTo(50)
    // La esquina de arriba a la izquierda no se movió: (300-50, 200-20) → (250, 180) px.
    expect(out.x).toBeCloseTo(((250 - 100) / 400) * 100)
    expect(out.y).toBeCloseTo(((180 - 50) / 400) * 100)
    // Un lado solo cambia el ancho; en escritorio, tampoco la letra.
    const side = valuesFromBox(start, { ...box, width: 200 }, frame, { direction: [1, 0], writeSize: true })
    expect(side.size).toBeUndefined()
    expect(valuesFromBox(start, { ...box, width: 200 }, frame, { direction: [1, 1], writeSize: false }).size).toBeUndefined()
  })

  it('al estirar hacia arriba el texto deja fija su esquina de abajo', () => {
    const out = anchorTextCenter(box, [-1, -1], 200, 50, 0)
    // La esquina de abajo a la derecha (350, 220) se queda: el centro baja/sube con el alto real.
    expect(out.cx + 100).toBeCloseTo(350)
    expect(out.cy + 25).toBeCloseTo(220)
    const rotated = anchorTextCenter({ ...box, rotation: 90 }, [1, 1], 100, 40, 90)
    expect(rotated.cx).toBeCloseTo(300)
    expect(rotated.cy).toBeCloseTo(200)
  })

  it('escala vertical igual a la horizontal se deja vacía; en escritorio se escribe tal cual', () => {
    const mobile = applyChanges([], [{ ref: 'imagen:0', values: { scale: 1.5, scale_y: 1.5 } }], false)
    expect(mobile[0].escala).toBe('1.5')
    expect(mobile[0].escala_y).toBeUndefined()
    const side = applyChanges(mobile, [{ ref: 'imagen:0', values: { scale: 1.5, scale_y: 0.8 } }], false)
    expect(side[0].escala_y).toBe('0.8')
    expect(elementValues(side, 'imagen:0', false)).toMatchObject({ scale: 1.5, scaleY: 0.8 })
    const desktop = applyChanges(side, [{ ref: 'imagen:0', values: { scale: 2, scale_y: 2 } }], true)
    expect(desktop[0].e_escala).toBe('2')
    expect(desktop[0].e_escala_y).toBe('2')
  })

  it('imagen y forma agregadas guardan alto en su columna y el texto, su tamaño', () => {
    const out = applyChanges([free({ tipo: 'imagen', imagen: 'a.webp' })], [{ ref: 'lienzo-1', values: { height: 12.5, size: 7 } }], false)
    expect(out[0].alto).toBe('12.5')
    expect(out[0].tamano).toBe('7')
    const desk = applyChanges(out, [{ ref: 'lienzo-1', values: { height: 20, size: 9 } }], true)
    expect(desk[0].e_alto).toBe('20')
    expect(desk[0].tamano).toBe('9')
  })

  it('eliminar un bloque escribe eliminado; en escritorio solo e_eliminado; restaurar lo limpia', () => {
    const gone = setRemoved([], 'texto:title:0', true, false)
    expect(gone).toEqual([{ objetivo: 'texto:title:0', eliminado: 'SI' }])
    expect(elementValues(gone, 'texto:title:0', true)?.removed).toBe(true)
    expect(setRemoved(gone, 'texto:title:0', false, false)).toEqual([])
    const desktopOnly = setRemoved([], 'texto:title:0', true, true)
    expect(desktopOnly).toEqual([{ objetivo: 'texto:title:0', e_eliminado: 'SI' }])
    expect(elementValues(desktopOnly, 'texto:title:0', false)?.removed).toBe(false)
    // Quitado en celular y devuelto en escritorio: el escritorio lo dice con NO.
    expect(setRemoved(gone, 'texto:title:0', false, true)[0].e_eliminado).toBe('NO')
    expect(setRemoved([free()], 'lienzo-1', true, false)).toEqual([free()])
    // «Volver a su lugar» también lo regresa.
    expect(resetPlace(gone, 'texto:title:0', false)).toEqual([])
  })

  it('las capas listan todos los bloques y restack los ordena junto con lo agregado', () => {
    const blocks = [
      { ref: 'texto:title:0', label: 'Título' },
      { ref: 'texto:time:0', label: '5 pm' },
      { ref: 'imagen:0', label: 'foto.webp' },
    ]
    const canvas = [free({ texto: 'Libre', capa: '1' })]
    const layers = listLayers(canvas, blocks)
    expect(layers.map((l) => l.ref)).toEqual(['lienzo-1', 'imagen:0', 'texto:time:0', 'texto:title:0'])
    expect(layers[2].label).toBe('«5 pm»')
    // El título al frente pasa por encima de lo agregado y los bloques de abajo no ganan filas.
    const front = restack(canvas, ['texto:title:0'], 'front', blocks)
    expect(listLayers(front, blocks).map((l) => l.ref)[0]).toBe('texto:title:0')
    expect(front.find((r) => r.objetivo === 'texto:time:0')).toBeUndefined()
    expect(front.find((r) => r.objetivo === 'texto:title:0')?.capa).toBe('2')
    // Al fondo: el título queda debajo de los demás bloques, que reciben capa para estar encima.
    const back = restack(canvas, ['imagen:0'], 'back', blocks)
    expect(listLayers(back, blocks).map((l) => l.ref).reverse()[0]).toBe('imagen:0')
    expect(Number(back.find((r) => r.objetivo === 'imagen:0')?.capa)).toBeLessThan(Number(back[0].capa))
    // Un paso atrás respeta el orden de los vecinos.
    const step = restack(front, ['texto:title:0'], 'backward', blocks)
    expect(listLayers(step, blocks).map((l) => l.ref)[0]).toBe('lienzo-1')
  })

  it('duplicar un texto o una imagen de la sección crea un elemento agregado fijo', () => {
    const ctx = {
      content: 400,
      desktop: false,
      measures: {
        'texto:title:0': { x: 40, y: 20, width: 120, height: 30, w: 120, h: 30 },
        'imagen:0': { x: 0, y: 100, width: 200, height: 100, w: 200, h: 100 },
      },
      copies: {
        'texto:title:0': { kind: 'text' as const, text: 'Nuestra boda', font: 'Great Vibes', size: 7, color: '#112233', align: 'center' as const },
        'imagen:0': { kind: 'image' as const, src: '/media/salon.webp', aspect: 1 },
      },
    }
    const base = [free({ capa: '4' })]
    const out = duplicateElements(base, ['texto:title:0', 'imagen:0'], ctx)
    expect(out.refs).toEqual(['lienzo-2', 'lienzo-3'])
    expect(out.canvas[1]).toMatchObject({
      tipo: 'texto',
      texto: 'Nuestra boda',
      letra: 'Great Vibes',
      tamano: '7',
      color: '#112233',
      alineacion: 'centro',
      x: '13',
      y: '8',
      capa: '5',
    })
    expect(out.canvas[1].ancho).toBe('31.2')
    expect(out.canvas[2]).toMatchObject({ tipo: 'imagen', imagen: '/media/salon.webp', ancho: '50', x: '3', y: '28', capa: '6' })
    expect(out.canvas[2].alto).toBe('25')
    // Sin lo leído de la vista previa no se puede copiar un bloque.
    expect(duplicateElements(base, ['texto:title:0']).refs).toEqual([])
    // Quitado: no se copia.
    expect(duplicateElements([{ objetivo: 'texto:title:0', eliminado: 'SI' }], ['texto:title:0'], ctx).refs).toEqual([])
  })
})
