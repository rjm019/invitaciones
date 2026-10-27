import { describe, expect, it } from 'vitest'
import { liveItinerary, momentMinutes } from '../liveItineraryService'

const TZ = 'America/Mexico_City'
const STARTS = '2026-11-28T17:00:00-06:00'
const moments = [
  { time: '17:00', label: 'Recepción' },
  { time: '19:00', label: 'Cena' },
  { time: '21:00', label: 'Vals' },
]
const at = (iso: string) => new Date(iso)

describe('liveItinerary', () => {
  it('no resalta nada si no es el día del evento', () => {
    expect(liveItinerary(moments, STARTS, TZ, at('2026-11-27T20:00:00-06:00')).status).toBe('off')
    expect(liveItinerary(moments, STARTS, TZ, at('2026-11-29T20:00:00-06:00')).status).toBe('off')
  })

  it('antes del primer momento, sigue el primero', () => {
    const s = liveItinerary(moments, STARTS, TZ, at('2026-11-28T09:00:00-06:00'))
    expect(s).toMatchObject({ status: 'before', current: null, next: 0 })
    expect(s.past).toEqual([false, false, false])
  })

  it('durante: ahora y sigue, y los pasados quedan atenuados', () => {
    const s = liveItinerary(moments, STARTS, TZ, at('2026-11-28T19:30:00-06:00'))
    expect(s).toMatchObject({ status: 'live', current: 1, next: 2 })
    expect(s.past).toEqual([true, false, false])
  })

  it('en el último momento no hay siguiente', () => {
    const s = liveItinerary(moments, STARTS, TZ, at('2026-11-28T22:00:00-06:00'))
    expect(s).toMatchObject({ status: 'live', current: 2, next: null })
  })

  it('después del último momento todo es pasado y luego se apaga', () => {
    const s = liveItinerary(moments, STARTS, TZ, at('2026-11-28T23:30:00-06:00'))
    expect(s).toMatchObject({ status: 'after', current: null, next: null })
    expect(s.past).toEqual([true, true, true])
    expect(liveItinerary(moments, STARTS, TZ, at('2026-11-29T00:30:00-06:00')).status).toBe('off')
  })

  it('usa la zona del evento, no la del visitante', () => {
    // 19:30 en CDMX son las 01:30Z del día siguiente en UTC.
    const s = liveItinerary(moments, STARTS, TZ, at('2026-11-29T01:30:00Z'))
    expect(s).toMatchObject({ status: 'live', current: 1 })
  })

  describe('cruzando la medianoche', () => {
    const night = [
      { time: '22:00', label: 'Cena' },
      { time: '23:30', label: 'Baile' },
      { time: '01:00', label: 'Tornaboda' },
    ]
    it('una hora menor que la anterior es del día siguiente', () => {
      expect(momentMinutes(night)).toEqual([1320, 1410, 1500])
    })
    it('de madrugada sigue el itinerario del día anterior', () => {
      const s = liveItinerary(night, '2026-11-28T22:00:00-06:00', TZ, at('2026-11-29T00:15:00-06:00'))
      expect(s).toMatchObject({ status: 'live', current: 1, next: 2 })
      expect(s.past).toEqual([true, false, false])
    })
    it('la tornaboda es el momento actual a la 1:30 y se apaga después', () => {
      const start = '2026-11-28T22:00:00-06:00'
      expect(liveItinerary(night, start, TZ, at('2026-11-29T01:30:00-06:00'))).toMatchObject({
        status: 'live',
        current: 2,
      })
      expect(liveItinerary(night, start, TZ, at('2026-11-29T04:00:00-06:00')).status).toBe('off')
    })
  })

  it('sin momentos o sin fecha no resalta nada', () => {
    expect(liveItinerary([], STARTS, TZ).status).toBe('off')
    expect(liveItinerary(moments, '', TZ).status).toBe('off')
  })
})
