import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManagerUser } from '@/types/design'

const beto: ManagerUser = {
  username: 'beto',
  name: 'Beto Gómez',
  role: 'editor',
  active: true,
  must_change_password: false,
  created_at: null,
  last_login_at: null,
}

const api = vi.hoisted(() => ({ updateUser: vi.fn() }))
vi.mock('@/services/managerService', () => ({ updateUser: api.updateUser, createUser: vi.fn() }))
vi.mock('@/composables/useManagerSession', async () => {
  const { ref } = await import('vue')
  return {
    useManagerSession: () => ({
      withSession: (task: (token: string) => unknown) => task('token'),
      user: ref({ username: 'ana' }),
    }),
  }
})
vi.mock('@/composables/useManagerPeople', async () => {
  const { ref } = await import('vue')
  const people = ref<ManagerUser[]>([])
  return {
    useManagerPeople: () => ({
      people,
      load: vi.fn(async () => {
        people.value = [{ ...beto }]
      }),
      put: vi.fn(),
    }),
  }
})
vi.mock('@/composables/useToasts', () => ({ useToasts: () => ({ toast: vi.fn() }) }))
vi.mock('@/composables/useClipboard', async () => {
  const { ref } = await import('vue')
  return { useClipboard: () => ({ copy: vi.fn(), copied: ref(null) }) }
})

import PeopleDialog from '../PeopleDialog.vue'

async function openDialog() {
  const wrapper = mount(PeopleDialog, {
    props: { open: false },
    global: { stubs: { GDialog: { template: '<div><slot /></div>' }, ManagerIcon: true } },
  })
  await wrapper.setProps({ open: true })
  await flushPromises()
  await wrapper.get('button[aria-label="Ponerle otra clave a Beto Gómez"]').trigger('click')
  return wrapper
}

describe('PeopleDialog · ponerle clave a otra persona', () => {
  beforeEach(() => {
    api.updateUser.mockReset()
  })

  it('llega una clave generada y a la vista; se guarda como temporal', async () => {
    api.updateUser.mockImplementation(async (_t, _u, changes) => ({
      user: { ...beto, must_change_password: true },
      password: changes.password,
    }))
    const wrapper = await openDialog()

    const input = wrapper.get<HTMLInputElement>('#key-beto')
    expect(input.element.value).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
    expect(input.attributes('type')).toBe('text')

    await wrapper.get('form.people__key').trigger('submit')
    await flushPromises()
    expect(api.updateUser).toHaveBeenCalledWith('token', 'beto', {
      password: input.element.value,
      temporary: true,
    })
    expect(wrapper.text()).toContain(`Clave temporal: ${input.element.value}`)
    expect(wrapper.find('#key-beto').exists()).toBe(false)
  })

  it('quien administra escribe la suya, sin espacios, y puede dejarla fija', async () => {
    api.updateUser.mockImplementation(async (_t, _u, changes) => ({
      user: { ...beto, must_change_password: false },
      password: changes.password,
    }))
    const wrapper = await openDialog()

    await wrapper.get('#key-beto').setValue('corta')
    await wrapper.get('form.people__key').trigger('submit')
    expect(api.updateUser).not.toHaveBeenCalled()
    expect(wrapper.get('.g-error').text()).toContain('10 caracteres')

    await wrapper.get('#key-beto').setValue('la de beto 2026')
    expect(wrapper.get<HTMLInputElement>('#key-beto').element.value).toBe('ladebeto2026')
    await wrapper.get('input[type="checkbox"]').setValue(false)
    await wrapper.get('form.people__key').trigger('submit')
    await flushPromises()

    expect(api.updateUser).toHaveBeenCalledWith('token', 'beto', {
      password: 'ladebeto2026',
      temporary: false,
    })
    expect(wrapper.text()).toContain('Clave: ladebeto2026')
    expect(wrapper.text()).not.toContain('Clave temporal')
  })
})
