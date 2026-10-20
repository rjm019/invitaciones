import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManagerSettings } from '@/types/design'

// El panel se prueba aislado: lo que comparte con el editor va en mocks.
const session = vi.hoisted(() => ({ admin: false }))
vi.mock('@/composables/useEditorContext', async () => {
  const { ref } = await import('vue')
  return {
    useEditor: () => ({
      slug: 'xv-ana',
      catalog: ref({ event_groups: [{ label: 'Confirmaciones', fields: [] }] }),
      design: ref({ event: {} }),
      issues: ref([]),
      setBlock: vi.fn(),
    }),
  }
})
vi.mock('@/composables/useManagerSession', async () => {
  const { ref } = await import('vue')
  return { useManagerSession: () => ({ isAdmin: ref(session.admin) }) }
})
vi.mock('@/composables/useManagerPeople', async () => {
  const { ref } = await import('vue')
  return { useManagerPeople: () => ({ people: ref([]), load: vi.fn().mockResolvedValue([]) }) }
})
vi.mock('@/composables/useToasts', () => ({ useToasts: () => ({ toast: vi.fn() }) }))
vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({ copy: vi.fn().mockResolvedValue(true) }),
}))

import GeneralPanel from '../GeneralPanel.vue'

const settings = (over: Partial<ManagerSettings> = {}): ManagerSettings => ({
  published: true,
  template: false,
  panel_password: 'clave-vieja-2026',
  owner_deadline: null,
  deadline_changes: 0,
  people: [],
  ...over,
})

const mountPanel = (over: Partial<ManagerSettings> = {}) =>
  mount(GeneralPanel, {
    props: { settings: settings(over) },
    global: {
      stubs: {
        FieldInput: true,
        ManagerIcon: true,
        SharePreview: true,
      },
    },
  })

const button = (wrapper: ReturnType<typeof mountPanel>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

describe('GeneralPanel · clave del panel', () => {
  it('deja escribir una clave propia y la manda al guardar', async () => {
    const wrapper = mountPanel()

    const cambiar = wrapper.findAll('button').find((b) => b.text().includes('Cambiar clave'))!
    await cambiar.trigger('click')
    expect(wrapper.find('#panel-password').exists()).toBe(true)

    await wrapper.get('#panel-password').setValue('otra-clave-2026')
    const guardar = wrapper.findAll('button').find((b) => b.text().includes('Guardar clave'))!
    await guardar.trigger('click')

    expect(wrapper.emitted('settings')).toEqual([[{ panel_password: 'otra-clave-2026' }]])
  })

  it('no guarda una clave que no cumple y explica qué corregir', async () => {
    const wrapper = mountPanel()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cambiar clave'))!
      .trigger('click')

    await wrapper.get('#panel-password').setValue('corta')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Guardar clave'))!
      .trigger('click')

    expect(wrapper.emitted('settings')).toBeUndefined()
    expect(wrapper.get('.g-error').text()).toContain('8 caracteres')
    expect(wrapper.get('#panel-password').attributes('aria-invalid')).toBe('true')
  })

  it('genera una clave aleatoria, la puede cancelar y cierra al confirmarla el servidor', async () => {
    const wrapper = mountPanel({ panel_password: null })
    expect(wrapper.text()).toContain('Sin clave nadie puede entrar al panel')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Crear clave'))!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Generar aleatoria'))!
      .trigger('click')
    const generated = (wrapper.get('#panel-password').element as HTMLInputElement).value
    expect(generated).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')
    expect(wrapper.find('#panel-password').exists()).toBe(false)
    expect(wrapper.emitted('settings')).toBeUndefined()

    // Al volver a editar, guardar y recibir la clave nueva del servidor, se cierra solo.
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Crear clave'))!
      .trigger('click')
    await wrapper.get('#panel-password').setValue('clave-nueva-2026')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Guardar clave'))!
      .trigger('click')
    expect(wrapper.emitted('settings')).toEqual([[{ panel_password: 'clave-nueva-2026' }]])

    await wrapper.setProps({ settings: settings({ panel_password: 'clave-nueva-2026' }) })
    await flushPromises()
    expect(wrapper.find('#panel-password').exists()).toBe(false)
    expect(wrapper.text()).toContain('Cambiar clave')
  })

  it('no deja espacios en la clave que se escribe', async () => {
    const wrapper = mountPanel()
    await button(wrapper, 'Cambiar clave').trigger('click')

    await wrapper.get('#panel-password').setValue('clave con espacios')
    expect((wrapper.get('#panel-password').element as HTMLInputElement).value).toBe(
      'claveconespacios',
    )
    await button(wrapper, 'Guardar clave').trigger('click')
    expect(wrapper.emitted('settings')).toEqual([[{ panel_password: 'claveconespacios' }]])
  })

  it('quita la clave (el panel se apaga) solo después de confirmarlo', async () => {
    const wrapper = mountPanel()
    await button(wrapper, 'Quitar clave').trigger('click')
    expect(wrapper.text()).toContain('Sin clave nadie entra al panel')
    expect(wrapper.emitted('settings')).toBeUndefined()

    await button(wrapper, 'Cancelar').trigger('click')
    expect(wrapper.text()).not.toContain('Sin clave nadie entra al panel')

    await button(wrapper, 'Quitar clave').trigger('click')
    await button(wrapper, 'Sí, quitar la clave').trigger('click')
    expect(wrapper.emitted('settings')).toEqual([[{ panel_password: null }]])

    // Sin clave no hay qué quitar ni panel que abrir.
    await wrapper.setProps({ settings: settings({ panel_password: null }) })
    expect(wrapper.text()).not.toContain('Quitar clave')
    expect(wrapper.text()).not.toContain('Abrir su panel')
    expect(wrapper.text()).toContain('Crear clave')
  })
})

describe('GeneralPanel · lo que el cliente movió en su panel', () => {
  afterEach(() => {
    session.admin = false
  })

  it('quien administra le devuelve sus cambios y le quita su fecha', async () => {
    session.admin = true
    const wrapper = mountPanel({ owner_deadline: '2026-11-20', deadline_changes: 3 })
    expect(wrapper.text()).toContain('2026-11-20')

    const select = wrapper.get<HTMLSelectElement>('#deadline-changes')
    expect(select.element.value).toBe('3')
    await select.setValue('0')
    await button(wrapper, 'Quitar su fecha').trigger('click')

    expect(wrapper.emitted('settings')).toEqual([
      [{ deadline_changes: 0 }],
      [{ owner_deadline: null }],
    ])
  })

  it('quien edita solo lo ve', () => {
    const wrapper = mountPanel({ owner_deadline: '2026-11-20', deadline_changes: 1 })
    expect(wrapper.text()).toContain('2026-11-20')
    expect(wrapper.find('#deadline-changes').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Quitar su fecha')
  })
})
