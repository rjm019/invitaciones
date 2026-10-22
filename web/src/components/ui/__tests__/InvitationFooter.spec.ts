import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig } from '@/types/event'
import InvitationFooter from '../InvitationFooter.vue'

function render() {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({}) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        return () => h(InvitationFooter)
      },
    }),
  )
}

describe('InvitationFooter', () => {
  it('firma con la leyenda de Jiro Invitaciones', () => {
    expect(render().find('.invitation-footer__brand').text()).toBe('Jiro Invitaciones')
  })

  it('enlaza TikTok, Instagram y Facebook en pestaña nueva y con su icono', () => {
    const links = render().findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      'https://www.tiktok.com/@invitaciones.jiro',
      'https://www.instagram.com/jiroinvitaciones',
      'https://www.facebook.com/share/1EvV3XfZjc/',
    ])
    for (const link of links) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
      expect(link.attributes('aria-label')).toContain('Jiro Invitaciones')
      expect(link.find('svg').exists()).toBe(true)
    }
  })
})
