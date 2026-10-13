/** Clima del día del evento (GET /api/public/events/{slug}/weather). */

export interface WeatherHour {
  /** "17:00", hora del evento. */
  time: string
  temp: number
  /** Código WMO; null en el clima típico (solo hay temperatura). */
  code: number | null
  rain_chance: number | null
  is_day: boolean
}

export interface EventWeather {
  /** forecast = pronóstico real (16 días antes); typical = promedio de años anteriores. */
  kind: 'forecast' | 'typical'
  /** AAAA-MM-DD */
  date: string
  place: string
  day: { code: number | null; max: number; min: number; rain_chance: number | null }
  hours: WeatherHour[]
  /** Años del promedio en el clima típico ([2016, 2025]). */
  years: [number, number] | null
  /** Cuándo se pidió a Open-Meteo (ISO con offset). */
  updated_at: string
  /** Primer día con pronóstico real (AAAA-MM-DD). */
  forecast_from: string
}
