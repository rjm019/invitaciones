import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useArrange } from '../useArrange'
import {
  canUndo,
  createHistory,
  record,
  undo,
  type History,
} from '@/services/designHistoryService'
import type { Design } from '@/types/design'

const base = (): Design => ({
  event: {},
  colors: {},
  fonts: {},
  texts: {},
  page: {},
  sections: [
    {
      id: 'fecha',
      fields: {},
      items: [],
      canvas: [{ tipo: 'texto', texto: 'Hola', x: '10', y: '20', ancho: '40' }],
    },
  ],
})

/** El editor en miniatura: el historial de verdad (deshacer y juntar pasos) con un reloj a mano. */
function setup(desktop = false) {
  const history = ref<History<Design>>(createHistory(base()))
  let now = 1000
  const deps = {
    design: computed(() => history.value.present),
    update: vi.fn((next: Design, key: string | null = null) => {
      history.value = record(history.value, next, key, now)
    }),
    desktop: ref(desktop),
    sendSelect: vi.fn(),
    pickMedia: vi.fn(),
    notify: vi.fn(),
    undo: vi.fn(() => (history.value = undo(history.value))),
    redo: vi.fn(),
    save: vi.fn(),
  }
  const arrange = useArrange({ ...deps, desktop: computed(() => deps.desktop.value) })
  return {
    arrange,
    deps,
    history,
    tick: (ms: number) => (now += ms),
    canvas: () => history.value.present.sections[0].canvas!,
  }
}

describe('useArrange', () => {
  it('un arrastre suelto es un solo paso de deshacer', () => {
    const t = setup()
    t.arrange.onChange(
      'fecha',
      [{ ref: 'texto:title:0', values: { x: 5, y: 6, rotation: 15, scale: 1.2 } }],
      false,
    )
    expect(t.canvas()).toHaveLength(2)
    expect(t.canvas()[1]).toEqual({
      objetivo: 'texto:title:0',
      x: '5',
      y: '6',
      rotacion: '15',
      escala: '1.2',
    })
    expect(t.history.value.past).toHaveLength(1)
    // Otro arrastre enseguida no se junta con el anterior.
    t.arrange.onChange('fecha', [{ ref: 'texto:title:0', values: { x: 9 } }], false)
    expect(t.history.value.past).toHaveLength(2)
    t.deps.undo()
    expect(t.canvas()[1].x).toBe('5')
    t.deps.undo()
    expect(t.canvas()).toHaveLength(1)
    expect(canUndo(t.history.value)).toBe(false)
  })

  it('las flechas seguidas se juntan en un paso', () => {
    const t = setup()
    t.arrange.onChange('fecha', [{ ref: 'lienzo-1', values: { x: 11 } }], true)
    t.tick(100)
    t.arrange.onChange('fecha', [{ ref: 'lienzo-1', values: { x: 12 } }], true)
    expect(t.history.value.past).toHaveLength(1)
    expect(t.canvas()[0].x).toBe('12')
  })

  it('en computadora escribe las columnas e_', () => {
    const t = setup(true)
    t.arrange.onChange('fecha', [{ ref: 'lienzo-1', values: { x: 30 } }], false)
    expect(t.canvas()[0]).toMatchObject({ x: '10', e_x: '30' })
  })

  it('agrega, duplica y elimina elementos libres, cada uno en un paso', async () => {
    const t = setup()
    t.arrange.chooseSection('fecha')
    expect(t.deps.sendSelect).toHaveBeenLastCalledWith('fecha', [])
    await t.arrange.add('circle')
    expect(t.canvas()[1]).toMatchObject({ tipo: 'forma', forma: 'circulo' })
    expect(t.arrange.refs.value).toEqual(['lienzo-2'])
    t.arrange.duplicate()
    expect(t.canvas()).toHaveLength(3)
    expect(t.arrange.refs.value).toEqual(['lienzo-3'])
    t.arrange.remove()
    expect(t.canvas()).toHaveLength(2)
    expect(t.history.value.past).toHaveLength(3)
  })

  it('la imagen se elige de la biblioteca y, si se cancela, no agrega nada', async () => {
    const t = setup()
    t.arrange.chooseSection('fecha')
    t.deps.pickMedia.mockResolvedValueOnce(null)
    await t.arrange.add('image')
    expect(t.canvas()).toHaveLength(1)
    t.deps.pickMedia.mockResolvedValueOnce('foto.jpg')
    await t.arrange.add('image')
    expect(t.canvas()[1]).toMatchObject({ tipo: 'imagen', imagen: 'foto.jpg' })
  })

  it('alinea con las medidas que manda la vista previa', () => {
    const t = setup()
    t.arrange.chooseSection('fecha')
    t.arrange.onSelect(
      'fecha',
      ['lienzo-1'],
      { 'lienzo-1': { x: 39, y: 78, width: 156, height: 20, w: 156, h: 20 } },
      { content: 390, section: { x: 0, y: 0, width: 390, height: 600 } },
    )
    t.arrange.align('hcenter', 'section')
    // centro de la sección = 195; el elemento está en 39 + 78 = 117: +78 px = 20 %
    expect(t.canvas()[0].x).toBe('30')
  })

  it('no mueve lo bloqueado y avisa que lo que ya existía no se borra', () => {
    const t = setup()
    t.arrange.chooseSection('fecha')
    t.arrange.onChange('fecha', [{ ref: 'texto:title:0', values: { x: 1 } }], false)
    t.arrange.choose(['texto:title:0'])
    t.arrange.remove()
    expect(t.deps.notify).toHaveBeenCalled()
    expect(t.canvas()).toHaveLength(2)
    t.arrange.toggle('locked')
    expect(t.canvas()[1].bloqueado).toBe('SI')
    t.arrange.onSelect(
      'fecha',
      ['texto:title:0'],
      { 'texto:title:0': { x: 0, y: 0, width: 50, height: 10, w: 50, h: 10 } },
      { content: 390, section: { x: 0, y: 0, width: 390, height: 600 } },
    )
    t.arrange.align('right', 'section')
    expect(t.canvas()[1].x).toBe('1')
  })

  it('reenvía las teclas: ⌘Z, ⇧⌘Z, ⌘D y Supr', () => {
    const t = setup()
    t.arrange.chooseSection('fecha')
    t.arrange.choose(['lienzo-1'])
    t.arrange.onKey('z', true, false)
    expect(t.deps.undo).toHaveBeenCalled()
    t.arrange.onKey('z', true, true)
    expect(t.deps.redo).toHaveBeenCalledTimes(1)
    t.arrange.onKey('d', true, false)
    expect(t.canvas()).toHaveLength(2)
    t.arrange.onKey('Delete', false, false)
    expect(t.canvas()).toHaveLength(1)
    t.arrange.onKey('s', true, false)
    expect(t.deps.save).toHaveBeenCalled()
  })
})
