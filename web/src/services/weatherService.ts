import type { EventWeather } from '@/types/weather'
import { http } from './http'

/** Clima del día del evento; null si no hay nada que mostrar. */
export async function getWeather(slug: string): Promise<EventWeather | null> {
  const { data } = await http.get<{ weather: EventWeather | null }>(
    `/public/events/${encodeURIComponent(slug)}/weather`,
  )
  return data.weather
}

/** Cada cuánto se vuelve a pedir el pronóstico mientras la invitación está abierta. */
export const REFRESH_MS = 15 * 60 * 1000

/** El pronóstico se renueva; el clima típico no cambia en semanas. */
export function isStale(weather: EventWeather | null, fetchedAt: number, now: number): boolean {
  return weather?.kind === 'forecast' && now - fetchedAt >= REFRESH_MS
}

export interface WeatherLook {
  label: string
  /** Nombre del ícono en AppIcon. */
  icon: string
}

/** Código WMO (lo que usa Open-Meteo) → texto en español e ícono, de día o de noche. */
export function describeWeather(code: number | null, isDay = true): WeatherLook {
  const clear = isDay ? 'sun' : 'moon'
  const partly = isDay ? 'cloud-sun' : 'cloud-moon'
  if (code === null) return { label: '', icon: clear }
  if (code === 0) return { label: 'Despejado', icon: clear }
  if (code === 1) return { label: 'Mayormente despejado', icon: partly }
  if (code === 2) return { label: 'Parcialmente nublado', icon: partly }
  if (code === 3) return { label: 'Nublado', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Neblina', icon: 'smog' }
  if (code >= 51 && code <= 57) return { label: 'Llovizna', icon: 'cloud-rain' }
  if (code === 61 || code === 63) return { label: 'Lluvia', icon: 'cloud-rain' }
  if (code >= 65 && code <= 67) return { label: 'Lluvia fuerte', icon: 'cloud-showers-heavy' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { label: 'Nieve', icon: 'snowflake' }
  if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'cloud-showers-heavy' }
  if (code >= 95) return { label: 'Tormenta', icon: 'cloud-bolt' }
  return { label: '', icon: 'cloud' }
}

/** 20.6 → "21°" */
export function formatTemp(value: number): string {
  return `${Math.round(value) || 0}°`
}

/** "17:00" → "5 pm"; "00:00" → "12 am". */
export function hourLabel(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2))
  if (Number.isNaN(h)) return hhmm
  return `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'pm' : 'am'}`
}

/** "hace un momento", "hace 12 min", "hace 2 h". */
export function updatedAgo(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  return `hace ${Math.floor(minutes / 60)} h`
}

/** Consejos cortos para los invitados según lo que se espera. */
export function weatherAdvice(weather: EventWeather): string[] {
  const advice: string[] = []
  const evening = weather.hours.length
    ? Math.min(...weather.hours.map((h) => h.temp))
    : weather.day.min
  const rain = weather.day.rain_chance ?? 0

  if (weather.kind === 'forecast' && rain >= 40) advice.push('Puede llover: lleva paraguas.')
  if (weather.kind === 'typical' && rain >= 30)
    advice.push('En esta fecha suele llover: considera un paraguas.')
  if (evening <= 12) advice.push('Por la noche refresca: lleva un abrigo.')
  else if (weather.day.max >= 30) advice.push('Hará calor: mantente hidratado.')
  return advice
}
