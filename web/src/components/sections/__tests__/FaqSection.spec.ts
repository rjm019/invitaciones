import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ResolvedSection } from '@/types/event'
import FaqSection from '../FaqSection.vue'

const section = (extra: Partial<ResolvedSection> = {}): ResolvedSection =>
  ({
    type: 'faq',
    effects: [],
    visible: true,
    id: 'informacion',
    decor: {},
    panel: true,
    desktop: 'full',
    items: [
      { question: '¿Hay estacionamiento?', answer: 'Sí, gratuito.' },
      { question: '¿Puedo llevar niños?', answer: 'Solo adultos.' },
    ],
    ...extra,
  }) as ResolvedSection

describe('FaqSection', () => {
  it('cada pregunta es un botón cerrado, ligado a su respuesta', () => {
    const wrapper = mount(FaqSection, { props: { section: section() }, attachTo: document.body })
    const buttons = wrapper.findAll('button.faq__trigger')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.attributes('aria-expanded')).toBe('false')
      const panel = wrapper.find(`#${button.attributes('aria-controls')}`)
      expect(panel.attributes('role')).toBe('region')
      expect(panel.attributes('aria-labelledby')).toBe(button.attributes('id'))
      expect(panel.isVisible()).toBe(false)
    }
    wrapper.unmount()
  })

  it('al tocar abre y cierra su respuesta (aria-expanded) y se pueden abrir varias', async () => {
    const wrapper = mount(FaqSection, { props: { section: section() }, attachTo: document.body })
    const [first, second] = wrapper.findAll('button.faq__trigger')
    await first.trigger('click')
    await second.trigger('click')
    expect(first.attributes('aria-expanded')).toBe('true')
    expect(second.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find(`#${first.attributes('aria-controls')}`).isVisible()).toBe(true)
    await first.trigger('click')
    expect(first.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('las flechas, Inicio y Fin mueven el foco entre preguntas', async () => {
    const wrapper = mount(FaqSection, { props: { section: section() }, attachTo: document.body })
    const [first, second] = wrapper.findAll('button.faq__trigger')
    ;(first.element as HTMLButtonElement).focus()
    await first.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second.element)
    await second.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(first.element)
    await first.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(second.element)
    await second.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(first.element)
    wrapper.unmount()
  })

  it('usa el título del layout o uno por defecto', () => {
    expect(mount(FaqSection, { props: { section: section({ title: 'Dudas' }) } }).find('h2').text()).toBe('Dudas')
    expect(mount(FaqSection, { props: { section: section() } }).find('h2').text()).toBe('Información adicional')
  })
})
