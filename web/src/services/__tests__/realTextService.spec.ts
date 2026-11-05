import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FxText from '@/components/ui/FxText.vue'
import { realText } from '../realTextService'

describe('realText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('un texto normal sale tal cual, con espacios colapsados', () => {
    const el = document.createElement('h2')
    el.innerHTML = '  Con   todo el\n corazón '
    expect(realText(el)).toBe('Con todo el corazón')
  })

  it('descarta las copias ocultas al lector (letras partidas, destellos)', () => {
    const el = document.createElement('h2')
    el.innerHTML =
      '<span class="fxt"><span class="fxt__read">Alexa</span><span aria-hidden="true">Alexa</span></span> &amp; ' +
      '<span class="fxt">Carlos<span aria-hidden="true">Carlos</span></span>'
    expect(realText(el)).toBe('Alexa & Carlos')
  })

  it('con FxText y letras por efecto, el texto sale una sola vez', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const w = mount(FxText, { props: { text: 'Con todo el corazón', effects: ['typewriter-title'], active: false } })
    expect(w.element.textContent!.replace(/\s+/g, '')).not.toBe('Contodoelcorazón')
    expect(realText(w.element)).toBe('Con todo el corazón')
  })

  it('con lines: conserva los saltos de línea (Duplicar)', () => {
    const el = document.createElement('p')
    el.innerHTML = 'Mujeres: vestido largo<br>Hombres: corbata<span aria-hidden="true">x</span>'
    expect(realText(el, { lines: true })).toBe('Mujeres: vestido largo\nHombres: corbata')
    expect(realText(el)).toBe('Mujeres: vestido largo Hombres: corbata')
  })
})
