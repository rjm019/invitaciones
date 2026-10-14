import { describe, expect, it } from 'vitest'
import {
  dateParts,
  dayMonth,
  hourMinute,
  longDate,
  shortDateTime,
  time12h,
} from '../dateFormatService'

describe('dateFormatService', () => {
  it('fecha límite como la escribe el diseño', () => {
    expect(dayMonth('2026-11-06')).toBe('6 de noviembre')
    expect(longDate('2026-11-06')).toBe('6 de noviembre de 2026')
  })

  it('partes de la fecha en la zona del evento', () => {
    expect(dateParts('2026-11-28T17:00:00-06:00', 'America/Mexico_City')).toEqual({
      day: '28',
      month: 'noviembre',
      year: '2026',
      weekday: 'sábado',
    })
    // A las 23:30 en México ya es otro día en UTC: debe seguir siendo 28.
    expect(dateParts('2026-11-28T23:30:00-06:00', 'America/Mexico_City').day).toBe('28')
  })

  it('horas de 24 h a 12 h', () => {
    expect(hourMinute('2026-11-28T17:00:00-06:00', 'America/Mexico_City')).toBe('17:00')
    expect(hourMinute('2026-11-28T23:05:00Z', 'America/Mexico_City')).toBe('17:05')
    expect(time12h('17:00')).toBe('5:00 pm')
    expect(time12h('12:00')).toBe('12:00 pm')
    expect(time12h('00:30')).toBe('12:30 am')
    expect(time12h('raro')).toBe('raro')
  })

  it('fecha y hora cortas en la zona del evento (panel)', () => {
    expect(shortDateTime('2026-10-13T18:05:00Z', 'America/Mexico_City')).toBe('13 oct, 12:05 p.m.')
  })
})
