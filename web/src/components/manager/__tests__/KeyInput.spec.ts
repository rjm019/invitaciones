import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KeyInput from '../KeyInput.vue'

// Como en la pantalla: quien lo usa guarda lo que emite (v-model).
function mountKey(props: Record<string, unknown> = {}) {
  const wrapper = mount(KeyInput, {
    props: {
      modelValue: '',
      id: 'clave',
      label: 'Clave',
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    global: { stubs: { ManagerIcon: true } },
  })
  return wrapper
}

describe('KeyInput', () => {
  it('no deja escribir espacios y avisa', async () => {
    const wrapper = mountKey()
    const input = wrapper.get('input')

    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
    input.element.dispatchEvent(space)
    expect(space.defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('no llevan espacios')

    // Una letra normal sí entra (y el aviso se va).
    await input.setValue('abc')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['abc'])
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('quita los espacios de lo que se pega, también el espacio duro', async () => {
    const wrapper = mountKey()
    const input = wrapper.get('input')

    await input.setValue(' abcd efgh jkmn ')
    expect((input.element as HTMLInputElement).value).toBe('abcdefghjkmn')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['abcdefghjkmn'])
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(input.attributes('aria-describedby')).toBe('clave-sin-espacios')
  })

  it('genera una clave sin espacios y la deja a la vista', async () => {
    const wrapper = mountKey({ generate: true })
    expect(wrapper.get('input').attributes('type')).toBe('password')

    await wrapper.get('button[aria-label="Generar una clave aleatoria"]').trigger('click')
    const [generated] = wrapper.emitted('update:modelValue')!.at(-1) as [string]
    expect(generated).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
    expect(wrapper.get('input').attributes('type')).toBe('text')

    // Sin "generate" no hay botón, pero quien la usa lo puede pedir.
    const plain = mountKey()
    expect(plain.find('button[aria-label="Generar una clave aleatoria"]').exists()).toBe(false)
    ;(plain.vm as unknown as { generate: () => void }).generate()
    expect(plain.emitted('update:modelValue')).toHaveLength(1)
  })

  it('empieza a la vista si se pide', () => {
    expect(mountKey({ visible: true }).get('input').attributes('type')).toBe('text')
  })
})
