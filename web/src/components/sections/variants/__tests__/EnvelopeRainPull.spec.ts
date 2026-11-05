import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { sectionVariants } from '@/components/sectionVariants'
import { provideEvent } from '@/composables/useEvent'
import { providePreview } from '@/composables/usePreview'
import type { EventConfig, ResolvedSection } from '@/types/event'
import EnvelopeRainPull from '../EnvelopeRainPull.vue'

function render(section: Record<string, unknown>, event: Record<string, unknown>, preview = false) {
  return mount(
    defineComponent({
      setup() {
        if (preview) providePreview(() => ({ envelopeOpen: true, muted: true }))
        provideEvent({
          event: computed(() => event as unknown as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        return () => h(EnvelopeRainPull, { section: { decor: {}, effects: [], ...section } as unknown as ResolvedSection })
      },
    }),
  )
}
const decor = { envelope_back: '/atras.webp', envelope_front: '/frente.webp', envelope_sheet: '/hoja.webp' }
const envelope = { title: 'Lluvia', text: 'Gracias', account: '012345678901234567', holder: 'Carlos', box: true }

describe('EnvelopeRainPull (sobre-imagen)', () => {
  it('está registrada como variante de envelope-rain', () => {
    expect(sectionVariants['envelope-rain']['sobre-imagen']).toBeTypeOf('function')
  })

  it('cerrado: botón accesible con aviso y la hoja sin foco; tocar abre y tocar de nuevo guarda', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const w = render({ decor }, { envelope })
    const toggle = w.get('button.pull__toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(w.text()).toContain('Toca el sobre')
    expect(w.get('.pull__sheet').attributes('inert')).toBeDefined()
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(w.get('.pull__stage').classes()).toContain('is-open')
    expect(w.get('.pull__sheet').attributes('inert')).toBeUndefined()
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    vi.unstubAllGlobals()
  })

  it('cerrado: el título y la frase se leen sobre la hoja; abierto se apartan', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const w = render({ decor }, { envelope })
    const cover = w.get('.pull__cover')
    expect(cover.text()).toContain('Lluvia')
    expect(cover.text()).toContain('Gracias')
    expect(cover.attributes('aria-hidden')).toBe('false')
    await w.get('button.pull__toggle').trigger('click')
    expect(cover.attributes('aria-hidden')).toBe('true')
  })

  it('en la hoja van título, texto, CLABE agrupada, titular, copiar y la nota de caja', () => {
    const w = render({ decor }, { envelope })
    const sheet = w.get('.pull__sheet')
    expect(sheet.get('[data-text="title"]').text()).toBe('Lluvia')
    expect(sheet.get('[data-text="text"]').text()).toBe('Gracias')
    expect(sheet.get('[data-text="account"]').text()).toContain('0123 4567 8901 2345 67')
    expect(sheet.text()).toContain('Carlos')
    expect(sheet.get('.pull__copy').text()).toContain('Copiar')
    expect(sheet.text()).toContain('También habrá caja para sobres en el salón.')
  })

  it('en el enlace general (hidden) la hoja avisa dónde están los datos', () => {
    const w = render({ decor }, { envelope: { title: 'Lluvia', hidden: true } })
    expect(w.find('[data-text="account"]').exists()).toBe(false)
    expect(w.text()).toContain('Los datos para tu sobre vienen en tu invitación personal.')
  })

  it('con menos movimiento arranca abierto', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    const w = render({ decor }, { envelope })
    expect(w.get('.pull__toggle').attributes('aria-expanded')).toBe('true')
    vi.unstubAllGlobals()
  })

  it('sin imágenes de sobre cae al diseño clásico', () => {
    const w = render({}, { envelope })
    expect(w.find('.pull').exists()).toBe(false)
    expect(w.find('.rain').exists()).toBe(true)
  })

  it('el texto cerrado se ubica con portada_x/portada_y (por defecto, 50 % y 41 %) y no usa la hoja', () => {
    const plain = render({ decor, pull: { x: 30, y: 58.7 } }, { envelope })
    const style = plain.get('.pull').attributes('style') ?? ''
    expect(style).toContain('--cx: 50')
    expect(style).toContain('--cy: 41')
    const moved = render({ decor, pull: { x: 30, cover_x: 62.5, cover_y: 35 } }, { envelope })
    expect(moved.get('.pull').attributes('style')).toContain('--cx: 62.5')
    expect(moved.get('.pull').attributes('style')).toContain('--cy: 35')
  })

  it('el texto cerrado tiene sus propios bloques y el sobre es una sola pieza del lienzo', () => {
    const w = render({ decor }, { envelope })
    expect(w.get('.pull__cover [data-text="covertitle"]').text()).toBe('Lluvia')
    expect(w.get('.pull__cover [data-text="covertext"]').text()).toBe('Gracias')
    expect(w.get('.pull__stage').attributes('data-canvas-whole')).toBeDefined()
  })

  it('en el gestor arranca cerrado, o abierto si vista_gestor lo pide; fuera del gestor no cuenta', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    expect(render({ decor }, { envelope }, true).get('.pull__toggle').attributes('aria-expanded')).toBe('false')
    expect(render({ decor, pull: { view: 'closed' } }, { envelope }, true).get('.pull__toggle').attributes('aria-expanded')).toBe('false')
    const open = render({ decor, pull: { view: 'open' } }, { envelope }, true)
    expect(open.get('.pull__toggle').attributes('aria-expanded')).toBe('true')
    expect(open.get('.pull__cover').attributes('inert')).toBeDefined()
    expect(render({ decor, pull: { view: 'open' } }, { envelope }).get('.pull__toggle').attributes('aria-expanded')).toBe('false')
    vi.unstubAllGlobals()
  })
})
