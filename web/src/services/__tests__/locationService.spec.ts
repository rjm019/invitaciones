import { describe, expect, it } from 'vitest'
import { placeCalendarUrl } from '../locationService'

describe('placeCalendarUrl', () => {
  it('arma el enlace con la hora y el lugar de ese punto', () => {
    const url = new URL(
      placeCalendarUrl(
        { label: 'Misa', name: 'Parroquia', address: 'Centro', starts_at: '2026-11-28T17:00:00-06:00' },
        'XV de Nat',
      )!,
    )
    expect(url.searchParams.get('text')).toBe('XV de Nat · Misa')
    expect(url.searchParams.get('dates')).toBe('20261128T230000Z/20261129T020000Z')
    expect(url.searchParams.get('location')).toBe('Parroquia, Centro')
  })

  it('sin hora propia no hay enlace', () => {
    expect(placeCalendarUrl({ name: 'Salón' }, 'XV')).toBeNull()
  })
})
