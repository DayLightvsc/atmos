/** Shared domain types. Nothing here mirrors the raw Open-Meteo payload:
 *  the API layer normalises everything into these shapes first. */

export type Units = 'metric' | 'imperial'

export type Language = 'ru' | 'en'

export type Phase = 'night' | 'dawn' | 'day' | 'dusk'

export type WeatherGroup = 'clear' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export type LocalStamp = string // 'YYYY-MM-DDTHH:mm' in the place's own wall clock

export interface Place {
  id: string
  name: string
  country: string
  countryCode?: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
  population?: number
  elevation?: number
}

export interface WeatherNow {
  time: LocalStamp
  temperature: number
  apparent: number
  code: number
  isDay: boolean
  humidity: number
  cloudCover: number
  precipitation: number
  pressure: number
  windSpeed: number
  windDirection: number
  windGust: number
  visibility: number | null
  uv: number | null
}

export interface HourPoint {
  time: LocalStamp
  temperature: number
  apparent: number
  code: number
  isDay: boolean
  humidity: number
  cloudCover: number
  precipProbability: number
  precipitation: number
  windSpeed: number
  windDirection: number
  windGust: number
  visibility: number | null
  uv: number | null
  pressure: number | null
}

export interface DayPoint {
  date: string // YYYY-MM-DD
  code: number
  max: number
  min: number
  apparentMax: number | null
  apparentMin: number | null
  sunrise: LocalStamp | null
  sunset: LocalStamp | null
  daylightSeconds: number | null
  uvMax: number | null
  precipSum: number | null
  precipProbabilityMax: number | null
  windMax: number | null
  gustMax: number | null
  windDirection: number | null
}

export interface Forecast {
  place: {
    latitude: number
    longitude: number
    elevation: number | null
    timezone: string | null
    timezoneAbbr: string | null
    utcOffsetSeconds: number
  }
  now: WeatherNow
  hours: HourPoint[]
  days: DayPoint[]
  fetchedAt: number
}

export type SolarPhase = 'night' | 'dawn' | 'day' | 'dusk'

export interface SkyTheme {
  phase: Phase
  paletteId: string
  mode: 'light' | 'dark'
}

export interface ToastMessage {
  id: number
  tone: 'info' | 'warn'
  title: string
  detail?: string
}
