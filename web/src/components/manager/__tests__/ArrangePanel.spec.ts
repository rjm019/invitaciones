import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/design'

// El panel se prueba con el «Acomodar» de verdad (useArrange) y un editor mínimo.
const ctx = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('@/composables/useEditorContext', () => ({ useEditor: () => ctx.value }))

import ArrangePanel from '../ArrangePanel.vue'
import { useArrange } from '@/composables/useArrange'

const design = (): Design => ({
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
      canvas: [
        { tipo: 'texto', texto: 'Abajo', x: '10', y: '20', ancho: '40', capa: '1' },
        { tipo: 'forma', forma: 'circulo', x: '30', y: '5', ancho: '20', capa: '2' },
        { objetivo: 'texto:title:0', x: '2' },
      ],
    },
  ],
})

function mountPanel(desktop = false) {
  const current = ref(design())
  const arrange = useArrange({
    design: computed(() => current.value),
    update: (next) => (current.value = next),
    desktop: computed(() => desktop),
    sendSelect: vi.fn(),
    pickMedia: vi.fn(),
    notify: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
  })
  ctx.value = {
    arrange,
    catalog: ref({ sections: [{ id: 'fecha', label: 'Fecha' }], texts: [] }),
    design: current,
    themeFonts: ref({}),
  }
  const wrapper = mount(ArrangePanel, {
    global: {
      stubs: { ManagerIcon: true, ColorField: true, FontPicker: true, GPopover: true },
    },
  })
  return { wrapper, arrange, current }
}

const measures = {
  'lienzo-1': { x: 39, y: 78, width: 156, height: 20, w: 156, h: 20 },
  'lienzo-2': { x: 117, y: 20, width: 78, height: 78, w: 78, h: 78 },
  'texto:title:0': { x: 5, y: 5, width: 200, height: 30, w: 200, h: 30 },
}
const frame = { content: 390, section: { x: 0, y: 0, width: 390, height: 600 } }
const button = (w: ReturnType<typeof mountPanel>['wrapper'], text: string) =>
  w.findAll('button').find((b) => b.text().includes(text))!

