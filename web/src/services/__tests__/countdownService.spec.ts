import { describe, expect, it } from 'vitest'
import { pad2, timeLeft } from '../countdownService'

const EVENT = '2026-11-28T17:00:00-06:00'

describe('timeLeft', () => {
  it('cuenta desde la fecha del evento con su offset, no la zona del celular', () => {
    // El widget de Canva marcaba 66 días el 12-oct (apuntaba a otra fecha); lo correcto son ~47.
    const left = timeLeft(EVENT, new Date('2026-10-12T22:45:00-06:00'))
    expect(left).toEqual({ days: 46, hours: 18, minutes: 15, seconds: 0, isOver: false })
  })

  it('llega a cero y marca isOver en la hora exacta y después', () => {
    expect(timeLeft(EVENT, new Date('2026-11-28T17:00:00-06:00')).isOver).toBe(true)
    expect(timeLeft(EVENT, new Date('2026-11-29T10:00:00-06:00'))).toMatchObject({
      days: 0,
      isOver: true,
    })
  })

  it('una fecha vacía o inválida no rompe la sección', () => {
    expect(timeLeft(null).isOver).toBe(true)
    expect(timeLeft('mañana').isOver).toBe(true)
  })

  it('rellena con cero a dos dígitos', () => {
    expect(pad2(7)).toBe('07')
    expect(pad2(42)).toBe('42')
  })
})
