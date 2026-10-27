import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import { provideInvitationContext, type InvitationContext } from '@/composables/useInvitation'
import type { EventConfig, ResolvedSection } from '@/types/event'
import type { Invitation, InvitationAlbum } from '@/types/invitation'
import AlbumSection from '../AlbumSection.vue'

const STARTS = '2026-11-28T17:00:00-06:00'

function section(extra: Partial<ResolvedSection> = {}): ResolvedSection {
  return {
    type: 'guest-album',
    effects: [],
    visible: true,
    id: 'album',
    decor: {},
    panel: true,
    desktop: 'full',
    days: 5,
    ...extra,
  } as ResolvedSection
}

const album = (patch: Partial<InvitationAlbum> = {}): InvitationAlbum => ({
  state: 'event_day',
  can_upload: true,
  used: 0,
  remaining: 2,
  max: 2,
  closes_at: null,
  last_day: '2026-12-03',
  ...patch,
})

function render(opts: {
  now: string
  section?: ResolvedSection
  album?: InvitationAlbum
  invitation?: boolean
  demo?: boolean
}) {
  vi.setSystemTime(new Date(opts.now))
  const upload = vi.fn(async () => album({ used: 1, remaining: 1 }))
  const context = {
    token: 'tok',
    invitation: ref<Invitation | null>({ album: opts.album } as Invitation),
    sending: ref(false),
    uploadAlbumPhoto: upload,
  } as unknown as InvitationContext
  const wrapper = mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(
            () =>
              ({
                starts_at: STARTS,
                timezone: 'America/Mexico_City',
                demo: !!opts.demo,
              }) as EventConfig,
          ),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        if (opts.invitation !== false) provideInvitationContext(context)
        return () => h(AlbumSection, { section: opts.section ?? section() })
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, upload }
}

async function choose(wrapper: ReturnType<typeof render>['wrapper'], count: number) {
  const input = wrapper.find('input[type="file"]')
  const files = Array.from(
    { length: count },
    (_, i) => new File(['x'], `foto${i}.jpg`, { type: 'image/jpeg' }),
  )
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('createImageBitmap', undefined)
  URL.createObjectURL = vi.fn(() => 'blob:local-1')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('AlbumSection', () => {
  it('antes del día del evento solo avisa que ese día se podrá subir', () => {
    const { wrapper } = render({ now: '2026-11-20T12:00:00-06:00' })
    expect(wrapper.text()).toContain('El día de la fiesta podrás subir tus fotos aquí')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('el día del evento ofrece subir con los lugares que quedan', () => {
    const { wrapper } = render({ now: '2026-11-28T12:00:00-06:00', album: album() })
    expect(wrapper.text()).toContain('Sube tus fotos (te quedan 2)')
    expect(wrapper.find('button.album__button').text()).toBe('Elegir fotos')
    expect(wrapper.find('.album__grid').exists()).toBe(false)
  })

  it('sube de una en una y no más de los lugares que quedan', async () => {
    const { wrapper, upload } = render({
      now: '2026-11-28T12:00:00-06:00',
      album: album({ remaining: 1 }),
    })
    await choose(wrapper, 3)
    await flushPromises()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Solo caben 1 foto en tu invitación')
  })

  it('muestra el error de la API en español', async () => {
    const { wrapper, upload } = render({ now: '2026-11-28T12:00:00-06:00', album: album() })
    const { ApiError } = await import('@/services/http')
    upload.mockRejectedValueOnce(new ApiError('El álbum ya está lleno y no recibe más fotos.', 507))
    await choose(wrapper, 2)
    await flushPromises()
    expect(wrapper.find('.album__error').text()).toBe(
      'El álbum ya está lleno y no recibe más fotos.',
    )
    // Con 507 no sigue con la segunda.
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('el día siguiente muestra solo las fotos que llegan elegidas, con visor', async () => {
    const photos = [{ photo: 'https://x.test/a.webp', caption: '', width: 1600, height: 1200 }]
    const { wrapper } = render({
      now: '2026-11-30T12:00:00-06:00',
      album: album({ state: 'after' }),
      section: section({ photos }),
    })
    expect(wrapper.findAll('.album__item')).toHaveLength(1)
    await wrapper.find('.album__item').trigger('click')
    expect(document.querySelector('[role="dialog"], .viewer')).not.toBeNull()
  })

  it('la invitación general pide abrir el enlace personal', () => {
    const { wrapper } = render({ now: '2026-11-28T12:00:00-06:00', invitation: false })
    expect(wrapper.text()).toContain('abre el enlace personal')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('en una muestra se ven las fotos de ejemplo y la subida se simula sin llamar al servidor', async () => {
    const photos = [1, 2, 3].map((n) => ({ photo: `https://x.test/${n}.webp`, caption: '' }))
    const { wrapper, upload } = render({
      now: '2027-06-01T12:00:00-06:00',
      demo: true,
      section: section({ photos }),
    })
    expect(wrapper.findAll('.album__item')).toHaveLength(3)
    expect(wrapper.text()).toContain('Es una muestra')
    await choose(wrapper, 1)
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()
    expect(upload).not.toHaveBeenCalled()
    expect(wrapper.findAll('.album__item')).toHaveLength(4)
    expect(wrapper.text()).toContain('Sube tus fotos (te queda 1)')
  })
})
