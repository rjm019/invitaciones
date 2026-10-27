/**
 * Itinerario en vivo: dado el instante actual, dice qué momento es "Ahora" y cuál "Sigue".
 * Lógica pura (sin Vue ni DOM). Todo se calcula en la zona del evento, nunca en la del
 * visitante. Una hora menor que la anterior se toma como del día siguiente (fiestas que
 * cruzan la medianoche).
 */
import { localDate } from './calendarService'
import { hourMinute } from './dateFormatService'

export interface LiveMoment {
  /** "17:00" */
  time: string
  label: string
}

export type LiveStatus =
  /** No es el día del evento: no se resalta nada. */
  | 'off'
  /** El día del evento, antes del primer momento. */
  | 'before'
  /** Hay un momento en curso. */
  | 'live'
  /** Ya pasó el último momento. */
  | 'after'

export interface LiveState {
  status: LiveStatus
  /** Índice del momento en curso (solo con status "live"). */
  current: number | null
  /** Índice del momento que sigue, si hay. */
  next: number | null
  /** true en cada momento ya pasado (para atenuarlo). */
  past: boolean[]
}

/** Minutos que dura el último momento antes de darse por terminado. */
export const LAST_MOMENT_MINUTES = 120

const DAY = 1440

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  return h < 24 && m < 60 ? h * 60 + m : null
}

/** Minutos desde la medianoche del día del evento; sube un día cada vez que la hora retrocede. */
export function momentMinutes(moments: LiveMoment[]): (number | null)[] {
  let dayOffset = 0
  let previous = -1
  return moments.map((moment) => {
    const minutes = toMinutes(moment.time)
    if (minutes === null) return null
    if (minutes < previous) dayOffset += 1
    previous = minutes
    return dayOffset * DAY + minutes
  })
}

function off(count: number): LiveState {
  return { status: 'off', current: null, next: null, past: Array<boolean>(count).fill(false) }
}

export function liveItinerary(
  moments: LiveMoment[],
  startsAt: string,
  timeZone: string,
  now: Date | number = Date.now(),
): LiveState {
  const times = momentMinutes(moments)
  const valid = times.filter((t): t is number => t !== null)
  if (!startsAt || valid.length === 0) return off(moments.length)

  const instant = new Date(now).toISOString()
  const eventDay = localDate(startsAt, timeZone)
  const today = localDate(instant, timeZone)
  const dayDiff = Math.round(
    (Date.UTC(today.year, today.month - 1, today.day) -
      Date.UTC(eventDay.year, eventDay.month - 1, eventDay.day)) /
      86_400_000,
  )
  const [h, m] = hourMinute(instant, timeZone).split(':').map(Number)
  const nowMinutes = dayDiff * DAY + (h ?? 0) * 60 + (m ?? 0)

  const first = Math.min(...valid)
  const last = Math.max(...valid)
  const windowEnd = Math.max(DAY, last + LAST_MOMENT_MINUTES)
  if (nowMinutes < 0 || nowMinutes >= windowEnd) return off(moments.length)

  if (nowMinutes < first) {
    const next = times.findIndex((t) => t === first)
    return { status: 'before', current: null, next, past: Array<boolean>(moments.length).fill(false) }
  }
  if (nowMinutes >= last + LAST_MOMENT_MINUTES) {
    return { status: 'after', current: null, next: null, past: Array<boolean>(moments.length).fill(true) }
  }

  // El momento en curso: el último que ya empezó.
  let current = -1
  times.forEach((t, i) => {
    if (t !== null && t <= nowMinutes && (current === -1 || t >= (times[current] ?? -1))) current = i
  })
  const currentMinutes = times[current] as number
  const next = times.findIndex((t) => t !== null && t > currentMinutes)
  return {
    status: 'live',
    current,
    next: next === -1 ? null : next,
    past: times.map((t) => t !== null && t < currentMinutes),
  }
}
