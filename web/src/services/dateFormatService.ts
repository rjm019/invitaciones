/** Fechas y horas en español de México, siempre en la zona del evento. */

const LOCALE = 'es-MX'

function parts(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const formatter = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options })
  return Object.fromEntries(formatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
}

/** "2026-11-28T17:00:00-06:00" → { day: '28', month: 'noviembre', year: '2026', weekday: 'sábado' } */
export function dateParts(iso: string, timeZone: string) {
  const p = parts(iso, timeZone, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
  return { day: p.day ?? '', month: p.month ?? '', year: p.year ?? '', weekday: p.weekday ?? '' }
}

/** "2026-11-06" → "6 de noviembre". Es una fecha de calendario: no se mueve con la zona. */
export function dayMonth(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

/** "2026-11-06" → "6 de noviembre de 2026". */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** "17:00" → "5:00 pm" (como lo escribe el diseño original). */
export function time12h(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return hhmm
  const h = Number(match[1])
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${h % 12 === 0 ? 12 : h % 12}:${match[2]} ${suffix}`
}

/** "2026-10-13T12:00:00-06:00" → "13 oct, 12:00 p.m." en la zona del evento. */
export function shortDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
}