describe('ArrangePanel', () => {
  it('sin sección pide tocar una en la vista previa', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.text()).toContain('Toca una sección')
    expect(wrapper.find('.arr__layers').exists()).toBe(false)
  })

  it('avisa qué pantalla se edita', () => {
    expect(mountPanel(false).wrapper.text()).toContain('Editando celular')
    const desktop = mountPanel(true).wrapper
    expect(desktop.text()).toContain('Editando escritorio')
    expect(desktop.find('.arr__device').classes()).toContain('g-note--warn')
  })

  it('lista las capas de arriba hacia abajo y elegir una la manda a la vista previa', async () => {
    const { wrapper, arrange } = mountPanel()
    arrange.onSelect('fecha', [], {}, frame)
    await wrapper.vm.$nextTick()
    const names = wrapper.findAll('.arr__layer-name').map((n) => n.text())
    expect(names).toEqual(['Círculo', 'Abajo', 'Texto «title»'])
    await wrapper.findAll('.arr__layer')[1].trigger('click')
    expect(arrange.refs.value).toEqual(['lienzo-1'])
  })

  it('con un elemento elegido muestra sus medidas y X o Y las cambian', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['lienzo-1'], measures, frame)
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.arr__grid input')
    expect(inputs.map((i) => (i.element as HTMLInputElement).value)).toEqual([
      '10',
      '20',
      '40',
      '5.1',
      '0',
    ])
    await inputs[0].setValue('25')
    await inputs[0].trigger('change')
    expect(current.value.sections[0].canvas![0].x).toBe('25')
    await inputs[4].setValue('30')
    await inputs[4].trigger('change')
    expect(current.value.sections[0].canvas![0].rotacion).toBe('30')
  })

  it('el orden de capas, duplicar y eliminar valen también en un bloque que ya existía', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['texto:title:0'], measures, frame)
    await wrapper.vm.$nextTick()
    expect(button(wrapper, 'Al frente').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, 'Eliminar').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, 'Duplicar').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('copia fija')
    arrange.onSelect('fecha', ['lienzo-1'], measures, frame)
    await wrapper.vm.$nextTick()
    await button(wrapper, 'Al frente').trigger('click')
    expect(current.value.sections[0].canvas!.map((r) => r.capa)).toEqual(['2', '1', undefined])
  })

  it('bloquear apaga los campos y el borrar quita solo lo agregado', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['lienzo-2'], measures, frame)
    await wrapper.vm.$nextTick()
    await button(wrapper, 'Bloquear').trigger('click')
    expect(current.value.sections[0].canvas![1].bloqueado).toBe('SI')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.arr__grid input').attributes('disabled')).toBeDefined()
    await button(wrapper, 'Desbloquear').trigger('click')
    await button(wrapper, 'Eliminar').trigger('click')
    expect(current.value.sections[0].canvas).toHaveLength(2)
  })

  it('«Volver a su lugar» quita lo movido de un bloque que ya existía', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['texto:title:0'], measures, frame)
    await wrapper.vm.$nextTick()
    await button(wrapper, 'Volver a su lugar').trigger('click')
    expect(current.value.sections[0].canvas).toHaveLength(2)
  })

  it('alinea a la sección y reparte solo con tres o más', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['lienzo-1', 'lienzo-2'], measures, frame)
    await wrapper.vm.$nextTick()
    expect(button(wrapper, 'Repartir a lo ancho').attributes('disabled')).toBeDefined()
    await wrapper.find('[aria-label="Alinear a la izquierda"]').trigger('click')
    // lienzo-1 estaba en 39 px (10 %): a la orilla = -39 px = -10 %
    expect(current.value.sections[0].canvas![0].x).toBe('0')
    expect(current.value.sections[0].canvas![1].x).toBe('0')
  })

  it('en un texto agregado se edita su texto y su alineación', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['lienzo-1'], measures, frame)
    await wrapper.vm.$nextTick()
    await wrapper.find('textarea').setValue('Nuevo texto')
    expect(current.value.sections[0].canvas![0].texto).toBe('Nuevo texto')
    await button(wrapper, 'Derecha').trigger('click')
    expect(current.value.sections[0].canvas![0].alineacion).toBe('derecha')
  })

  it('la lista trae todos los bloques; uno eliminado sale tachado y Restaurar lo devuelve', async () => {
    const { wrapper, arrange, current } = mountPanel()
    arrange.onSelect('fecha', ['texto:title:0'], measures, frame, [
      { ref: 'texto:title:0', label: 'Título' },
      { ref: 'texto:time:0', label: '5 pm' },
    ], {})
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.arr__layer-name').map((n) => n.text())).toEqual([
      'Círculo',
      'Abajo',
      '«5 pm»',
      '«Título»',
    ])
    await button(wrapper, 'Eliminar').trigger('click')
    expect(current.value.sections[0].canvas![2].eliminado).toBe('SI')
    await wrapper.vm.$nextTick()
    const removed = wrapper.find('.arr__layer.is-removed')
    expect(removed.text()).toContain('Título')
    await button(wrapper, 'Restaurar').trigger('click')
    expect(current.value.sections[0].canvas![2].eliminado).toBeUndefined()
    expect(wrapper.find('.arr__layer.is-removed').exists()).toBe(false)
  })

  it('el candado de proporción cambia lo que hacen Ancho y Alto y el Alto se apaga en un texto agregado', async () => {
    const { wrapper, arrange } = mountPanel()
    arrange.onSelect('fecha', ['lienzo-1'], measures, frame, [], {})
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.arr__grid input')
    expect(inputs[3].attributes('disabled')).toBeDefined() // Alto de un texto agregado
    const lock = wrapper.find('.arr__lock input')
    expect((lock.element as HTMLInputElement).checked).toBe(true)
    await lock.setValue(false)
    expect(arrange.proportional.value).toBe(false)
    arrange.onSelect('fecha', ['lienzo-2'], measures, frame, [], {})
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.arr__grid input')[3].attributes('disabled')).toBeUndefined()
  })
})
