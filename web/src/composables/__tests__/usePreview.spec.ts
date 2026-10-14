import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { providePreview, usePreview, type PreviewOptions } from '../usePreview'

describe('usePreview', () => {
  it('fuera del editor no hay vista previa; dentro, sigue a sus opciones', async () => {
    let outside: unknown = 'x'
    mount(defineComponent({ setup: () => ((outside = usePreview().value), () => null) }))
    expect(outside).toBeNull()

    const options = ref<PreviewOptions | null>({ envelopeOpen: true, muted: true })
    let inside!: ReturnType<typeof usePreview>
    const Child = defineComponent({ setup: () => ((inside = usePreview()), () => null) })
    mount(defineComponent({ setup: () => (providePreview(() => options.value), () => h(Child)) }))

    expect(inside.value).toEqual({ envelopeOpen: true, muted: true })
    options.value = null
    expect(inside.value).toBeNull()
  })
})
