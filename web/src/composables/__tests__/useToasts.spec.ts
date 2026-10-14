import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useToasts } from '../useToasts'

function page() {
  let toasts!: ReturnType<typeof useToasts>
  const wrapper = mount(
    defineComponent({
      setup() {
        toasts = useToasts()
        return () => null
      },
    }),
  )
  return { toasts, wrapper }
}

describe('useToasts', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('muestra el aviso y lo quita solo después de un rato', () => {
    const { toasts, wrapper } = page()
    toasts.toast('Publicado ✓')
    expect(toasts.toasts.value).toMatchObject([{ message: 'Publicado ✓', tone: 'ok' }])

    vi.advanceTimersByTime(4499)
    expect(toasts.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.toasts.value).toHaveLength(0)
    wrapper.unmount()
  })

  it('los avisos son los mismos para toda la página y se pueden cerrar antes', () => {
    const a = page()
    const b = page()
    const run = vi.fn()
    const id = a.toasts.toast('No se pudo guardar.', 'error', { label: 'Reintentar', run }, 10_000)

    expect(b.toasts.toasts.value).toMatchObject([
      { id, tone: 'error', action: { label: 'Reintentar' } },
    ])
    b.toasts.dismiss(id)
    expect(a.toasts.toasts.value).toHaveLength(0)
    a.wrapper.unmount()
    b.wrapper.unmount()
  })

  it('al salir de una página se van sus avisos, no los de las demás', () => {
    const editor = page()
    const home = page()
    editor.toasts.toast('Guardado')
    home.toasts.toast('Bienvenido')

    editor.wrapper.unmount()
    expect(home.toasts.toasts.value.map((t) => t.message)).toEqual(['Bienvenido'])
    home.wrapper.unmount()
    expect(home.toasts.toasts.value).toHaveLength(0)
  })
})
