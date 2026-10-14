import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useFontSamples } from '../useFontSamples'

describe('useFontSamples', () => {
  it('pone una hoja con las fuentes y las letras de la muestra, y la quita al salir', async () => {
    const families = ref(['Great Vibes'])
    const wrapper = mount(
      defineComponent({
        setup() {
          useFontSamples(
            () => families.value,
            () => 'Ana',
          )
          return () => null
        },
      }),
    )
    const link = () => document.head.querySelector<HTMLLinkElement>('link[id^="g-font-samples-"]')
    expect(link()?.href).toContain('family=Great+Vibes')
    expect(link()?.href).toContain('text=An')

    families.value = []
    await nextTick()
    expect(link()).toBeNull()

    families.value = ['Lora']
    await nextTick()
    expect(link()?.href).toContain('family=Lora')
    wrapper.unmount()
    expect(link()).toBeNull()
  })
})
