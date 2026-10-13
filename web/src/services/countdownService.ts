export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  isOver: boolean
}

const ZERO: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }

/**
 * Tiempo que falta para el evento. startsAt viene siempre con offset
 * (2026-11-28T17:00:00-06:00), así que no depende de la zona del celular del invitado.
 */
export function timeLeft(startsAt: string | null, now: Date = new Date()): TimeLeft {
  const target = startsAt ? Date.parse(startsAt) : NaN
  if (Number.isNaN(target)) return ZERO

  const ms = target - now.getTime()
  if (ms <= 0) return ZERO

  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isOver: false,
  }
}

export const pad2 = (n: number): string => String(n).padStart(2, '0')
