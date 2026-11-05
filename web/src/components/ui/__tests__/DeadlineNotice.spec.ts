import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createInvitationContext, provideInvitationContext } from '@/composables/useInvitation'
import type { Invitation } from '@/types/invitation'
import DeadlineNotice from '../DeadlineNotice.vue'

const TEXT = 'Recuerda que mañana es la fecha límite para confirmar tu asistencia'

function render(notice?: string) {
  const context = createInvitationContext('tok')
  context.invitation.value = { deadline_days: 1, deadline_notice: notice } as Invitation
  return mount(
    defineComponent({
      setup() {
        provideInvitationContext(context)
        return () => h(DeadlineNotice)
      },
    }),
  )
}

describe('DeadlineNotice', () => {
  beforeEach(() => {
    localStorage.clear()
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  })

  it('sin aviso no hay modal', () => {
    expect(render().find('dialog').exists()).toBe(false)
  })

  it('muestra el aviso del servidor y se cierra con OK', async () => {
    const wrapper = render(TEXT)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').text()).toContain(TEXT)
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    // Ya visto: al recargar ese mismo día no vuelve a saltar.
    const again = render(TEXT)
    await again.vm.$nextTick()
    expect(again.find('dialog').attributes('open')).toBeUndefined()
  })
})
