import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ file: 'cancion.mp3', duration: 187.4 as number | null }))
vi.mock('@/composables/useEditorContext', async () => {
  const { computed } = await import('vue')
  return {
    useEditor: () => ({
      design: computed(() => ({ event: { musica_audio: state.file } })),
      resolveAsset: computed(() => (n: string) => `/media/${n}`),
    }),
  }
})
vi.mock('@/services/audioDurationService', async (original) => ({
  ...(await original<typeof import('@/services/audioDurationService')>()),
  readAudioDuration: vi.fn(async () => state.duration),
}))

import AudioStartField from '../AudioStartField.vue'

describe('AudioStartField', () => {
  beforeEach(() => {
    state.file = 'cancion.mp3'
    state.duration = 187.4
  })

  it('muestra la duración y limita el máximo a un segundo antes del final', async () => {
    const wrapper = mount(AudioStartField, { props: { modelValue: '' } })
    await flushPromises()
    expect(wrapper.text()).toContain('La canción dura 3:07.')
    expect(wrapper.get('input').attributes('max')).toBe('186')
    expect(wrapper.get('input').attributes('min')).toBe('0')
  })

  it('avisa si el inicio no cabe en la canción', async () => {
    const wrapper = mount(AudioStartField, { props: { modelValue: '200' } })
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe(
      'La canción dura 3:07; el inicio debe ser menor.',
    )
  })

  it('solo deja pasar dígitos', async () => {
    const wrapper = mount(AudioStartField, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('-4.5')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['45'])
  })

  it('sin duración conocida muestra una nota y no bloquea', async () => {
    state.duration = null
    const wrapper = mount(AudioStartField, { props: { modelValue: '30' } })
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo leer la duración.')
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
  })

  it('sin canción pide elegirla primero', async () => {
    state.file = ''
    const wrapper = mount(AudioStartField, { props: { modelValue: '' } })
    await flushPromises()
    expect(wrapper.text()).toContain('Elige primero la canción')
  })
})
