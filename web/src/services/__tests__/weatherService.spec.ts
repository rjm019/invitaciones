import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventWeather } from '@/types/weather'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../http', () => ({ http: { get } }))

import {
  REFRESH_MS,
  describeWeather,
  formatTemp,
  getWeather,
  hourLabel,
  isStale,
  updatedAgo,
  weatherAdvice,
} from '../weatherService'

const weather = (over: Partial<EventWeather> = {}): EventWeather => ({
  kind: 'forecast',
  date: '2026-11-28',
  place: 'Pachuca, Hidalgo',
  day: { code: 2, max: 21, min: 8, rain_chance: 10 },
  hours: [
    { time: '17:00', temp: 18, code: 2, rain_chance: 5, is_day: true },
    { time: '23:00', temp: 14, code: 0, rain_chance: 5, is_day: false },
  ],
  years: null,
  updated_at: '2026-11-20T10:00:00-06:00',
  forecast_from: '2026-11-13',
  ...over,
})

describe('weatherService', () => {
  beforeEach(() => get.mockReset())

  it('pide el clima del evento por su slug (codificado)', async () => {
    get.mockResolvedValue({ data: { weather: null } })
    await expect(getWeather('../x')).resolves.toBeNull()
    expect(get).toHaveBeenCalledWith('/public/events/..%2Fx/weather')
  })

  it('traduce el código del clima, con ícono de noche cuando ya oscureció', () => {
    expect(describeWeather(0)).toEqual({ label: 'Despejado', icon: 'sun' })
    expect(describeWeather(0, false)).toEqual({ label: 'Despejado', icon: 'moon' })
    expect(describeWeather(2, false)).toEqual({ label: 'Parcialmente nublado', icon: 'cloud-moon' })
    expect(describeWeather(3).icon).toBe('cloud')
    expect(describeWeather(45).label).toBe('Neblina')
    expect(describeWeather(63).icon).toBe('cloud-rain')
    expect(describeWeather(81).label).toBe('Chubascos')
    expect(describeWeather(95).icon).toBe('cloud-bolt')
    expect(describeWeather(null, false)).toEqual({ label: '', icon: 'moon' })
  })

  it('redondea temperaturas y escribe la hora como en la invitación', () => {
    expect(formatTemp(20.6)).toBe('21°')
    expect(formatTemp(-0.4)).toBe('0°')
    expect(hourLabel('17:00')).toBe('5 pm')
    expect(hourLabel('00:00')).toBe('12 am')
    expect(hourLabel('12:00')).toBe('12 pm')
  })

  it('dice hace cuánto se actualizó', () => {
    const at = new Date('2026-11-20T10:00:00-06:00').getTime()
    expect(updatedAgo('2026-11-20T10:00:00-06:00', at + 20_000)).toBe('hace un momento')
    expect(updatedAgo('2026-11-20T10:00:00-06:00', at + 12 * 60_000)).toBe('hace 12 min')
    expect(updatedAgo('2026-11-20T10:00:00-06:00', at + 125 * 60_000)).toBe('hace 2 h')
  })

  it('solo el pronóstico se vuelve a pedir, cada 15 minutos', () => {
    expect(isStale(weather(), 0, REFRESH_MS - 1)).toBe(false)
    expect(isStale(weather(), 0, REFRESH_MS)).toBe(true)
    expect(isStale(weather({ kind: 'typical' }), 0, REFRESH_MS * 10)).toBe(false)
    expect(isStale(null, 0, REFRESH_MS)).toBe(false)
  })

  it('aconseja paraguas o abrigo según lo esperado', () => {
    expect(weatherAdvice(weather())).toEqual([])
    expect(weatherAdvice(weather({ day: { code: 61, max: 20, min: 9, rain_chance: 60 } }))).toEqual(
      ['Puede llover: lleva paraguas.'],
    )
    const cold = weather({
      hours: [{ time: '23:00', temp: 10.6, code: 0, rain_chance: 0, is_day: false }],
    })
    expect(weatherAdvice(cold)).toEqual(['Por la noche refresca: lleva un abrigo.'])
    expect(
      weatherAdvice(
        weather({ kind: 'typical', day: { code: 3, max: 32, min: 20, rain_chance: 35 } }),
      ),
    ).toEqual([
      'En esta fecha suele llover: considera un paraguas.',
      'Hará calor: mantente hidratado.',
    ])
  })
})
