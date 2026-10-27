import { describe, expect, it } from 'vitest'
import {
  formatPhone,
  reminderCost,
  reminderDate,
  reminderStateText,
  reminderStatusLabel,
} from '../reminderService'

describe('reminderService', () => {
  it('da formato al teléfono', () => {
    expect(formatPhone('525512345678')).toBe('+52 55 1234 5678')
    expect(formatPhone('15551234567')).toBe('+1 555 123 4567')
    expect(formatPhone('34612345678')).toBe('+346 123 456 78')
    expect(formatPhone('')).toBe('')
    expect(formatPhone(null)).toBe('')
  })

  it('nombra cada estado', () => {
    expect(reminderStatusLabel('responded')).toBe('Respondió')
    expect(reminderStatusLabel('no_phone')).toBe('Sin teléfono')
    expect(reminderStatusLabel('opted_out')).toBe('Se dio de baja')
    expect(reminderStatusLabel('no_whatsapp')).toBe('Sin WhatsApp')
    expect(reminderStatusLabel('failed')).toBe('No se pudo enviar')
    expect(reminderStatusLabel('read')).toBe('Leído')
    expect(reminderStatusLabel('delivered')).toBe('Entregado')
    expect(reminderStatusLabel('sent')).toBe('Enviado')
    expect(reminderStatusLabel('waiting')).toBe('En espera')
  })

  it('escribe la fecha del próximo envío', () => {
    expect(reminderDate('2026-10-31')).toBe('sábado 31 de octubre')
  })

  it('explica el estado de la tarjeta', () => {
    const base = { active: false, stopped_reason: null, next_run: null } as const
    expect(reminderStateText({ ...base, stopped_reason: 'off' })).toBe('Apagado')
    expect(reminderStateText({ ...base, stopped_reason: 'no_consent' })).toBe(
      'Falta confirmar el permiso',
    )
    expect(reminderStateText({ ...base, stopped_reason: 'deadline' })).toBe(
      'Ya pasó la fecha límite',
    )
    expect(reminderStateText({ ...base, stopped_reason: 'cap' })).toBe(
      'Se llegó al tope de mensajes',
    )
    expect(reminderStateText({ active: true, stopped_reason: null, next_run: '2026-10-31' })).toBe(
      'Próximo envío: sábado 31 de octubre',
    )
    expect(reminderStateText({ active: true, stopped_reason: null, next_run: null })).toBe('Activo')
  })

  it('calcula el costo aproximado', () => {
    expect(reminderCost(125)).toBe('20.00')
    expect(reminderCost(0)).toBe('0.00')
    expect(reminderCost(3)).toBe('0.48')
  })
})
