/** Calendario del mes del evento, calculado en la zona del evento (nunca en la del visitante). */

const WEEKDAYS_ES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export interface MonthGrid {
  year: number
  /** 1 a 12 */
  month: number
  /** Día del evento dentro del mes. */
  day: number
  /** Iniciales en el orden de las columnas. */
  weekdays: string[]
  /** Semanas de 7 casillas; null = casilla vacía antes del día 1 o después del último. */
  weeks: (number | null)[][]
}

/** Año, mes y día de un instante en una zona horaria. */
export function localDate(
  iso: string,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }
}

/**
 * Rejilla del mes del evento. weekStartsOn: 0 = domingo (como el diseño: D L M M J V S),
 * 1 = lunes.
 */
export function monthGrid(iso: string, timeZone: string, weekStartsOn: 0 | 1 = 0): MonthGrid {
  const { year, month, day } = localDate(iso, timeZone)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lead = (firstWeekday - weekStartsOn + 7) % 7

  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return {
    year,
    month,
    day,
    weekdays: [...WEEKDAYS_ES.slice(weekStartsOn), ...WEEKDAYS_ES.slice(0, weekStartsOn)],
    weeks,
  }
}

export interface WeekDay {
  /** Inicial del día de la semana (D, L, M…). */
  weekday: string
  day: number
  /** El día del evento. */
  event: boolean
  /** Del mes anterior o del siguiente (la semana cruza de mes). */
  outside: boolean
}

/**
 * La semana del evento, de domingo a sábado (o de lunes a domingo), con sus fechas de
 * verdad aunque cruce de mes: la tira de días que pinta el boleto de Nueva York.
 */
export function eventWeek(iso: string, timeZone: string, weekStartsOn: 0 | 1 = 0): WeekDay[] {
  const { year, month, day } = localDate(iso, timeZone)
  const event = Date.UTC(year, month - 1, day)
  const offset = (new Date(event).getUTCDay() - weekStartsOn + 7) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(event + (i - offset) * 86_400_000)
    return {
      weekday: WEEKDAYS_ES[date.getUTCDay()]!,
      day: date.getUTCDate(),
      event: i === offset,
      outside: date.getUTCMonth() !== month - 1,
    }
  })
}

/** Enlace "Agregar a Google Calendar" con el evento ya escrito. */
export function googleCalendarUrl(event: {
  title: string
  startsAt: string
  hours?: number
  location?: string
  details?: string
}): string {
  const start = new Date(event.startsAt)
  const end = new Date(start.getTime() + (event.hours ?? 6) * 3_600_000)
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
  })
  if (event.location) params.set('location', event.location)
  if (event.details) params.set('details', event.details)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
