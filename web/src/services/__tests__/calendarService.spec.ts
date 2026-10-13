import { describe, expect, it } from 'vitest'
import { googleCalendarUrl, localDate, monthGrid } from '../calendarService'

const MX = 'America/Mexico_City'

describe('monthGrid', () => {
  it('noviembre de 2026 empieza en domingo y el 28 cae en sábado', () => {
    const grid = monthGrid('2026-11-28T17:00:00-06:00', MX)
    expect(grid).toMatchObject({ year: 2026, month: 11, day: 28 })
    expect(grid.weekdays).toEqual(['D', 'L', 'M', 'M', 'J', 'V', 'S'])
    expect(grid.weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(grid.weeks[3][6]).toBe(28)
    expect(grid.weeks.at(-1)).toEqual([29, 30, null, null, null, null, null])
  })

  it('febrero bisiesto tiene 29 días y deja casillas vacías antes del 1', () => {
    const grid = monthGrid('2028-02-10T12:00:00-06:00', MX)
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(29)
    expect(grid.weeks[0]).toEqual([null, null, 1, 2, 3, 4, 5]) // 1-feb-2028 es martes
  })

  it('con la semana empezando en lunes cambian las columnas', () => {
    const grid = monthGrid('2026-11-28T17:00:00-06:00', MX, 1)
    expect(grid.weekdays[0]).toBe('L')
    expect(grid.weeks[0]).toEqual([null, null, null, null, null, null, 1])
  })

  it('usa la zona del evento: 1-nov 02:00 UTC todavía es 31 de octubre en México', () => {
    expect(localDate('2026-11-01T02:00:00Z', MX)).toEqual({ year: 2026, month: 10, day: 31 })
    expect(monthGrid('2026-11-01T02:00:00Z', MX).month).toBe(10)
  })
})

describe('googleCalendarUrl', () => {
  it('arma el evento en UTC con duración por defecto de 6 horas', () => {
    const url = new URL(
      googleCalendarUrl({
        title: 'Mis XV años',
        startsAt: '2026-11-28T17:00:00-06:00',
        location: 'Salón',
      }),
    )
    expect(url.searchParams.get('dates')).toBe('20261128T230000Z/20261129T050000Z')
    expect(url.searchParams.get('text')).toBe('Mis XV años')
    expect(url.searchParams.get('location')).toBe('Salón')
  })
})
