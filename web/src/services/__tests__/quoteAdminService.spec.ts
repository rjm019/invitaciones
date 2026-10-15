import { describe, expect, it } from 'vitest'
import { filterQuotes, formatPhone, whatsappLink } from '../quoteAdminService'
import type { Quote } from '@/types/design'

const quote = (over: Partial<Quote> = {}): Quote => ({
  id: '1',
  created_at: null,
  name: 'Valeria Ruiz',
  phone: '+525512345678',
  type: 'boda',
  event_date: null,
  idea: 'Muchas flores',
  page: '/',
  status: 'nueva',
  note: null,
  handled_by: null,
  updated_at: null,
  ...over,
})

describe('quoteAdminService', () => {
  it('filtra por estado y busca por nombre, idea, nota o teléfono', () => {
    const list = [
      quote(),
      quote({ id: '2', status: 'cerrada', name: null, phone: '+523312345678' }),
      quote({ id: '3', status: 'cotizada', note: 'Quiere dorado' }),
    ]
    expect(filterQuotes(list, 'open').map((q) => q.id)).toEqual(['1', '3'])
    expect(filterQuotes(list, 'all').map((q) => q.id)).toEqual(['1', '2', '3'])
    expect(filterQuotes(list, 'cerrada').map((q) => q.id)).toEqual(['2'])
    expect(filterQuotes(list, 'all', 'dorado').map((q) => q.id)).toEqual(['3'])
    expect(filterQuotes(list, 'all', '33 12').map((q) => q.id)).toEqual(['2'])
    expect(filterQuotes(list, 'all', 'VALERIA').map((q) => q.id)).toEqual(['1', '3'])
  })

  it('muestra el teléfono de México en bloques', () => {
    expect(formatPhone('+525512345678')).toBe('55 1234 5678')
    expect(formatPhone('+14155550100')).toBe('+14155550100')
  })

  it('arma el WhatsApp con un saludo', () => {
    expect(whatsappLink(quote())).toBe(
      'https://wa.me/525512345678?text=' +
        encodeURIComponent(
          '¡Hola, Valeria! Gracias por escribirnos. Te contactamos para platicar sobre tu invitación de boda.',
        ),
    )
    expect(decodeURIComponent(whatsappLink(quote({ name: null, type: 'otro' })))).toContain(
      '¡Hola! Gracias por escribirnos. Te contactamos para platicar sobre tu celebración.',
    )
  })
})
