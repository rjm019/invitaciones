import { describe, expect, it, vi } from 'vitest'
import {
  normalizePhone,
  sendQuote,
  serverErrors,
  validateQuote,
  type QuoteForm,
} from '../quoteService'

const form = (over: Partial<QuoteForm> = {}): QuoteForm => ({
  telefono: '55 1234 5678',
  nombre: 'Valeria',
  tipo: 'boda',
  fecha_evento: '',
  idea: '',
  privacidad: true,
  pagina: '/',
  empresa: '',
  t: 1,
  ...over,
})

describe('quoteService', () => {
  it('normaliza el teléfono igual que el servidor', () => {
    expect(normalizePhone('55 1234 5678')).toBe('+525512345678')
    expect(normalizePhone('+52 1 55 1234 5678')).toBe('+525512345678')
    expect(normalizePhone('5215512345678')).toBe('+525512345678')
    expect(normalizePhone('+1 415 555 0100')).toBe('+14155550100')
    expect(normalizePhone('0034 612 345 678')).toBe('+34612345678')
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('llámame')).toBeNull()
  })

  it('revisa el formulario con los textos del servidor', () => {
    expect(validateQuote(form())).toEqual({})
    expect(validateQuote(form({ telefono: '', tipo: 'fiesta', privacidad: false }))).toEqual({
      telefono: 'Escribe tu WhatsApp o teléfono.',
      tipo: 'Elige qué celebras.',
      privacidad: 'Necesitamos que aceptes el aviso de privacidad para escribirte.',
    })
    expect(validateQuote(form({ telefono: '123' })).telefono).toBe(
      'Revisa tu número: 10 dígitos (por ejemplo 55 1234 5678).',
    )
  })

  it('envía y traduce lo que responde el servidor', async () => {
    const ok = vi.fn().mockResolvedValue({ ok: true, status: 201 })
    await expect(sendQuote(form(), ok)).resolves.toEqual({ ok: true })
    expect(ok).toHaveBeenCalledWith(
      '/api/public/quotes',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(ok.mock.calls[0]![1].body)).toMatchObject({
      telefono: '55 1234 5678',
      privacidad: '1',
    })

    // Con errores locales no se llama al servidor.
    const never = vi.fn()
    await expect(sendQuote(form({ telefono: '' }), never)).resolves.toMatchObject({ ok: false })
    expect(never).not.toHaveBeenCalled()

    const invalid = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ errors: { telefono: ['Revisa tu número'] } }),
    })
    await expect(sendQuote(form(), invalid)).resolves.toEqual({
      ok: false,
      errors: { telefono: 'Revisa tu número' },
    })

    const busy = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    expect(await sendQuote(form(), busy)).toEqual({
      ok: false,
      errors: { form: 'Recibimos varias solicitudes desde aquí. Intenta en un rato.' },
    })

    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await sendQuote(form(), offline)).toEqual({
      ok: false,
      errors: { form: 'Sin conexión. Revisa tu internet e intenta de nuevo.' },
    })
  })

  it('un error sin campos queda como error general', () => {
    expect(serverErrors({ message: 'Algo pasó' })).toEqual({ form: 'Algo pasó' })
    expect(serverErrors(null)).toEqual({ form: 'No se pudo enviar. Intenta de nuevo.' })
  })
})
