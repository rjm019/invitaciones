import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FxText from '../FxText.vue'
import WaxSeal from '../WaxSeal.vue'

function reduceMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    addEventListener() {},
    removeEventListener() {},
  }))
}

describe('FxText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sin efecto de texto, es el texto tal cual', () => {
    reduceMotion(false)
    const wrapper = mount(FxText, { props: { text: 'Nuestra canción', effects: ['reveal'] } })
    expect(wrapper.text()).toBe('Nuestra canción')
    expect(wrapper.find('.fxt__ch').exists()).toBe(false)
  })

  it('máquina de escribir: letras ocultas al lector y el texto completo para él, con su paso', () => {
    reduceMotion(false)
    const wrapper = mount(FxText, {
      props: { text: 'Con todo', effects: ['typewriter-title'], active: false },
    })
    expect(wrapper.classes()).toContain('fxt--typewriter-title')
    expect(wrapper.attributes('data-play')).toBe('wait')
    expect(wrapper.find('.fxt__read').text()).toBe('Con todo')
    const letters = wrapper.findAll('.fxt__ch')
    expect(letters.map((l) => l.text()).join('')).toBe('Contodo')
    expect(letters[2]!.attributes('style')).toContain('--i: 2')
    expect(wrapper.findAll('.fxt__word').every((w) => w.attributes('aria-hidden') === 'true')).toBe(true)
    expect(letters.at(-1)!.classes()).toContain('fxt__ch--last')
  })

  it('caligrafía y pan de oro dejan el texto real; con "menos movimiento" no hay efecto', async () => {
    reduceMotion(false)
    const pen = mount(FxText, { props: { text: '&', effects: ['calligraphy'], active: true } })
    expect(pen.find('.fxt__ink').text()).toBe('&')
    expect(pen.attributes('data-play')).toBe('go')
    const gold = mount(FxText, { props: { text: 'Los esperamos', effects: ['gold-leaf'] } })
    expect(gold.find('.fxt__gleam').attributes('aria-hidden')).toBe('true')
    expect(gold.attributes('data-play')).toBeUndefined()

    reduceMotion(true)
    const calm = mount(FxText, { props: { text: 'Con todo', effects: ['stamp'] } })
    expect(calm.text()).toBe('Con todo')
    expect(calm.find('.fxt__ch').exists()).toBe(false)
  })

  it('el "&" solo toma la caligrafía aunque la sección pida otros', () => {
    reduceMotion(false)
    const wrapper = mount(FxText, {
      props: { text: '&', effects: ['stamp', 'calligraphy'], allow: ['calligraphy'] },
    })
    expect(wrapper.classes()).toContain('fxt--calligraphy')
  })
})

describe('WaxSeal como botón', () => {
  it('con icon graba el signo en lugar del monograma, sin brillo ni movimiento', () => {
    const play = mount(WaxSeal, { props: { initials: 'I M', icon: 'play', shine: true } })
    expect(play.find('.seal__icon').exists()).toBe(true)
    expect(play.find('.seal__letters').exists()).toBe(false)
    expect(play.find('.seal__icon').attributes('d')).toMatch(/^M.*L.*Z$/)
    expect(play.find('.seal__gleam').exists()).toBe(false)
    const pause = mount(WaxSeal, { props: { initials: 'I M', icon: 'pause' } })
    expect(pause.find('.seal__icon').attributes('d')).toContain('h5.4v17')
  })
})
