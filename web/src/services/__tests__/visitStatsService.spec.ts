import { describe, expect, it } from 'vitest'
import {
  axisTicks,
  chartBars,
  formatCount,
  niceMax,
  share,
  trackedLink,
} from '../visitStatsService'

const days = (n: number, start = Date.UTC(2026, 9, 1)) =>
  Array.from({ length: n }, (_, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    visits: i + 1,
    visitors: 1,
  }))

describe('visitStatsService', () => {
  it('una barra por día, con su fecha larga y corta', () => {
    const bars = chartBars(days(30))
    expect(bars).toHaveLength(30)
    expect(bars[16]).toEqual({
      key: '2026-10-17',
      label: '17 de octubre',
      short: '17 oct',
      visits: 17,
      visitors: 1,
    })
  })

  it('en un año, una barra por semana', () => {
    const bars = chartBars(days(365, Date.UTC(2025, 9, 18)))
    expect(bars).toHaveLength(53)
    expect(bars[0]).toMatchObject({ label: 'semana del 18 de octubre', visits: 28, visitors: 1 })
    expect(bars[52]!.visits).toBe(365) // la última semana es de un solo día
  })

  it('el tope del eje es un número redondo', () => {
    expect([0, 3, 5, 6, 11, 38, 120, 999].map(niceMax)).toEqual([5, 5, 5, 10, 20, 50, 200, 1000])
  })

  it('las fechas del eje no se enciman', () => {
    expect(axisTicks(1)).toEqual([0])
    expect(axisTicks(7)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(axisTicks(30)).toEqual([0, 5, 10, 15, 20, 25, 29])
    expect(axisTicks(31)).toEqual([0, 5, 10, 15, 20, 25, 30])
    expect(axisTicks(90)).toEqual([0, 15, 30, 45, 60, 75, 89])
    expect(axisTicks(53)).toEqual([0, 9, 18, 27, 36, 45, 52])
    expect(axisTicks(9)).toEqual([0, 2, 4, 6, 8])
  })

  it('porcentajes y números', () => {
    expect(share(1, 3)).toBe(33)
    expect(share(5, 0)).toBe(0)
    expect(formatCount(12345)).toBe('12,345')
  })

  it('arma enlaces con etiqueta para saber de dónde llega cada visita', () => {
    expect(trackedLink('https://invitaciones-jiro.fly.dev', 'instagram')).toBe(
      'https://invitaciones-jiro.fly.dev/?utm_source=instagram',
    )
    expect(trackedLink('https://jirosolutions.com/', 'qr', ' Expo Bodas Otoño 2026 ')).toBe(
      'https://jirosolutions.com/?utm_source=qr&utm_campaign=expo-bodas-otono-2026',
    )
  })
})
