import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createInvitationContext, provideInvitationContext } from '@/composables/useInvitation'
import type { Invitation } from '@/types/invitation'
import DeadlineNotice from '../DeadlineNotice.vue'

function render(days?: number) {
  const context = createInvitationContext('tok')
  context.invitation.value = { deadline_days: days } as Invitation
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

  it('sin días no hay modal', () => {
    expect(render().find('dialog').exists()).toBe(false)
  })

  it('dice mañana y se cierra con OK', async () => {
    const wrapper = render(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').text()).toContain('mañana es la fecha límite para confirmar')
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    // Ya visto: al recargar ese mismo día no vuelve a saltar.
    const again = render(1)
    await again.vm.$nextTick()
    expect(again.find('dialog').attributes('open')).toBeUndefined()
  })
})
