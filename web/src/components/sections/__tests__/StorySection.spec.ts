import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import StorySection from '../StorySection.vue'

const section = (extra: Partial<ResolvedSection> = {}): ResolvedSection =>
  ({
    type: 'story',
    effects: [],
    visible: true,
    id: 'historia',
    decor: {},
    panel: true,
    desktop: 'full',
    ...extra,
  }) as ResolvedSection

function render(s: ResolvedSection) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({}) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => (path ? `/m/${path}` : null)),
        })
        return () => h(StorySection, { section: s })
      },
    }),
  )
}

describe('StorySection', () => {
  it('muestra el mensaje de bienvenida y sus momentos en orden', () => {
    const wrapper = render(
      section({
        title: 'Nuestra historia',
        text: 'Bienvenidos',
        moments: [
          { year: '2019', title: 'Nos conocimos', text: 'En una boda', photo: 'a.webp' },
          { title: 'Nos comprometimos' },
        ],
      }),
    )
    expect(wrapper.find('[data-text="title"]').text()).toBe('Nuestra historia')
    expect(wrapper.find('[data-text="text"]').text()).toBe('Bienvenidos')
    const items = wrapper.findAll('.story__moment')
    expect(items.map((i) => i.find('[data-text="moment"]').text())).toEqual(['Nos conocimos', 'Nos comprometimos'])
    expect(items[0].find('[data-text="year"]').text()).toBe('2019')
    expect(items[0].find('img').attributes('src')).toBe('/m/a.webp')
    expect(items[0].find('img').attributes('alt')).toBe('Nos conocimos')
    expect(items[1].find('img').exists()).toBe(false)
    expect(items[1].find('[data-text="year"]').exists()).toBe(false)
  })

  it('sin momentos solo se ve el mensaje', () => {
    const wrapper = render(section({ text: 'Solo un mensaje' }))
    expect(wrapper.find('.story__moments').exists()).toBe(false)
    expect(wrapper.find('[data-text="text"]').text()).toBe('Solo un mensaje')
  })
})
