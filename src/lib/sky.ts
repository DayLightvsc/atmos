import { describeWeather, visualMood } from './weatherCodes'
import { paletteFor, type Palette, type SkyMood } from './palettes'
import { moonInfo, sunPosition, type MoonInfo, type SkyPosition } from './solar'
import { dateOf, stampToMs, todayKey } from './time'
import type { DayPoint, Forecast, LocalStamp, Phase } from './types'

export interface DaylightInfo {
  sunrise: LocalStamp | null
  sunset: LocalStamp | null
  nextSunrise: LocalStamp | null
  progress: number | null // 0 at sunrise, 1 at sunset
  remainingSeconds: number | null
  polar: 'day' | 'night' | null
  lengthSeconds: number | null
}

export interface SkyContext {
  phase: Phase
  mood: SkyMood
  palette: Palette
  sun: SkyPosition
  moon: MoonInfo
  daylight: DaylightInfo
  glow: { x: number; y: number; strength: number }
  stars: number
}

function todayFrom(days: DayPoint[], offsetSeconds: number, date: Date): DayPoint | null {
  const key = todayKey(offsetSeconds, date)
  return days.find((d) => d.date === key) ?? days[0] ?? null
}

function daylightFor(day: DayPoint | null, days: DayPoint[], now: Date, offsetSeconds: number): DaylightInfo {
  if (!day) {
    return {
      sunrise: null,
      sunset: null,
      nextSunrise: null,
      progress: null,
      remainingSeconds: null,
      polar: null,
      lengthSeconds: null,
    }
  }
  const nowMs = now.getTime() + offsetSeconds * 1000
  const upcomingSunrise =
    [day.sunrise, ...days.map((d) => d.sunrise)].find((stamp) => stamp != null && stampToMs(stamp) > nowMs) ?? null
  const lengthSeconds = day.daylightSeconds
  if (day.sunrise && day.sunset) {
    const sunriseMs = stampToMs(day.sunrise)
    const sunsetMs = stampToMs(day.sunset)
    const progress = sunsetMs > sunriseMs ? Math.min(1, Math.max(0, (nowMs - sunriseMs) / (sunsetMs - sunriseMs))) : null
    return {
      sunrise: day.sunrise,
      sunset: day.sunset,
      nextSunrise: upcomingSunrise,
      progress: nowMs >= sunriseMs && nowMs <= sunsetMs ? progress : null,
      remainingSeconds: Math.max(0, Math.round((sunsetMs - nowMs) / 1000)),
      polar: null,
      lengthSeconds,
    }
  }
  const polar = lengthSeconds != null && lengthSeconds >= 86100 ? 'day' : lengthSeconds != null && lengthSeconds <= 180 ? 'night' : null
  return {
    sunrise: null,
    sunset: null,
    nextSunrise: upcomingSunrise,
    progress: null,
    remainingSeconds: null,
    polar,
    lengthSeconds,
  }
}

function resolvePhase(date: Date, lat: number, lon: number): { phase: Phase; sun: SkyPosition } {
  const sun = sunPosition(date, lat, lon)
  if (sun.elevation > 5) return { phase: 'day', sun }
  if (sun.elevation < -6) return { phase: 'night', sun }
  const soon = sunPosition(new Date(date.getTime() + 12 * 60000), lat, lon)
  return { phase: soon.elevation > sun.elevation ? 'dawn' : 'dusk', sun }
}

export function deriveSky(forecast: Forecast | null, place: { latitude: number; longitude: number }, date: Date): SkyContext {
  const lat = forecast?.place.latitude ?? place.latitude
  const lon = forecast?.place.longitude ?? place.longitude
  const offset = forecast?.place.utcOffsetSeconds ?? 0
  const { phase, sun } = resolvePhase(date, lat, lon)
  const moon = moonInfo(date, lat, lon)
  const day = forecast ? todayFrom(forecast.days, offset, date) : null
  const daylight = daylightFor(day, forecast?.days ?? [], date, offset)
  const code = forecast?.now.code ?? 0
  const cloudCover = forecast?.now.cloudCover ?? 0
  const mood = visualMood(describeWeather(code).group, cloudCover) as SkyMood
  const palette = paletteFor(phase, mood)

  const sunVisible = sun.elevation > -3
  const moonVisible = !sunVisible && moon.position.elevation > 1 && moon.illumination > 0.04
  let glow = { x: 50, y: 18, strength: 0 }
  if (sunVisible) {
    glow = {
      x: 50 - Math.sin((sun.azimuth * Math.PI) / 180) * 44,
      y: 100 - (Math.max(0, Math.min(74, sun.elevation)) / 74) * 80,
      strength: 1,
    }
  } else if (moonVisible) {
    glow = {
      x: 50 - Math.sin((moon.position.azimuth * Math.PI) / 180) * 42,
      y: 100 - (Math.max(0, Math.min(60, moon.position.elevation)) / 60) * 72,
      strength: 0.35 + moon.illumination * 0.65,
    }
  }

  const nightness = Math.max(0, Math.min(1, (-sun.elevation + 3) / 12))
  const clarity = Math.pow(Math.max(0, 1 - cloudCover / 100), 1.35)
  const stars = phase === 'day' ? 0 : Math.min(1, nightness * clarity)

  return { phase, mood, palette, sun, moon, daylight, glow, stars }
}

export function todayKeyFor(forecast: Forecast, date: Date): string {
  return todayKey(forecast.place.utcOffsetSeconds, date)
}

export function currentDay(forecast: Forecast, date: Date): DayPoint | null {
  const key = todayKeyFor(forecast, date)
  return forecast.days.find((d) => d.date === key) ?? forecast.days[0] ?? null
}

/** Days shown in the outlook: today plus six more. */
export function outlookDays(forecast: Forecast, date: Date): DayPoint[] {
  const key = todayKeyFor(forecast, date)
  const index = forecast.days.findIndex((d) => d.date === key)
  if (index < 0) return forecast.days.slice(0, 7)
  return forecast.days.slice(index, index + 7)
}

export function hourForNow(forecast: Forecast, date: Date): number {
  const nowStamp = new Date(date.getTime() + forecast.place.utcOffsetSeconds * 1000).toISOString().slice(0, 13)
  const index = forecast.hours.findIndex((h) => h.time.slice(0, 13) === nowStamp)
  return index < 0 ? 0 : index
}

export function hourlyFromNow(forecast: Forecast, date: Date): { hours: typeof forecast.hours; nowIndex: number } {
  const key = new Date(date.getTime() + forecast.place.utcOffsetSeconds * 1000).toISOString().slice(0, 13)
  const found = forecast.hours.findIndex((h) => h.time.slice(0, 13) === key)
  const start = found < 0 ? 0 : found
  return { hours: forecast.hours.slice(start, start + 24), nowIndex: 0 }
}

export function sameDate(stamp: LocalStamp, day: DayPoint): boolean {
  return dateOf(stamp) === day.date
}
