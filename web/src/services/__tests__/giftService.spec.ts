import { describe, expect, it } from 'vitest'
import type { EventConfig, GiftEnvelope } from '@/types/event'
import { forGeneralLink, groupDigits, hasGifts, storeMonogram } from '../giftService'

const envelope: GiftEnvelope = {
  title: '',
  text: 'Si prefieres un sobre:',
  bank: 'BBVA',
  account: '012180001234567891',
  holder: 'Ana Pérez',
  box: true,
  hidden: false,
  private: true,
}
const event = { slug: 'ana', gifts: { stores: [], envelope } } as unknown as EventConfig

describe('giftService', () => {
  it('agrupa la CLABE o la tarjeta de 4 en 4', () => {
    expect(groupDigits('012180001234567891')).toBe('0121 8000 1234 5678 91')
    expect(groupDigits('4152 3136 0000 1234')).toBe('4152 3136 0000 1234')
    expect(groupDigits('')).toBe('')
  })

  it('el monograma salta el artículo', () => {
    expect(storeMonogram({ name: 'El Palacio de Hierro' })).toBe('P')
    expect(storeMonogram({ name: 'liverpool' })).toBe('L')
    expect(storeMonogram({ name: 'Ópticas' })).toBe('Ó')
    expect(storeMonogram({ name: '' })).toBe('')
  })

  it('sin tiendas ni sobres no hay nada que mostrar', () => {
    expect(hasGifts(null)).toBe(false)
    expect(hasGifts({ stores: [], envelope: null })).toBe(false)
    expect(hasGifts({ stores: [], envelope })).toBe(true)
  })

  it('el enlace general no lleva los datos bancarios si son solo con enlace', () => {
    const general = forGeneralLink(event)
    expect(general.gifts?.envelope).toMatchObject({
      bank: '',
      account: '',
      holder: '',
      hidden: true,
      text: 'Si prefieres un sobre:',
      box: true,
    })
    // Sin "solo con enlace", se ven tal cual; y la invitación original no cambia.
    const open = { ...event, gifts: { stores: [], envelope: { ...envelope, private: false } } }
    expect(forGeneralLink(open)).toBe(open)
    expect(event.gifts?.envelope?.account).toBe('012180001234567891')
  })

  it('la sección propia de lluvia de sobres también se oculta en el enlace general', () => {
    const own = { slug: 'ana', envelope } as unknown as EventConfig
    expect(forGeneralLink(own).envelope).toMatchObject({ account: '', hidden: true })
    expect(own.envelope?.account).toBe('012180001234567891')
    const none = { slug: 'ana' } as unknown as EventConfig
    expect(forGeneralLink(none)).toBe(none)
  })
})
