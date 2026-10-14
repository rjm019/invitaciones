import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useShareCard } from '../useShareCard'
import type { PanelInvitation } from '@/types/panel'

const invitation: PanelInvitation = {
  id: '1',
  label: 'Familia Pérez',
  passes: 2,
  url: 'https://x.dev/i/Abc',
  message: '¡Hola, Familia Pérez! Te compartimos tu invitación (2 pases): https://x.dev/i/Abc',
  whatsapp_url: 'https://wa.me/?text=hola',
  guests: [],
  opens: 0,
  created_at: null,
}
const card = {
  pdf: new File(['x'], 'Invitacion-Familia-Perez.pdf', { type: 'application/pdf' }),
  image: new File(['x'], 'Invitacion-Familia-Perez.jpg', { type: 'image/jpeg' }),
  previewUrl: 'blob:vista',
  pdfUrl: 'blob:pdf',
}
const text = '¡Hola, Familia Pérez! Te compartimos tu invitación (2 pases)'

function setup() {
  let api!: ReturnType<typeof useShareCard>
  mount(defineComponent({ setup: () => ((api = useShareCard()), () => null) }))
  return api
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
})

describe('useShareCard', () => {
  it('en el celular comparte el PDF con su mensaje, sin el enlace a la vista', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { canShare: () => true, share })

    await expect(setup().send(card, invitation)).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({ files: [card.pdf], text })
  })

  it('si el invitado cierra el menú de compartir, no pasa nada más', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError')),
    })

    await expect(setup().send(card, invitation)).resolves.toBe('cancelled')
    expect(open).not.toHaveBeenCalled()
  })

  it('en la computadora descarga el PDF y abre WhatsApp con el mensaje', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await expect(setup().send(card, invitation)).resolves.toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
    expect(open).toHaveBeenCalledWith(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener',
    )
  })
})
