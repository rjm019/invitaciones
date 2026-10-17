import type { VisitKind, VisitScope, VisitStats } from '@/types/design'

/**
 * Estadísticas del sitio en el gestor: periodos, la gráfica de visitas por día (o por
 * semana, en un año), porcentajes y los enlaces con etiqueta para saber de dónde llega cada
 * visita. Lógica pura (sin Vue ni DOM).
 */

export const VISIT_RANGES = [
  { days: 1, label: 'Hoy' },
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 365, label: 'Un año' },
] as const

export const VISIT_SCOPES: { value: VisitScope; label: string; hint: string }[] = [
  { value: 'sitio', label: 'Página principal', hint: 'La landing: inicio, bodas, XV, graduación…' },
  { value: 'invitaciones', label: 'Invitaciones', hint: 'Las invitaciones y las muestras' },
  { value: 'todo', label: 'Todo', hint: 'Todo el sitio' },
]

export const VISIT_KINDS: Record<VisitKind, string> = {
  landing: 'Página principal',
  invitacion: 'Invitación general',
  personal: 'Invitación personal',
  muestra: 'Muestra',
}

/** Canales para los enlaces con etiqueta (utm_source). */
export const LINK_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'qr', label: 'Código QR (volantes, tarjetas)' },
  { value: 'correo', label: 'Correo' },
] as const

export interface ChartBar {
  key: string
  /** Para el tooltip y la tabla: "17 de octubre" o "semana del 5 de octubre". */
  label: string
  /** Para el eje: "17 oct". */
  short: string
  visits: number
  visitors: number
}

const dayLong = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const dayShort = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const numbers = new Intl.NumberFormat('es-MX')

const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`)

/** "17 oct" (sin el punto que algunos navegadores ponen a la abreviatura). */
function short(ymd: string): string {
  return dayShort.format(utc(ymd)).replace('.', '')
}

/**
 * Una barra por día; con más de 92 días, una por semana (365 barras no se alcanzan a ver).
 * En cada semana, "personas" es la del día con más: las de días distintos pueden repetirse.
 */
export function chartBars(days: VisitStats['days']): ChartBar[] {
  if (days.length <= 92) {
    return days.map((d) => ({
      key: d.date,
      label: dayLong.format(utc(d.date)),
      short: short(d.date),
      visits: d.visits,
      visitors: d.visitors,
    }))
  }
  const bars: ChartBar[] = []
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7)
    const first = week[0]!
    bars.push({
      key: first.date,
      label: `semana del ${dayLong.format(utc(first.date))}`,
      short: short(first.date),
      visits: week.reduce((sum, d) => sum + d.visits, 0),
      visitors: Math.max(...week.map((d) => d.visitors)),
    })
  }
  return bars
}

/** El tope del eje: 1, 2, 5, 10, 20, 50… (nunca menos de 5, para que 1 visita no llene la gráfica). */
export function niceMax(value: number): number {
  const target = Math.max(5, value)
  const power = 10 ** Math.floor(Math.log10(target))
  const step = [1, 2, 5, 10].find((m) => m * power >= target) ?? 10
  return step * power
}

/** Qué barras llevan su fecha en el eje: la primera, la última y unas cuantas en medio. */
export function axisTicks(count: number, max = 7): number[] {
  if (count <= max) return [...Array(count).keys()]
  const every = Math.ceil((count - 1) / (max - 1))
  const ticks: number[] = []
  for (let i = 0; i < count - 1; i += every) ticks.push(i)
  // Que la última no choque con la anterior.
  if (count - 1 - ticks[ticks.length - 1]! < every / 2) ticks.pop()
  ticks.push(count - 1)
  return ticks
}

/** Porcentaje entero (0 si no hay total). */
export function share(part: number, total: number): number {
  return total > 0 ? Math.round((part * 100) / total) : 0
}

export function formatCount(value: number): string {
  return numbers.format(value)
}

/** La dirección del sitio con su etiqueta: https://…/?utm_source=instagram&utm_campaign=… */
export function trackedLink(site: string, source: string, campaign = ''): string {
  const url = new URL(site)
  url.pathname = url.pathname || '/'
  url.searchParams.set('utm_source', source)
  const name = campaign
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (name) url.searchParams.set('utm_campaign', name)
  return url.toString()
}
