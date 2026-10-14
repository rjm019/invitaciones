import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { usePanelTheme } from '../usePanelTheme'
import type { PanelBrand } from '@/types/panel'

afterEach(() => {
  delete document.documentElement.dataset.theme
  document.getElementById('theme-fonts')?.remove()
})

describe('usePanelTheme', () => {
  it('pone el tema, los colores y las letras de la invitación, y los quita al salir', async () => {
    const brand = ref<PanelBrand | null>(null)
    let api!: ReturnType<typeof usePanelTheme>
    const wrapper = mount(
      defineComponent({ setup: () => ((api = usePanelTheme(brand)), () => null) }),
    )

    brand.value = {
      title: 'XV de Nat',
      theme: 'jardin-azul',
      palette: { 'accent-strong': '#123456' },
      fonts: {},
    }
    const root = document.documentElement
    // El tema llega con un import dinámico (manifiesto y CSS).
    await vi.waitFor(() => expect(api.theme.value?.id).toBe('jardin-azul'), { timeout: 5000 })
    expect(root.dataset.theme).toBe('jardin-azul')
    expect(root.style.getPropertyValue('--color-accent-strong')).toBe('#123456')
    expect(api.theme.value?.id).toBe('jardin-azul')
    expect(api.fonts.value?.script?.family).toBe('Pinyon Script')
    expect(document.getElementById('theme-fonts')).not.toBeNull()

    wrapper.unmount()
    expect(root.dataset.theme).toBeUndefined()
    expect(root.style.getPropertyValue('--color-accent-strong')).toBe('')
  })
})
