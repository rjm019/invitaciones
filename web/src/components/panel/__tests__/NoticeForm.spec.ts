import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/http'
import NoticeForm from '../NoticeForm.vue'

const DEFAULT = 'Recuerda que {cuando} es la fecha límite para confirmar tu asistencia'

function render(text: string, change = vi.fn().mockResolvedValue(undefined)) {
  return { change, wrapper: mount(NoticeForm, { props: { notice: { text, default: DEFAULT }, change } }) }
}

describe('NoticeForm', () => {
  it('muestra el ejemplo y guarda el texto nuevo', async () => {
    const { wrapper, change } = render(DEFAULT)
    expect(wrapper.find('.notice__preview').text()).toContain('Recuerda que mañana es la fecha')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Hola, {cuando} se cierra')
    expect(wrapper.find('.notice__preview').text()).toBe('Ejemplo: Hola, mañana se cierra')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(change).toHaveBeenCalledWith('Hola, {cuando} se cierra')
    expect(wrapper.text()).toContain('el aviso quedó guardado')
  })

  it('un texto propio se puede regresar al de siempre', async () => {
    const { wrapper, change } = render('Hola {cuando}')
    await wrapper.find('button[type="button"]').trigger('click')
    await flushPromises()
    expect(change).toHaveBeenCalledWith(null)
  })

  it('el de siempre no ofrece restaurar', () => {
    expect(render(DEFAULT).wrapper.find('button[type="button"]').exists()).toBe(false)
  })

  it('muestra el error del servidor', async () => {
    const error = new ApiError('No', 422, { text: ['Deja {cuando} en el texto'] })
    const { wrapper } = render(DEFAULT, vi.fn().mockRejectedValue(error))
    await wrapper.find('textarea').setValue('Sin la palabra')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.p-error').text()).toBe('Deja {cuando} en el texto')
  })
})
