import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ResolvedSection } from '@/types/event'
import LayerSection from '../LayerSection.vue'

function render(section: Record<string, unknown>) {
  return mount(LayerSection, {
    props: { section: { decor: {}, effects: [], ...section } as unknown as ResolvedSection },
  })
}

describe('LayerSection', () => {
  it('lleva la sombra si no se pide quitarla', () => {
    expect(render({}).find('.layer').classes()).not.toContain('layer--plain')
  })

  it('quita la sombra con `plain`', () => {
    expect(render({ plain: true }).find('.layer').classes()).toContain('layer--plain')
  })
})
